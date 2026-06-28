#include "wasapi_engine.h"
#include <iostream>
#include <cstdio>
#define _USE_MATH_DEFINES
#include <stdexcept>
constexpr double kPI = 3.14159265358979323846;
#include <chrono>
#include <cmath>
#include <functional>
#include <windows.h>
extern "C" {
  #include "kiss_fftr.h"
}

struct WasapiEngine::Kiss { kiss_fftr_cfg cfg = nullptr; std::vector<float> in; std::vector<kiss_fft_cpx> out; };

// Format an HRESULT as "0xXXXXXXXX (AUDCLNT_E_NAME)" so failures are readable
// in logs and distinguishable (e.g. DEVICE_IN_USE = exclusive-mode/busy, an
// environment condition, vs DEVICE_INVALIDATED/UNSUPPORTED_FORMAT = real trouble).
static std::string hrToString(HRESULT hr){
  char buf[16];
  std::snprintf(buf, sizeof(buf), "0x%08X", (unsigned int)hr);
  std::string s(buf);
  const char* name = nullptr;
  switch(hr){
    case AUDCLNT_E_NOT_INITIALIZED:            name = "AUDCLNT_E_NOT_INITIALIZED"; break;
    case AUDCLNT_E_ALREADY_INITIALIZED:        name = "AUDCLNT_E_ALREADY_INITIALIZED"; break;
    case AUDCLNT_E_WRONG_ENDPOINT_TYPE:        name = "AUDCLNT_E_WRONG_ENDPOINT_TYPE"; break;
    case AUDCLNT_E_DEVICE_INVALIDATED:         name = "AUDCLNT_E_DEVICE_INVALIDATED"; break;
    case AUDCLNT_E_NOT_STOPPED:                name = "AUDCLNT_E_NOT_STOPPED"; break;
    case AUDCLNT_E_BUFFER_TOO_LARGE:           name = "AUDCLNT_E_BUFFER_TOO_LARGE"; break;
    case AUDCLNT_E_OUT_OF_ORDER:               name = "AUDCLNT_E_OUT_OF_ORDER"; break;
    case AUDCLNT_E_UNSUPPORTED_FORMAT:         name = "AUDCLNT_E_UNSUPPORTED_FORMAT"; break;
    case AUDCLNT_E_INVALID_SIZE:               name = "AUDCLNT_E_INVALID_SIZE"; break;
    case AUDCLNT_E_DEVICE_IN_USE:              name = "AUDCLNT_E_DEVICE_IN_USE"; break;
    case AUDCLNT_E_BUFFER_OPERATION_PENDING:   name = "AUDCLNT_E_BUFFER_OPERATION_PENDING"; break;
    case AUDCLNT_E_THREAD_NOT_REGISTERED:      name = "AUDCLNT_E_THREAD_NOT_REGISTERED"; break;
    case AUDCLNT_E_EXCLUSIVE_MODE_NOT_ALLOWED: name = "AUDCLNT_E_EXCLUSIVE_MODE_NOT_ALLOWED"; break;
    case AUDCLNT_E_ENDPOINT_CREATE_FAILED:     name = "AUDCLNT_E_ENDPOINT_CREATE_FAILED"; break;
    case AUDCLNT_E_SERVICE_NOT_RUNNING:        name = "AUDCLNT_E_SERVICE_NOT_RUNNING"; break;
    case AUDCLNT_E_EVENTHANDLE_NOT_EXPECTED:   name = "AUDCLNT_E_EVENTHANDLE_NOT_EXPECTED"; break;
    case AUDCLNT_E_EXCLUSIVE_MODE_ONLY:        name = "AUDCLNT_E_EXCLUSIVE_MODE_ONLY"; break;
    case AUDCLNT_E_EVENTHANDLE_NOT_SET:        name = "AUDCLNT_E_EVENTHANDLE_NOT_SET"; break;
    case AUDCLNT_E_BUFFER_SIZE_NOT_ALIGNED:    name = "AUDCLNT_E_BUFFER_SIZE_NOT_ALIGNED"; break;
    default: break;
  }
  if(name){ s += " ("; s += name; s += ")"; }
  return s;
}

// Carries the numeric HRESULT so initCapture() can report it to JS, not just log it.
struct HrError : std::runtime_error {
  HRESULT hr;
  HrError(HRESULT h, const std::string& msg) : std::runtime_error(msg), hr(h) {}
};

static void check(HRESULT hr, const char* where){ if(FAILED(hr)) throw HrError(hr, std::string(where)+" hr="+hrToString(hr)); }

static SampleFormat pickFormat(bool isFloat, int bits){
  if(isFloat) return bits == 32 ? SampleFormat::F32 : SampleFormat::Unsupported;
  switch(bits){
    case 16: return SampleFormat::I16;
    case 24: return SampleFormat::I24;
    case 32: return SampleFormat::I32; // includes 24-valid-in-32 (left-justified)
    default: return SampleFormat::Unsupported;
  }
}

// Map the WASAPI mix format to how we read its samples.
static SampleFormat detectFormat(const WAVEFORMATEX* wfx){
  const int bits = wfx->wBitsPerSample;
  if(wfx->wFormatTag == WAVE_FORMAT_EXTENSIBLE){
    const auto* fext = reinterpret_cast<const WAVEFORMATEXTENSIBLE*>(wfx);
    if(IsEqualGUID(fext->SubFormat, KSDATAFORMAT_SUBTYPE_IEEE_FLOAT)) return pickFormat(true, bits);
    if(IsEqualGUID(fext->SubFormat, KSDATAFORMAT_SUBTYPE_PCM))        return pickFormat(false, bits);
    return SampleFormat::Unsupported;
  }
  if(wfx->wFormatTag == WAVE_FORMAT_IEEE_FLOAT) return pickFormat(true, bits);
  if(wfx->wFormatTag == WAVE_FORMAT_PCM)        return pickFormat(false, bits);
  return SampleFormat::Unsupported;
}

static std::string describeFormat(const WAVEFORMATEX* wfx){
  return "tag=" + std::to_string(wfx->wFormatTag) +
         " bits=" + std::to_string(wfx->wBitsPerSample) +
         " ch=" + std::to_string(wfx->nChannels);
}

// Watches the system default render endpoint. Registered with the device
// enumerator; OnDefaultDeviceChanged fires on a COM thread, where we do nothing
// but poke the engine (which only signals an event — no heavy/re-entrant work).
struct DefaultDeviceWatcher : public IMMNotificationClient {
  WasapiEngine* engine_;
  explicit DefaultDeviceWatcher(WasapiEngine* e) : engine_(e) {}

  // Lifetime is owned by the engine (member-managed), so refcounting is a no-op.
  ULONG STDMETHODCALLTYPE AddRef() override { return 1; }
  ULONG STDMETHODCALLTYPE Release() override { return 1; }
  HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv) override {
    if(riid == __uuidof(IUnknown) || riid == __uuidof(IMMNotificationClient)){
      *ppv = static_cast<IMMNotificationClient*>(this);
      return S_OK;
    }
    *ppv = nullptr;
    return E_NOINTERFACE;
  }

  HRESULT STDMETHODCALLTYPE OnDefaultDeviceChanged(EDataFlow flow, ERole role, LPCWSTR) override {
    if(flow == eRender && role == eConsole) engine_->notifyDefaultChanged();
    return S_OK;
  }
  HRESULT STDMETHODCALLTYPE OnDeviceAdded(LPCWSTR) override { return S_OK; }
  HRESULT STDMETHODCALLTYPE OnDeviceRemoved(LPCWSTR) override { return S_OK; }
  HRESULT STDMETHODCALLTYPE OnDeviceStateChanged(LPCWSTR, DWORD) override { return S_OK; }
  HRESULT STDMETHODCALLTYPE OnPropertyValueChanged(LPCWSTR, const PROPERTYKEY) override { return S_OK; }
};

WasapiEngine::WasapiEngine(){
  CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  check(CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, IID_PPV_ARGS(&enumr_)), "MMDeviceEnumerator");
  stopEvent_ = CreateEvent(nullptr, TRUE, FALSE, nullptr);   // Manual reset
  switchEvent_ = CreateEvent(nullptr, FALSE, FALSE, nullptr); // Auto reset (coalesces change storms)
  watcher_ = new DefaultDeviceWatcher(this);
  enumr_->RegisterEndpointNotificationCallback(watcher_);
}

WasapiEngine::~WasapiEngine(){
  std::cout << "[WasapiEngine] Destructor called" << std::endl;
  enable(false);
  if(watcher_){
    enumr_->UnregisterEndpointNotificationCallback(watcher_);
    delete watcher_;
    watcher_ = nullptr;
  }
  if(stopEvent_) CloseHandle(stopEvent_);
  if(switchEvent_) CloseHandle(switchEvent_);
  CoUninitialize();
  std::cout << "[WasapiEngine] Destructor finished" << std::endl;
}

std::wstring WasapiEngine::stringToWstring(const std::string& str) {
  if(str.empty()) return std::wstring();
  int n = MultiByteToWideChar(CP_UTF8, 0, str.data(), (int)str.size(), nullptr, 0);
  std::wstring wstr(n, 0);
  MultiByteToWideChar(CP_UTF8, 0, str.data(), (int)str.size(), wstr.data(), n);
  return wstr;
}

std::string WasapiEngine::wstringToString(const std::wstring& wstr) {
  if(wstr.empty()) return std::string();
  int n = WideCharToMultiByte(CP_UTF8, 0, wstr.data(), (int)wstr.size(), nullptr, 0, nullptr, nullptr);
  std::string str(n, 0);
  WideCharToMultiByte(CP_UTF8, 0, wstr.data(), (int)wstr.size(), str.data(), n, nullptr, nullptr);
  return str;
}

std::vector<DeviceInfo> WasapiEngine::listDevices(){
  std::vector<DeviceInfo> r;
  for(int pass=0; pass<2; ++pass){
    EDataFlow flow = pass==0? eRender : eCapture;
    Microsoft::WRL::ComPtr<IMMDeviceCollection> coll;
    check(enumr_->EnumAudioEndpoints(flow, DEVICE_STATE_ACTIVE, &coll), "EnumAudioEndpoints");
    UINT n=0; coll->GetCount(&n);
    for(UINT i=0;i<n;++i){
      Microsoft::WRL::ComPtr<IMMDevice> d; coll->Item(i,&d);
      LPWSTR id=nullptr; d->GetId(&id);
      Microsoft::WRL::ComPtr<IPropertyStore> props; d->OpenPropertyStore(STGM_READ, &props);
      PROPVARIANT v; PropVariantInit(&v); props->GetValue(PKEY_Device_FriendlyName, &v);

      DeviceInfo di;
      di.id = wstringToString(std::wstring(id));
      di.name = wstringToString(std::wstring(v.pwszVal));
      di.flow = pass==0? DeviceInfo::Flow::Render : DeviceInfo::Flow::Capture;

      r.push_back(std::move(di));
      CoTaskMemFree(id);
      PropVariantClear(&v);
    }
  }
  return r;
}

bool WasapiEngine::setDevice(const std::string& deviceId){
  if(running_) stop();
  followDefault_ = false; // pinning an explicit device leaves follow mode
  device_.Reset();
  std::wstring wDeviceId = stringToWstring(deviceId);
  HRESULT hr = enumr_->GetDevice(wDeviceId.c_str(), &device_);
  if(FAILED(hr)) return false;
  deviceId_ = deviceId;
  Microsoft::WRL::ComPtr<IMMEndpoint> ep; dataflow_ = eRender;
  if(SUCCEEDED(device_->QueryInterface(IID_PPV_ARGS(&ep)))){
    ep->GetDataFlow(&dataflow_);
  }
  return true;
}

DeviceInfo WasapiEngine::currentDevice(){
  DeviceInfo di;
  if(!device_) return di;

  LPWSTR id=nullptr; device_->GetId(&id);
  di.id = wstringToString(std::wstring(id));
  CoTaskMemFree(id);

  Microsoft::WRL::ComPtr<IPropertyStore> props;
  device_->OpenPropertyStore(STGM_READ, &props);
  PROPVARIANT v; PropVariantInit(&v);
  props->GetValue(PKEY_Device_FriendlyName, &v);
  di.name = wstringToString(std::wstring(v.pwszVal));
  PropVariantClear(&v);

  Microsoft::WRL::ComPtr<IMMEndpoint> ep;
  di.flow = DeviceInfo::Flow::Render;
  if(SUCCEEDED(device_->QueryInterface(IID_PPV_ARGS(&ep)))){
    EDataFlow df;
    if(SUCCEEDED(ep->GetDataFlow(&df)))
      di.flow = (df==eRender? DeviceInfo::Flow::Render : DeviceInfo::Flow::Capture);
  }
  return di;
}

void WasapiEngine::setFftSize(int fft){ plan_.fftSize = fft; }
void WasapiEngine::setHopSize(int hop){ plan_.hopSize = hop; }
void WasapiEngine::setColumns(int c){
  plan_.columns = std::max(1, std::min(c, 256));
  if(sampleRate_>0) binmap_ = makeBinMap(sampleRate_, plan_.fftSize, plan_.columns);
}
void WasapiEngine::setDbFloor(float db){ plan_.dbFloor = db; }
void WasapiEngine::setMasterGain(float g){ masterGain_ = g; }
void WasapiEngine::setTilt(float exp){ tiltExp_ = exp; }
void WasapiEngine::setLoopback(bool on){ loopback_ = on; }
void WasapiEngine::setFollowDefault(bool on){
  followDefault_ = on;
  // If capturing, poke the worker to re-resolve under the new mode right away.
  if(on && running_ && switchEvent_) SetEvent(switchEvent_);
}
void WasapiEngine::notifyDefaultChanged(){
  // Called from a COM notification thread — keep it to an atomic read + SetEvent.
  if(followDefault_.load() && switchEvent_) SetEvent(switchEvent_);
}
void WasapiEngine::setCallback(FftCallback cb){ cb_ = std::move(cb); }
void WasapiEngine::setWaveCallback(WaveCallback cb) { waveCb_ = std::move(cb); }
void WasapiEngine::setVuCallback(VuCallback cb) { vuCb_ = std::move(cb); }
void WasapiEngine::setErrorCallback(ErrorCallback cb) { errCb_ = std::move(cb); }

void WasapiEngine::enable(bool on){
  std::cout << "[WasapiEngine] enable(" << (on ? "true" : "false") << ")" << std::endl;
  std::cout.flush();
  if(on){ start(); } else { stop(); }
}

bool WasapiEngine::initCapture(){
  try {
    // Re-acquire the device (handles reconnected devices / default switches)
    device_.Reset();
    if(followDefault_){
      // Always re-resolve the current default — that's the whole point of follow.
      HRESULT hr = enumr_->GetDefaultAudioEndpoint(eRender, eConsole, &device_);
      if(FAILED(hr)){
        std::cerr << "[WasapiEngine] initCapture: default endpoint (follow) failed (hr="
                  << hrToString(hr) << ")" << std::endl;
        if(errCb_) errCb_((int)hr, "GetDefaultAudioEndpoint failed: " + hrToString(hr));
        return false;
      }
      dataflow_ = eRender;
      LPWSTR id = nullptr; device_->GetId(&id);  // remember for currentDevice() reporting
      deviceId_ = wstringToString(std::wstring(id));
      CoTaskMemFree(id);
    } else if(!deviceId_.empty()){
      std::wstring wid = stringToWstring(deviceId_);
      HRESULT hr = enumr_->GetDevice(wid.c_str(), &device_);
      if(FAILED(hr)){
        std::cerr << "[WasapiEngine] initCapture: GetDevice failed (hr="
                  << hrToString(hr) << ")" << std::endl;
        if(errCb_) errCb_((int)hr, "GetDevice failed: " + hrToString(hr));
        return false;
      }
    } else {
      HRESULT hr = enumr_->GetDefaultAudioEndpoint(eRender, eConsole, &device_);
      if(FAILED(hr)){
        std::cerr << "[WasapiEngine] initCapture: GetDefaultAudioEndpoint failed (hr="
                  << hrToString(hr) << ")" << std::endl;
        if(errCb_) errCb_((int)hr, "GetDefaultAudioEndpoint failed: " + hrToString(hr));
        return false;
      }
      // Store the ID so we can re-acquire on reconnect
      LPWSTR id = nullptr; device_->GetId(&id);
      deviceId_ = wstringToString(std::wstring(id));
      CoTaskMemFree(id);
    }

    check(device_->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, &audioClient_), "Activate IAudioClient");
    check(audioClient_->GetMixFormat(&wfx_), "GetMixFormat");

    // Decide how to read the capture buffer up front; refuse anything we can't
    // decode rather than reinterpreting the bytes and emitting garbage.
    fmt_ = detectFormat(wfx_);
    if(fmt_ == SampleFormat::Unsupported){
      throw HrError(AUDCLNT_E_UNSUPPORTED_FORMAT,
                    "Unsupported capture format (" + describeFormat(wfx_) + ")");
    }

    // 200 ms endpoint buffer: this is capacity, not added latency — we drain to
    // the latest packet every wakeup. Generous headroom for thread stalls
    // without the wastefulness of the previous 1 s.
    REFERENCE_TIME dur = 2000000;
    DWORD flags = AUDCLNT_STREAMFLAGS_EVENTCALLBACK;
    if(dataflow_ == eRender && loopback_) flags |= AUDCLNT_STREAMFLAGS_LOOPBACK;
    check(audioClient_->Initialize(AUDCLNT_SHAREMODE_SHARED, flags, dur, 0, wfx_, nullptr), "Initialize");
    check(audioClient_->GetService(IID_PPV_ARGS(&cap_)), "GetService IAudioCaptureClient");

    WORD nChannels = 0; DWORD sampleRate = 0;
    if(wfx_->wFormatTag == WAVE_FORMAT_EXTENSIBLE){
      auto* fext = reinterpret_cast<WAVEFORMATEXTENSIBLE*>(wfx_);
      nChannels = fext->Format.nChannels; sampleRate = fext->Format.nSamplesPerSec;
    } else {
      nChannels = wfx_->nChannels; sampleRate = wfx_->nSamplesPerSec;
    }
    sampleRate_ = (int)sampleRate;
    binmap_ = makeBinMap(sampleRate_, plan_.fftSize, plan_.columns);
    nChannels_ = (int)nChannels;

    kiss_ = new Kiss();
    kiss_->in.resize(plan_.fftSize);
    kiss_->out.resize(plan_.fftSize/2+1);
    kiss_->cfg = kiss_fftr_alloc(plan_.fftSize, 0, nullptr, nullptr);

    waveformBuf_ = FloatRingBuffer(2048);
    sampleBuf_ = FloatRingBuffer(4096*4);

    vuBufs_.clear();
    vuBufs_.reserve(nChannels_);
    for(int i = 0; i < nChannels_; ++i) {
      vuBufs_.emplace_back(4096);
    }

    consecutiveGetBufferFailures_ = 0;

    captureEvent_ = CreateEvent(nullptr, FALSE, FALSE, nullptr);
    check(audioClient_->SetEventHandle(captureEvent_), "SetEventHandle");
    check(audioClient_->Start(), "Start");

    std::cerr << "[WasapiEngine] initCapture: success (sr=" << sampleRate_
              << " ch=" << nChannels_ << ")" << std::endl;
    return true;
  } catch(const HrError& e) {
    std::cerr << "[WasapiEngine] initCapture failed: " << e.what() << std::endl;
    releaseCapture();
    if(errCb_) errCb_((int)e.hr, e.what());
    return false;
  } catch(const std::exception& e) {
    std::cerr << "[WasapiEngine] initCapture failed: " << e.what() << std::endl;
    releaseCapture();
    if(errCb_) errCb_(0, e.what());
    return false;
  } catch(...) {
    std::cerr << "[WasapiEngine] initCapture failed: unknown exception" << std::endl;
    releaseCapture();
    if(errCb_) errCb_(0, "initCapture failed: unknown exception");
    return false;
  }
}

void WasapiEngine::releaseCapture(){
  if(audioClient_) audioClient_->Stop();
  if(kiss_){ kiss_fft_free(kiss_->cfg); delete kiss_; kiss_ = nullptr; }
  if(wfx_){ CoTaskMemFree(wfx_); wfx_ = nullptr; }
  cap_.Reset();
  audioClient_.Reset();
  device_.Reset();
  if(captureEvent_){ CloseHandle(captureEvent_); captureEvent_ = nullptr; }
}

void WasapiEngine::start(){
  if(running_) return;

  // In follow mode initCapture re-resolves the default every time, so don't
  // freeze a device id here.
  if(!followDefault_){
    // If no device set, get default and store its ID
    if(deviceId_.empty() && !device_){
      Microsoft::WRL::ComPtr<IMMDevice> defDev;
      if(SUCCEEDED(enumr_->GetDefaultAudioEndpoint(eRender, eConsole, &defDev))){
        LPWSTR id = nullptr; defDev->GetId(&id);
        deviceId_ = wstringToString(std::wstring(id));
        CoTaskMemFree(id);
        dataflow_ = eRender;
      }
    } else if(!device_ && !deviceId_.empty()) {
      // deviceId_ already set (from setDevice), device_ will be re-acquired in initCapture
    } else if(device_ && deviceId_.empty()) {
      // device_ set but no ID cached — grab it
      LPWSTR id = nullptr; device_->GetId(&id);
      deviceId_ = wstringToString(std::wstring(id));
      CoTaskMemFree(id);
    }
  }

  ResetEvent(stopEvent_);
  running_ = true;

  th_ = std::thread([this]{
    DWORD taskIndex = 0;
    HANDLE mmTask = AvSetMmThreadCharacteristicsW(L"Pro Audio", &taskIndex);

    // Outer retry loop — keeps running until stop() is called
    while(running_){
      if(!initCapture()){
        std::cerr << "[WasapiEngine] initCapture failed, retrying in 2s..." << std::endl;
        WaitForSingleObject(stopEvent_, 2000);
        continue;
      }

      // Format was resolved in initCapture(); read samples through one path.
      const SampleFormat fmt = fmt_;
      const int sampleSz = sampleBytes(fmt);
      const int nChannels = nChannels_;

      auto lastWavePublish = std::chrono::high_resolution_clock::now();
      const double wavePublishInterval = 1.0 / 60.0;

      BYTE* data = nullptr; UINT32 frames = 0; DWORD bufFlags = 0; UINT64 pos = 0; UINT64 qpc = 0;
      std::vector<float> hop(plan_.hopSize);
      size_t hopFill = 0;
      bool deviceLost = false;
      bool switchRequested = false;

      // Inner capture loop
      while(running_){
        HANDLE events[3] = {captureEvent_, stopEvent_, switchEvent_};
        DWORD result = WaitForMultipleObjects(3, events, FALSE, 2000);

        if(result == WAIT_OBJECT_0 + 1 || !running_){
          break;
        }
        if(result == WAIT_OBJECT_0 + 2){   // system default endpoint changed
          switchRequested = true;
          break;
        }
        UINT32 p = 0; audioClient_->GetCurrentPadding(&p);

        for(;;){
          HRESULT hr = cap_->GetBuffer(&data, &frames, &bufFlags, &pos, &qpc);
          if(hr == AUDCLNT_S_BUFFER_EMPTY){ consecutiveGetBufferFailures_ = 0; break; }
          if(FAILED(hr)){
            ++consecutiveGetBufferFailures_;
            if(hr == AUDCLNT_E_DEVICE_INVALIDATED || hr == AUDCLNT_E_SERVICE_NOT_RUNNING
               || consecutiveGetBufferFailures_ >= kMaxConsecutiveFailures){
              std::cerr << "[WasapiEngine] Device lost (hr="
                        << hrToString(hr) << ")" << std::endl;
              if(errCb_) errCb_((int)hr, "Device lost: " + hrToString(hr));
              deviceLost = true;
            }
            break;
          }
          consecutiveGetBufferFailures_ = 0;

          const bool silent = (bufFlags & AUDCLNT_BUFFERFLAGS_SILENT) != 0;

          const uint8_t* base = reinterpret_cast<const uint8_t*>(data);
          UINT32 i = 0;
          while(i < frames){
            size_t toCopy = std::min<size_t>(plan_.hopSize - hopFill, frames - i);

            // Mono mix-down for the FFT: channel 0 of each frame.
            if(silent){
              std::fill(hop.begin() + hopFill, hop.begin() + hopFill + toCopy, 0.0f);
            }else{
              for(size_t k = 0; k < toCopy; ++k){
                const uint8_t* p = base + ((size_t)(i + k) * nChannels) * sampleSz;
                hop[hopFill + k] = sampleToFloat(p, fmt);
              }
            }

            {
              std::lock_guard<std::mutex> lock(waveformMutex_);
              for(size_t k = 0; k < toCopy; ++k){
                waveformBuf_.writeSingle(hop[hopFill + k]);
              }
            }

            {
              std::lock_guard<std::mutex> lock(vuMutex_);
              for(size_t k = 0; k < toCopy; ++k){
                for(int ch = 0; ch < nChannels; ++ch){
                  float sample = 0.0f;
                  if(!silent){
                    const uint8_t* p = base + ((size_t)(i + k) * nChannels + ch) * sampleSz;
                    sample = sampleToFloat(p, fmt);
                  }
                  vuBufs_[ch].writeSingle(sample);
                }
              }
            }

            hopFill += toCopy;
            i += (UINT32)toCopy;

            if(hopFill == (size_t)plan_.hopSize){
              sampleBuf_.write(hop.data(), plan_.hopSize);
              hopFill = 0;
              if(sampleBuf_.count() >= (size_t)plan_.fftSize){
                std::vector<float> frame(plan_.fftSize);
                sampleBuf_.readLatest(frame.data(), frame.size());
                computeFftAndPublish(frame.data());
              }
            }
          }

          cap_->ReleaseBuffer(frames);
        }

        if(deviceLost) break;

        auto now = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double> elapsed = now - lastWavePublish;

        if(elapsed.count() >= wavePublishInterval){
          publishWaveform();
          computeAndPublishVu();
          lastWavePublish = now;
        }
      }

      // Clean up this capture session
      releaseCapture();

      if(running_){
        if(switchRequested){
          // Default endpoint changed — re-init promptly; short settle coalesces
          // a burst of change notifications.
          std::cerr << "[WasapiEngine] Default device changed, switching..." << std::endl;
          WaitForSingleObject(stopEvent_, 150);
        } else {
          std::cerr << "[WasapiEngine] Device lost, retrying in 2s..." << std::endl;
          WaitForSingleObject(stopEvent_, 2000);
        }
      }
    }

    if(mmTask) AvRevertMmThreadCharacteristics(mmTask);
  });
}

void WasapiEngine::stop(){
  std::cerr << "[WasapiEngine] stop() called" << std::endl;
  if(!running_) return;

  running_ = false;
  if(stopEvent_) SetEvent(stopEvent_);

  if(th_.joinable()) th_.join();
  // Thread already called releaseCapture() before exiting
  std::cerr << "[WasapiEngine] stop: completed" << std::endl;
}

void WasapiEngine::publishWaveform(){
  if(!waveCb_) return;

  float waveSamples[2048];
  {
    std::lock_guard<std::mutex> lock(waveformMutex_);
    if(waveformBuf_.count() < 2048) return;
    waveformBuf_.readLatest(waveSamples, 2048);
  }

  std::vector<int16_t> downsampled(1024);
  for(int i = 0; i < 1024; ++i){
    float sample = waveSamples[i * 2];
    int32_t val = static_cast<int32_t>(sample * 32767.0f * masterGain_);
    val = std::max(-32768, std::min(32767, val));
    downsampled[i] = static_cast<int16_t>(val);
  }

  waveCb_(downsampled);
}

void WasapiEngine::computeAndPublishVu(){
  if(!vuCb_ || nChannels_ == 0) return;

  std::vector<uint8_t> vuLevels(nChannels_);

  {
    std::lock_guard<std::mutex> lock(vuMutex_);
    for(int ch = 0; ch < nChannels_ && ch < 8; ++ch){
      if(vuBufs_[ch].count() == 0){
        vuLevels[ch] = 0;
        continue;
      }

      double sumSquares = 0.0;
      size_t n = 0;
      vuBufs_[ch].iterLatest(1024, [&](float s){
        sumSquares += (double)s * (double)s;
        ++n;
      });

      if(n == 0){ vuLevels[ch] = 0; continue; }

      double rms = std::sqrt(sumSquares / n);
      rms *= masterGain_;
      double db = 20.0 * std::log10(rms + 1e-10);

      double normalized = (db + 60.0) / 60.0;
      normalized = std::max(0.0, std::min(1.0, normalized));

      vuLevels[ch] = static_cast<uint8_t>(std::round(normalized * 255.0));
    }
  }

  vuCb_(vuLevels);
}

void WasapiEngine::computeFftAndPublish(const float* frame){
  for(int i=0;i<plan_.fftSize;++i){
    float w = 0.54f - 0.46f * std::cos(2.0*kPI*i/(plan_.fftSize-1));
    kiss_->in[i]= frame[i]*w;
  }

  kiss_fftr(kiss_->cfg, kiss_->in.data(), kiss_->out.data());

  auto& out = specBuf_.writeBuf();
  out.resize(plan_.columns);
  const float dbFloor = plan_.dbFloor;

  for(int b=0;b<plan_.columns;++b){
    double sum=0;
    int cnt=0;
    for(int j=binmap_.start[b]; j<binmap_.end[b]; ++j,++cnt){
      double re = kiss_->out[j].r;
      double im = kiss_->out[j].i;
      const double ampScale = 2.0 / double(plan_.fftSize);
      sum += std::sqrt(re*re + im*im) * ampScale;
    }
    double lin = cnt>0 ? sum/cnt : 0.0;
    double db = 20.0*std::log10(lin + 1e-20);

    double clamped = std::max(db, (double)dbFloor);
    double norm = double(b+10)/double(plan_.columns+10);
    double gain = std::pow(norm, (double)tiltExp_);
    float v = float(((clamped - dbFloor)/-dbFloor) * gain * masterGain_);
    if (clampUnit_) v = std::max(0.0f, std::min(1.0f, v));

    out[b] = static_cast<uint8_t>(std::round(v * 255.0f));
  }

  specBuf_.publish();
  if(cb_) cb_(specBuf_.readBuf());
}
