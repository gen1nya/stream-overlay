#pragma once
#include <functional>
#include <string>
#include <vector>
#include <cstdint>

// Cross-platform device info structure
struct DeviceInfo {
  std::string id;
  std::string name;
  enum class Flow { Render, Capture };
  Flow flow;
};

// Abstract audio engine interface
class AudioEngine {
public:
  // Callback types
  using FftCallback = std::function<void(const std::vector<uint8_t>&)>;
  using WaveCallback = std::function<void(const std::vector<int16_t>&)>;
  using VuCallback = std::function<void(const std::vector<uint8_t>&)>;

  virtual ~AudioEngine() = default;

  // Device management
  virtual std::vector<DeviceInfo> listDevices() = 0;
  virtual bool setDevice(const std::string& deviceId) = 0;
  virtual DeviceInfo currentDevice() = 0;

  // FFT configuration
  virtual void setFftSize(int fft) = 0;
  virtual void setHopSize(int hop) = 0;
  virtual void setColumns(int columns) = 0;
  virtual void setDbFloor(float db) = 0;
  virtual void setMasterGain(float g) = 0;
  virtual void setTilt(float exp) = 0;

  // Audio capture configuration
  virtual void setLoopback(bool on) = 0;
  virtual void enable(bool on) = 0;

  // Callbacks
  virtual void setCallback(FftCallback cb) = 0;
  virtual void setWaveCallback(WaveCallback cb) = 0;
  virtual void setVuCallback(VuCallback cb) = 0;
};
