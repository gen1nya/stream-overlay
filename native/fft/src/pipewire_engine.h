#pragma once

#include "audio_engine.h"
#include "fft_bands.h"
#include "ringbuffers.h"
#include <pipewire/pipewire.h>
#include <spa/param/audio/format-utils.h>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <atomic>
#include <vector>
#include <map>
#include <functional>

class PipeWireEngine : public AudioEngine {
public:
  PipeWireEngine();
  ~PipeWireEngine() override;

  std::vector<DeviceInfo> listDevices() override;
  bool setDevice(const std::string& deviceId) override;
  DeviceInfo currentDevice() override;

  void setFftSize(int fft) override;
  void setHopSize(int hop) override;
  void setColumns(int c) override;
  void setDbFloor(float db) override;
  void setMasterGain(float g) override;
  void setTilt(float exp) override;
  void setLoopback(bool on) override;

  void setCallback(FftCallback cb) override;
  void setWaveCallback(WaveCallback cb) override;
  void setVuCallback(VuCallback cb) override;

  void enable(bool on) override;

  // PipeWire callbacks (must be public for C struct initialization)
  static void onRegistryGlobal(void* data, uint32_t id, uint32_t permissions,
                                const char* type, uint32_t version, const struct spa_dict* props);
  static void onRegistryGlobalRemove(void* data, uint32_t id);
  static void onStreamStateChanged(void* data, enum pw_stream_state old,
                                    enum pw_stream_state state, const char* error);
  static void onStreamProcess(void* data);

private:
  struct Kiss;

  void start();
  void stop();
  void publishLoop();
  void processAudioData(const float* data, size_t numFrames);
  void publishWaveform();
  void computeAndPublishVu();
  void computeFftAndPublish(const float* frame);

  // PipeWire state
  bool loopRunning_ = false;
  struct pw_thread_loop* loop_ = nullptr;
  struct pw_context* context_ = nullptr;
  struct pw_core* core_ = nullptr;
  struct pw_registry* registry_ = nullptr;
  struct pw_stream* stream_ = nullptr;

  struct spa_hook registryListener_;
  struct spa_hook streamListener_;

  std::atomic<bool> coreReady_{false};
  std::atomic<bool> running_{false};
  std::atomic<bool> publishRunning_{false};

  // Device management
  std::vector<DeviceInfo> deviceList_;
  std::map<std::string, DeviceInfo> deviceMap_;  // deviceId -> DeviceInfo
  std::mutex deviceListMutex_;
  std::string currentDeviceId_;
  std::string currentDeviceName_;
  DeviceInfo::Flow currentFlow_ = DeviceInfo::Flow::Capture;
  bool loopback_ = false;

  // Audio parameters
  int sampleRate_ = 48000;
  int nChannels_ = 2;
  bool isFloat_ = true;

  // FFT state
  BandPlan plan_;
  BinMap binmap_;
  Kiss* kiss_ = nullptr;
  FloatRingBuffer sampleBuf_{4096*4};
  TripleBuffer<uint8_t> specBuf_{256};
  bool clampUnit_ = true;
  float masterGain_ = 1.0f;
  float tiltExp_ = 0.0f;

  // Waveform & VU
  std::vector<float> waveformBuf_;
  std::mutex waveformMutex_;
  std::vector<std::vector<float>> vuBufs_;
  std::mutex vuMutex_;

  // Publish thread
  std::thread publishThread_;

  // Callbacks
  FftCallback cb_;
  WaveCallback waveCb_;
  VuCallback vuCb_;
};
