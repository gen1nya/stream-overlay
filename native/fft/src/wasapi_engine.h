#pragma once
#include "audio_engine.h"
#include <thread>
#include <atomic>
#include <wrl.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <avrt.h>
#include <Functiondiscoverykeys_devpkey.h>
#include <algorithm>
#include "ringbuffers.h"
#include "fft_bands.h"

#pragma comment(lib, "avrt.lib")

class WasapiEngine : public AudioEngine {
public:
  WasapiEngine();
  ~WasapiEngine() override;

  // AudioEngine interface implementation
  std::vector<DeviceInfo> listDevices() override;
  bool setDevice(const std::string& deviceId) override;
  DeviceInfo currentDevice() override;

  void setFftSize(int fft) override;
  void setHopSize(int hop) override;
  void setColumns(int columns) override;
  void setDbFloor(float db) override;
  void setMasterGain(float g) override;
  void setTilt(float exp) override;
  void setLoopback(bool on) override;
  void enable(bool on) override;
  void setCallback(FftCallback cb) override;
  void setWaveCallback(WaveCallback cb) override;
  void setVuCallback(VuCallback cb) override;

private:
  void start();
  void stop();
  void workerLoop();
  void computeFftAndPublish(const float* frame);
  void computeAndPublishVu();
  void publishWaveform();

  // Helper for string conversion
  std::wstring stringToWstring(const std::string& str);
  std::string wstringToString(const std::wstring& wstr);

  // COM
  Microsoft::WRL::ComPtr<IMMDeviceEnumerator> enumr_;
  Microsoft::WRL::ComPtr<IMMDevice> device_;
  Microsoft::WRL::ComPtr<IAudioClient> audioClient_;
  Microsoft::WRL::ComPtr<IAudioCaptureClient> cap_;

  WAVEFORMATEX* wfx_ = nullptr;
  std::thread th_;
  std::atomic<bool> running_{false};
  HANDLE stopEvent_ = nullptr;

  BandPlan plan_{};
  BinMap binmap_{};
  int sampleRate_ = 0;
  FloatRingBuffer sampleBuf_{4096*4};
  TripleBuffer<uint8_t> specBuf_{256};
  FftCallback cb_;
  VuCallback vuCb_;
  WaveCallback waveCb_;

  // device props
  EDataFlow dataflow_ = eRender;
  bool loopback_ = true;

  // output shaping
  float masterGain_ = 1.0f;
  float tiltExp_ = 0.35f;
  bool clampUnit_ = true;

  // kissfft state
  struct Kiss;
  Kiss* kiss_ = nullptr;

  std::vector<float> waveformBuf_;
  std::mutex waveformMutex_;

  // VU meter state
  int nChannels_ = 0;
  std::vector<std::vector<float>> vuBufs_;
  std::mutex vuMutex_;
};
