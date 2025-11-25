#include "wasapi_engine.h"
#include <iostream>
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

static void check(HRESULT hr, const char* where){ if(FAILED(hr)) throw std::runtime_error(std::string(where)+" hr=0x"+std::to_string(hr)); }

WasapiEngine::WasapiEngine(){
  CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  check(CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, IID_PPV_ARGS(&enumr_)), "MMDeviceEnumerator");
  stopEvent_ = CreateEvent(nullptr, TRUE, FALSE, nullptr);  // Manual reset event
}

WasapiEngine::~WasapiEngine(){
  std::cout << "[WasapiEngine] Destructor called" << std::endl;
  enable(false);
  if(stopEvent_) CloseHandle(stopEvent_);
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
  device_.Reset();
  std::wstring wDeviceId = stringToWstring(deviceId);
  HRESULT hr = enumr_->GetDevice(wDeviceId.c_str(), &device_);
  if(FAILED(hr)) return false;
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
void WasapiEngine::setCallback(FftCallback cb){ cb_ = std::move(cb); }
void WasapiEngine::setWaveCallback(WaveCallback cb) { waveCb_ = std::move(cb); }
void WasapiEngine::setVuCallback(VuCallback cb) { vuCb_ = std::move(cb); }

void WasapiEngine::enable(bool on){
  std::cout << "[WasapiEngine] enable(" << (on ? "true" : "false") << ")" << std::endl;
  std::cout.flush();
  if(on){ start(); } else { stop(); }
}

void WasapiEngine::start(){
  if(running_) return;
  if(!device_) {
    enumr_->GetDefaultAudioEndpoint(eRender, eConsole, &device_);
    dataflow_ = eRender;
  }
  check(device_->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, &audioClient_), "Activate IAudioClient");
  check(audioClient_->GetMixFormat(&wfx_), "GetMixFormat");

  bool isFloat = false; WORD nChannels = 0; DWORD sampleRate = 0;
  if(wfx_->wFormatTag == WAVE_FORMAT_EXTENSIBLE){
    auto* fext = reinterpret_cast<WAVEFORMATEXTENSIBLE*>(wfx_);
    isFloat = IsEqualGUID(fext->SubFormat, KSDATAFORMAT_SUBTYPE_IEEE_FLOAT) != 0;
    nChannels = fext->Format.nChannels; sampleRate = fext->Format.nSamplesPerSec;
  } else {
    isFloat = (wfx_->wFormatTag == WAVE_FORMAT_IEEE_FLOAT);
    nChannels = wfx_->nChannels; sampleRate = wfx_->nSamplesPerSec;
  }

  REFERENCE_TIME dur = 10000000;
  DWORD flags = AUDCLNT_STREAMFLAGS_EVENTCALLBACK;
  if(dataflow_ == eRender && loopback_) flags |= AUDCLNT_STREAMFLAGS_LOOPBACK;
  check(audioClient_->Initialize(AUDCLNT_SHAREMODE_SHARED, flags, dur, 0, wfx_, nullptr), "Initialize");
  check(audioClient_->GetService(IID_PPV_ARGS(&cap_)), "GetService IAudioCaptureClient");
  sampleRate_ = (int)sampleRate; binmap_ = makeBinMap(sampleRate_, plan_.fftSize, plan_.columns);
  nChannels_ = (int)nChannels;

  kiss_ = new Kiss();
  kiss_->in.resize(plan_.fftSize);
  kiss_->out.resize(plan_.fftSize/2+1);
  kiss_->cfg = kiss_fftr_alloc(plan_.fftSize, 0, nullptr, nullptr);

  waveformBuf_.clear();
  waveformBuf_.reserve(2048);

  vuBufs_.clear();
  vuBufs_.resize(nChannels_);
  for(auto& buf : vuBufs_) {
    buf.reserve(4096);
  }

  HANDLE evt = CreateEvent(nullptr, FALSE, FALSE, nullptr);
  check(audioClient_->SetEventHandle(evt), "SetEventHandle");
  ResetEvent(stopEvent_);  // Reset stop event before starting
  running_ = true;
  th_ = std::thread([&,evt,isFloat,nChannels]{
    DWORD taskIndex = 0; HANDLE task = AvSetMmThreadCharacteristicsW(L"Pro Audio", &taskIndex);

    auto lastWavePublish = std::chrono::high_resolution_clock::now();
    const double wavePublishInterval = 1.0 / 60.0;

    try{
      check(audioClient_->Start(), "Start");
      BYTE* data=nullptr; UINT32 frames=0; DWORD flags=0; UINT64 pos=0; UINT64 qpc=0;
      std::vector<float> hop(plan_.hopSize);
      size_t hopFill = 0;

      while(running_){
        HANDLE events[2] = {evt, stopEvent_};
        DWORD result = WaitForMultipleObjects(2, events, FALSE, 2000);

        // If stop event signaled, break immediately
        if(result == WAIT_OBJECT_0 + 1 || !running_){
          break;
        }
        UINT32 p=0; audioClient_->GetCurrentPadding(&p);

        for(;;){
          HRESULT hr = cap_->GetBuffer(&data, &frames, &flags, &pos, &qpc);
          if(hr==AUDCLNT_S_BUFFER_EMPTY) break;
          if(FAILED(hr)) break;

          const bool silent = (flags & AUDCLNT_BUFFERFLAGS_SILENT) != 0;

          if(isFloat){
            const float* f = reinterpret_cast<const float*>(data);
            UINT32 i = 0;
            while(i < frames){
              size_t toCopy = std::min<size_t>(plan_.hopSize - hopFill, frames - i);

              if(silent){
                std::fill(hop.begin() + hopFill, hop.begin() + hopFill + toCopy, 0.0f);
              }else{
                for(size_t k = 0; k < toCopy; ++k){
                  hop[hopFill + k] = f[(i + (UINT32)k) * nChannels];
                }
              }

              {
                std::lock_guard<std::mutex> lock(waveformMutex_);
                for(size_t k = 0; k < toCopy; ++k){
                  waveformBuf_.push_back(hop[hopFill + k]);
                  if(waveformBuf_.size() > 2048) {
                    waveformBuf_.erase(waveformBuf_.begin(), waveformBuf_.begin() + (waveformBuf_.size() - 2048));
                  }
                }
              }

              {
                std::lock_guard<std::mutex> lock(vuMutex_);
                for(size_t k = 0; k < toCopy; ++k){
                  for(int ch = 0; ch < nChannels_; ++ch){
                    float sample = silent ? 0.0f : f[(i + (UINT32)k) * nChannels_ + ch];
                    vuBufs_[ch].push_back(sample);
                    if(vuBufs_[ch].size() > 4096) {
                      vuBufs_[ch].erase(vuBufs_[ch].begin());
                    }
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
          } else {
            const int16_t* s = reinterpret_cast<const int16_t*>(data);
            UINT32 i = 0;
            while(i < frames){
              size_t toCopy = std::min<size_t>(plan_.hopSize - hopFill, frames - i);
              if(silent){
                std::fill(hop.begin() + hopFill, hop.begin() + hopFill + toCopy, 0.0f);
              }else{
                for(size_t k = 0; k < toCopy; ++k){
                  hop[hopFill + k] = s[(i + (UINT32)k) * nChannels] / 32768.0f;
                }
              }

              {
                std::lock_guard<std::mutex> lock(waveformMutex_);
                for(size_t k = 0; k < toCopy; ++k){
                  waveformBuf_.push_back(hop[hopFill + k]);
                  if(waveformBuf_.size() > 2048) {
                    waveformBuf_.erase(waveformBuf_.begin(), waveformBuf_.begin() + (waveformBuf_.size() - 2048));
                  }
                }
              }

              {
                std::lock_guard<std::mutex> lock(vuMutex_);
                for(size_t k = 0; k < toCopy; ++k){
                  for(int ch = 0; ch < nChannels_; ++ch){
                    float sample = silent ? 0.0f : s[(i + (UINT32)k) * nChannels_ + ch] / 32768.0f;
                    vuBufs_[ch].push_back(sample);
                    if(vuBufs_[ch].size() > 4096) {
                      vuBufs_[ch].erase(vuBufs_[ch].begin());
                    }
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
          }

          cap_->ReleaseBuffer(frames);
        }

        auto now = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double> elapsed = now - lastWavePublish;

        if(elapsed.count() >= wavePublishInterval){
          publishWaveform();
          computeAndPublishVu();
          lastWavePublish = now;
        }
      }
      audioClient_->Stop();
    } catch(...) {
    }
    if(task) AvRevertMmThreadCharacteristics(task); CloseHandle(evt);
  });
}

void WasapiEngine::stop(){
  std::cout << "[WasapiEngine] ===== stop() called =====" << std::endl;
  std::cout.flush();
  if(!running_) {
    std::cout << "[WasapiEngine] stop: already stopped (running_ = false)" << std::endl;
    std::cout.flush();
    return;
  }

  std::cout << "[WasapiEngine] stop: setting running_ = false" << std::endl;
  std::cout.flush();
  running_=false;

  // Signal stop event to wake up worker thread immediately
  if(stopEvent_) {
    std::cout << "[WasapiEngine] stop: signaling stopEvent_" << std::endl;
    std::cout.flush();
    SetEvent(stopEvent_);
  }

  // Now join will be fast because worker thread will wake up and exit
  std::cout << "[WasapiEngine] stop: waiting for worker thread to join..." << std::endl;
  std::cout.flush();
  if(th_.joinable()) {
    th_.join();
    std::cout << "[WasapiEngine] stop: worker thread joined" << std::endl;
    std::cout.flush();
  } else {
    std::cout << "[WasapiEngine] stop: worker thread was not joinable" << std::endl;
    std::cout.flush();
  }

  std::cout << "[WasapiEngine] stop: cleaning up resources..." << std::endl;
  std::cout.flush();
  if(kiss_){ kiss_fft_free(kiss_->cfg); delete kiss_; kiss_=nullptr;}
  if(wfx_){ CoTaskMemFree(wfx_); wfx_=nullptr;}
  cap_.Reset();
  audioClient_.Reset();
  std::cout << "[WasapiEngine] ===== stop: completed =====" << std::endl;
  std::cout.flush();
}

void WasapiEngine::publishWaveform(){
  if(!waveCb_) return;

  std::vector<float> waveSamples;
  {
    std::lock_guard<std::mutex> lock(waveformMutex_);
    if(waveformBuf_.size() < 2048) return;
    waveSamples = waveformBuf_;
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

  std::vector<float> channelSamples[8];
  {
    std::lock_guard<std::mutex> lock(vuMutex_);
    for(int ch = 0; ch < nChannels_ && ch < 8; ++ch){
      if(vuBufs_[ch].empty()) return;
      channelSamples[ch] = vuBufs_[ch];
    }
  }

  std::vector<uint8_t> vuLevels(nChannels_);

  for(int ch = 0; ch < nChannels_; ++ch){
    const auto& samples = channelSamples[ch];
    if(samples.empty()) {
      vuLevels[ch] = 0;
      continue;
    }

    size_t n = std::min<size_t>(1024, samples.size());
    size_t start = samples.size() - n;

    double sumSquares = 0.0;
    for(size_t i = start; i < samples.size(); ++i){
      double s = samples[i];
      sumSquares += s * s;
    }

    double rms = std::sqrt(sumSquares / n);
    rms *= masterGain_;
    double db = 20.0 * std::log10(rms + 1e-10);

    double normalized = (db + 60.0) / 60.0;
    normalized = std::max(0.0, std::min(1.0, normalized));

    vuLevels[ch] = static_cast<uint8_t>(std::round(normalized * 255.0));
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
