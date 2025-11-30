#pragma once
#include "audio_engine.h"
#include <thread>
#include <atomic>
#include <mutex>
#include <condition_variable>
#include <pulse/pulseaudio.h>
#include "ringbuffers.h"
#include "fft_bands.h"

class PulseAudioEngine : public AudioEngine {
public:
  PulseAudioEngine();
  ~PulseAudioEngine() override;

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
  void computeFftAndPublish(const float* frame);
  void computeAndPublishVu();
  void publishWaveform();
  void processAudioData(const void* data, size_t bytes);

  // PulseAudio callbacks
  static void contextStateCallback(pa_context* c, void* userdata);
  static void sinkInfoCallback(pa_context* c, const pa_sink_info* info, int eol, void* userdata);
  static void sourceInfoCallback(pa_context* c, const pa_source_info* info, int eol, void* userdata);
  static void streamReadCallback(pa_stream* s, size_t nbytes, void* userdata);
  static void streamStateCallback(pa_stream* s, void* userdata);

  // PulseAudio objects
  bool mainloopRunning_ = false;
  pa_threaded_mainloop* mainloop_ = nullptr;
  pa_context* context_ = nullptr;
  pa_stream* stream_ = nullptr;

  std::string currentDeviceId_;
  std::string currentDeviceName_;
  DeviceInfo::Flow currentFlow_ = DeviceInfo::Flow::Capture;
  std::atomic<bool> running_{false};
  std::atomic<bool> contextReady_{false};

  // Device list synchronization
  std::vector<DeviceInfo> deviceList_;
  std::mutex deviceListMutex_;
  std::condition_variable deviceListCond_;
  bool deviceListReady_ = false;

  BandPlan plan_{};
  BinMap binmap_{};
  int sampleRate_ = 0;
  FloatRingBuffer sampleBuf_{4096*4};
  TripleBuffer<uint8_t> specBuf_{256};
  FftCallback cb_;
  VuCallback vuCb_;
  WaveCallback waveCb_;

  // Audio format
  int nChannels_ = 0;
  bool isFloat_ = false;

  // Output shaping
  float masterGain_ = 1.0f;
  float tiltExp_ = 0.35f;
  bool clampUnit_ = true;
  bool loopback_ = true;

  // kissfft state
  struct Kiss;
  Kiss* kiss_ = nullptr;

  std::vector<float> waveformBuf_;
  std::mutex waveformMutex_;

  // VU meter state
  std::vector<std::vector<float>> vuBufs_;
  std::mutex vuMutex_;

  // Timing for periodic callbacks
  std::thread publishThread_;
  std::atomic<bool> publishRunning_{false};
  void publishLoop();
};
