#include "engine.h"
#define _USE_MATH_DEFINES
#include <stdexcept>
constexpr double kPI = 3.14159265358979323846; // avoid M_PI dependency
#include <chrono>
#include <cmath>
#include <functional>
extern "C" {
  #include "kiss_fftr.h"
}

struct WasapiEngine::Kiss { kiss_fftr_cfg cfg = nullptr; std::vector<float> in; std::vector<kiss_fft_cpx> out; };

static void check(HRESULT hr, const char* where){ if(FAILED(hr)) throw std::runtime_error(std::string(where)+" hr=0x"+std::to_string(hr)); }

WasapiEngine::WasapiEngine(){ CoInitializeEx(nullptr, COINIT_MULTITHREADED); check(CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, IID_PPV_ARGS(&enumr_)), "MMDeviceEnumerator"); }
WasapiEngine::~WasapiEngine(){ enable(false); CoUninitialize(); }

std::vector<DeviceInfo> WasapiEngine::listDevices(){
  std::vector<DeviceInfo> r;
  for(int pass=0; pass<2; ++pass){
    EDataFlow flow = pass==0? eRender : eCapture;
    Microsoft::WRL::ComPtr<IMMDeviceCollection> coll; check(enumr_->EnumAudioEndpoints(flow, DEVICE_STATE_ACTIVE, &coll), "EnumAudioEndpoints");
    UINT n=0; coll->GetCount(&n);
    for(UINT i=0;i<n;++i){
      Microsoft::WRL::ComPtr<IMMDevice> d; coll->Item(i,&d);
      LPWSTR id=nullptr; d->GetId(&id);
      Microsoft::WRL::ComPtr<IPropertyStore> props; d->OpenPropertyStore(STGM_READ, &props);
      PROPVARIANT v; PropVariantInit(&v); props->GetValue(PKEY_Device_FriendlyName, &v);
      DeviceInfo di; di.id = id; di.name = v.pwszVal; di.flow = pass==0? DeviceInfo::Flow::Render : DeviceInfo::Flow::Capture;
      r.push_back(std::move(di)); CoTaskMemFree(id); PropVariantClear(&v);
    }
  }
  return r;
}

bool WasapiEngine::setDevice(const std::wstring& deviceId){
  if(running_) stop();
  device_.Reset();
  HRESULT hr = enumr_->GetDevice(deviceId.c_str(), &device_);
  if(FAILED(hr)) return false;
  // determine dataflow
  Microsoft::WRL::ComPtr<IMMEndpoint> ep; dataflow_ = eRender;
  if(SUCCEEDED(device_->QueryInterface(IID_PPV_ARGS(&ep)))){
    ep->GetDataFlow(&dataflow_);
  }
  return true;
}

DeviceInfo WasapiEngine::currentDevice(){
  DeviceInfo di; if(!device_) return di; LPWSTR id=nullptr; device_->GetId(&id); di.id=id; CoTaskMemFree(id);
  Microsoft::WRL::ComPtr<IPropertyStore> props; device_->OpenPropertyStore(STGM_READ, &props); PROPVARIANT v; PropVariantInit(&v);
  props->GetValue(PKEY_Device_FriendlyName, &v); di.name=v.pwszVal; PropVariantClear(&v);
  Microsoft::WRL::ComPtr<IMMEndpoint> ep; di.flow = DeviceInfo::Flow::Render;
  if(SUCCEEDED(device_->QueryInterface(IID_PPV_ARGS(&ep)))){ EDataFlow df; if(SUCCEEDED(ep->GetDataFlow(&df))) di.flow = (df==eRender? DeviceInfo::Flow::Render : DeviceInfo::Flow::Capture); }
  return di;
}

void WasapiEngine::setFftSize(int fft){ plan_.fftSize = fft; }
void WasapiEngine::setHopSize(int hop){ plan_.hopSize = hop; }
void WasapiEngine::setColumns(int c){ plan_.columns = std::max(1, std::min(c, 256)); if(sampleRate_>0) binmap_ = makeBinMap(sampleRate_, plan_.fftSize, plan_.columns); }
void WasapiEngine::setDbFloor(float db){ plan_.dbFloor = db; }
void WasapiEngine::setMasterGain(float g){ masterGain_ = g; }
void WasapiEngine::setTilt(float exp){ tiltExp_ = exp; }
void WasapiEngine::setLoopback(bool on){ loopback_ = on; }
void WasapiEngine::setCallback(FftCallback cb){ cb_ = std::move(cb); }

void WasapiEngine::enable(bool on){ if(on){ start(); } else { stop(); } }

void WasapiEngine::start(){
  if(running_) return; if(!device_) { // default render loopback
    enumr_->GetDefaultAudioEndpoint(eRender, eConsole, &device_);
    dataflow_ = eRender; // default device is render
  }
  check(device_->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, &audioClient_), "Activate IAudioClient");
  check(audioClient_->GetMixFormat(&wfx_), "GetMixFormat");

  // Determine sample format (handles WAVE_FORMAT_EXTENSIBLE)
  bool isFloat = false; WORD nChannels = 0; DWORD sampleRate = 0;
  if(wfx_->wFormatTag == WAVE_FORMAT_EXTENSIBLE){
    auto* fext = reinterpret_cast<WAVEFORMATEXTENSIBLE*>(wfx_);
    isFloat = IsEqualGUID(fext->SubFormat, KSDATAFORMAT_SUBTYPE_IEEE_FLOAT) != 0;
    nChannels = fext->Format.nChannels; sampleRate = fext->Format.nSamplesPerSec;
  } else {
    isFloat = (wfx_->wFormatTag == WAVE_FORMAT_IEEE_FLOAT);
    nChannels = wfx_->nChannels; sampleRate = wfx_->nSamplesPerSec;
  }

  REFERENCE_TIME dur = 10000000; // 1s
  DWORD flags = AUDCLNT_STREAMFLAGS_EVENTCALLBACK;
  if(dataflow_ == eRender && loopback_) flags |= AUDCLNT_STREAMFLAGS_LOOPBACK;
  check(audioClient_->Initialize(AUDCLNT_SHAREMODE_SHARED, flags, dur, 0, wfx_, nullptr), "Initialize");
  check(audioClient_->GetService(IID_PPV_ARGS(&cap_)), "GetService IAudioCaptureClient");
  sampleRate_ = (int)sampleRate; binmap_ = makeBinMap(sampleRate_, plan_.fftSize, plan_.columns);

  kiss_ = new Kiss(); kiss_->in.resize(plan_.fftSize); kiss_->out.resize(plan_.fftSize/2+1); kiss_->cfg = kiss_fftr_alloc(plan_.fftSize, 0, nullptr, nullptr);

  HANDLE evt = CreateEvent(nullptr, FALSE, FALSE, nullptr);
  check(audioClient_->SetEventHandle(evt), "SetEventHandle");
  running_ = true;
  th_ = std::thread([&,evt,isFloat,nChannels]{
    DWORD taskIndex = 0; HANDLE task = AvSetMmThreadCharacteristicsW(L"Pro Audio", &taskIndex);
    try{
      check(audioClient_->Start(), "Start");
      BYTE* data=nullptr; UINT32 frames=0; DWORD flags=0; UINT64 pos=0; UINT64 qpc=0;
      std::vector<float> hop(plan_.hopSize);
      while(running_){
        WaitForSingleObject(evt, 2000);
        UINT32 p=0; audioClient_->GetCurrentPadding(&p);
        for(;;){
          HRESULT hr = cap_->GetBuffer(&data, &frames, &flags, &pos, &qpc);
          if(hr==AUDCLNT_S_BUFFER_EMPTY) break; if(FAILED(hr)) break;
          // Convert to float mono: take first channel
          if(isFloat){
            const float* f = reinterpret_cast<const float*>(data);
            for(UINT32 i=0;i<frames;++i){ hop[i%plan_.hopSize]= f[i*nChannels]; if(((i+1)%plan_.hopSize)==0){ sampleBuf_.write(hop.data(), plan_.hopSize); if(sampleBuf_.count()>= (size_t)plan_.fftSize){ std::vector<float> frame(plan_.fftSize); sampleBuf_.readLatest(frame.data(), frame.size()); computeFftAndPublish(frame.data()); } } }
          } else {
            const int16_t* s = reinterpret_cast<const int16_t*>(data);
            for(UINT32 i=0;i<frames;++i){ hop[i%plan_.hopSize]= s[i*nChannels] / 32768.0f; if(((i+1)%plan_.hopSize)==0){ sampleBuf_.write(hop.data(), plan_.hopSize); if(sampleBuf_.count()>= (size_t)plan_.fftSize){ std::vector<float> frame(plan_.fftSize); sampleBuf_.readLatest(frame.data(), frame.size()); computeFftAndPublish(frame.data()); } } }
          }
          cap_->ReleaseBuffer(frames);
        }
      }
      audioClient_->Stop();
    } catch(...) {
      // Swallow to avoid unwinding across the thread boundary
    }
    if(task) AvRevertMmThreadCharacteristics(task); CloseHandle(evt);
  });
}

void WasapiEngine::stop(){ if(!running_) return; running_=false; if(th_.joinable()) th_.join(); if(kiss_){ kiss_fft_free(kiss_->cfg); delete kiss_; kiss_=nullptr;} if(wfx_){ CoTaskMemFree(wfx_); wfx_=nullptr;} cap_.Reset(); audioClient_.Reset(); }

void WasapiEngine::computeFftAndPublish(const float* frame){
  // Hamming window + FFT
  for(int i=0;i<plan_.fftSize;++i){ 
    float w = 0.54f - 0.46f * std::cos(2.0*kPI*i/(plan_.fftSize-1)); 
    kiss_->in[i]= frame[i]*w; 
  }

  // Blackman-Harris 4-term
  // w[i] = 0.35875 - 0.48829 cos(2πi/(N-1)) + 0.14128 cos(4πi/(N-1)) - 0.01168 cos(6πi/(N-1));
  //const double a0=0.35875, a1=0.48829, a2=0.14128, a3=0.01168;
  //for (int i=0;i<plan_.fftSize;++i){
  //  double t = 2.0*kPI*i/(plan_.fftSize-1);
  //  double w = a0 - a1*std::cos(t) + a2*std::cos(2*t) - a3*std::cos(3*t);
  //  kiss_->in[i] = frame[i] * (float)w;
  //}

  kiss_fftr(kiss_->cfg, kiss_->in.data(), kiss_->out.data());
  auto& out = specBuf_.writeBuf(); out.resize(plan_.columns);
  const float dbFloor = plan_.dbFloor;
  for(int b=0;b<plan_.columns;++b){ 
    double sum=0;
    double sumPow=0;
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
    out[b] = v;
  }
  specBuf_.publish(); if(cb_) cb_(specBuf_.readBuf());
}