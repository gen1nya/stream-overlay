#pragma once
#include <functional>
#include <thread>
#include <atomic>
#include <string>
#include <vector>
#include <wrl.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <avrt.h>
#include <Functiondiscoverykeys_devpkey.h>
#include <algorithm>
#include "ringbuffers.h"
#include "fft_bands.h"

#pragma comment(lib, "avrt.lib")

struct DeviceInfo { std::wstring id; std::wstring name; enum class Flow{Render, Capture}; Flow flow; };

class WasapiEngine {
public:
  //using FftCallback = std::function<void(const std::vector<float>&)>;
  //using WaveCallback = std::function<void(const std::vector<float>&)>;
  using FftCallback = std::function<void(const std::vector<uint8_t>&)>;
  using WaveCallback = std::function<void(const std::vector<int16_t>&)>;
  using VuCallback = std::function<void(const std::vector<uint8_t>&)>;

  WasapiEngine();
  ~WasapiEngine();

  std::vector<DeviceInfo> listDevices();
  bool setDevice(const std::wstring& deviceId);
  DeviceInfo currentDevice();

  void setFftSize(int fft); // 1024..8192
  void setHopSize(int hop);
  void setColumns(int columns);
  void setDbFloor(float db);
  void setMasterGain(float g);
  void setTilt(float exp);
  void setLoopback(bool on);   // toggle loopback for render devices
  void enable(bool on);
  void setCallback(FftCallback cb);
  void setWaveCallback(WaveCallback cb);
  void setVuCallback(VuCallback cb);


private:
  void start();
  void stop();
  void workerLoop();
  void computeFftAndPublish(const float* frame);
  void computeAndPublishVu();
  void publishWaveform();

  // COM
  Microsoft::WRL::ComPtr<IMMDeviceEnumerator> enumr_;
  Microsoft::WRL::ComPtr<IMMDevice> device_;
  Microsoft::WRL::ComPtr<IAudioClient> audioClient_;
  Microsoft::WRL::ComPtr<IAudioCaptureClient> cap_;

  WAVEFORMATEX* wfx_ = nullptr;
  std::thread th_;
  std::atomic<bool> running_{false};

  BandPlan plan_{};
  BinMap binmap_{};
  int sampleRate_ = 0;
  FloatRingBuffer sampleBuf_{4096*4};
  TripleBuffer<uint8_t> specBuf_{256};
  FftCallback cb_;
  VuCallback vuCb_;
  WaveCallback waveCb_;

  // device props
  EDataFlow dataflow_ = eRender; // render or capture
  bool loopback_ = true;          // only meaningful for render

  // output shaping
  float masterGain_ = 1.0f;   // ensures 0..1 range by default
  float tiltExp_ = 0.35f;     // spectral tilt exponent
  bool clampUnit_ = true;     // clamp output to [0,1]

  // kissfft state
  struct Kiss;
  Kiss* kiss_ = nullptr; // forward-declared PIMPL

  std::vector<float> waveformBuf_;
  std::mutex waveformMutex_;

  // VU meter state
  int nChannels_ = 0;
  std::vector<std::vector<float>> vuBufs_;  // per-channel sample buffers for VU calculation
  std::mutex vuMutex_;
};