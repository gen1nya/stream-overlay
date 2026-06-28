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
  // Fired when capture init/streaming fails (code = platform error code, e.g. an
  // HRESULT on Windows; message includes a human-readable name).
  using ErrorCallback = std::function<void(int code, const std::string& message)>;

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
  // Follow the system default render endpoint and auto-switch capture when it
  // changes. Optional — engines that don't support it keep the default no-op.
  virtual void setFollowDefault(bool) {}

  // Callbacks
  virtual void setCallback(FftCallback cb) = 0;
  virtual void setWaveCallback(WaveCallback cb) = 0;
  virtual void setVuCallback(VuCallback cb) = 0;
  // Optional — engines that don't report errors keep the default no-op.
  virtual void setErrorCallback(ErrorCallback) {}
};
