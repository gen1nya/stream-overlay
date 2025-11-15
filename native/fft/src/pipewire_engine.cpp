#include "pipewire_engine.h"
#include <iostream>
#include <stdexcept>
#include <cmath>
#include <cstring>
#include <chrono>
#include <algorithm>

#define _USE_MATH_DEFINES
constexpr double kPI = 3.14159265358979323846;

extern "C" {
  #include "kiss_fftr.h"
}

struct PipeWireEngine::Kiss {
  kiss_fftr_cfg cfg = nullptr;
  std::vector<float> in;
  std::vector<kiss_fft_cpx> out;
};

PipeWireEngine::PipeWireEngine() {
  // Initialize PipeWire
  pw_init(nullptr, nullptr);

  // Create threaded loop
  loop_ = pw_thread_loop_new("FFT Audio", nullptr);
  if (!loop_) {
    throw std::runtime_error("Failed to create PipeWire thread loop");
  }

  // Create context
  context_ = pw_context_new(pw_thread_loop_get_loop(loop_), nullptr, 0);
  if (!context_) {
    pw_thread_loop_destroy(loop_);
    throw std::runtime_error("Failed to create PipeWire context");
  }

  // Start the loop
  if (pw_thread_loop_start(loop_) < 0) {
    pw_context_destroy(context_);
    pw_thread_loop_destroy(loop_);
    throw std::runtime_error("Failed to start PipeWire thread loop");
  }

  pw_thread_loop_lock(loop_);

  // Create core
  core_ = pw_context_connect(context_, nullptr, 0);
  if (!core_) {
    pw_thread_loop_unlock(loop_);
    pw_thread_loop_stop(loop_);
    pw_context_destroy(context_);
    pw_thread_loop_destroy(loop_);
    throw std::runtime_error("Failed to connect to PipeWire");
  }

  coreReady_ = true;
  std::cerr << "PipeWire engine initialized successfully" << std::endl;

  pw_thread_loop_unlock(loop_);
}

PipeWireEngine::~PipeWireEngine() {
  enable(false);

  if (loop_) {
    pw_thread_loop_stop(loop_);
  }

  if (core_) {
    pw_core_disconnect(core_);
  }

  if (context_) {
    pw_context_destroy(context_);
  }

  if (loop_) {
    pw_thread_loop_destroy(loop_);
  }

  pw_deinit();
}

static const struct pw_registry_events registryEvents = {
  PW_VERSION_REGISTRY_EVENTS,
  .global = PipeWireEngine::onRegistryGlobal,
  .global_remove = PipeWireEngine::onRegistryGlobalRemove,
};

void PipeWireEngine::onRegistryGlobal(void* data, uint32_t id, uint32_t permissions,
                                       const char* type, uint32_t version,
                                       const struct spa_dict* props) {
  auto* engine = static_cast<PipeWireEngine*>(data);

  if (std::strcmp(type, PW_TYPE_INTERFACE_Node) != 0) {
    return;
  }

  const char* mediaClass = spa_dict_lookup(props, PW_KEY_MEDIA_CLASS);
  const char* nodeName = spa_dict_lookup(props, PW_KEY_NODE_NAME);
  const char* nodeDesc = spa_dict_lookup(props, PW_KEY_NODE_DESCRIPTION);

  if (!mediaClass || !nodeName) {
    return;
  }

  DeviceInfo di;
  di.id = nodeName;
  di.name = nodeDesc ? nodeDesc : nodeName;

  // Determine device type
  if (std::strcmp(mediaClass, "Audio/Source") == 0) {
    di.flow = DeviceInfo::Flow::Capture;
    std::lock_guard<std::mutex> lock(engine->deviceListMutex_);
    engine->deviceList_.push_back(di);
    engine->deviceMap_[di.id] = di;
  } else if (std::strcmp(mediaClass, "Audio/Sink") == 0) {
    di.flow = DeviceInfo::Flow::Render;
    std::lock_guard<std::mutex> lock(engine->deviceListMutex_);
    engine->deviceList_.push_back(di);
    engine->deviceMap_[di.id] = di;
  }
}

void PipeWireEngine::onRegistryGlobalRemove(void* data, uint32_t id) {
  // Device removed - we could handle this but for now just ignore
}

std::vector<DeviceInfo> PipeWireEngine::listDevices() {
  if (!coreReady_) {
    std::cerr << "PipeWire core not ready" << std::endl;
    return {};
  }

  pw_thread_loop_lock(loop_);

  {
    std::lock_guard<std::mutex> lock(deviceListMutex_);
    deviceList_.clear();
    deviceMap_.clear();
  }

  // Create registry to enumerate devices
  registry_ = pw_core_get_registry(core_, PW_VERSION_REGISTRY, 0);
  if (!registry_) {
    pw_thread_loop_unlock(loop_);
    std::cerr << "Failed to get PipeWire registry" << std::endl;
    return {};
  }

  pw_registry_add_listener(registry_, &registryListener_, &registryEvents, this);

  // Wait a bit for the registry to populate
  // PipeWire is async, so we need to give it time to enumerate
  pw_thread_loop_unlock(loop_);
  std::this_thread::sleep_for(std::chrono::milliseconds(100));
  pw_thread_loop_lock(loop_);

  // Clean up registry
  pw_proxy_destroy(reinterpret_cast<struct pw_proxy*>(registry_));
  registry_ = nullptr;

  pw_thread_loop_unlock(loop_);

  std::lock_guard<std::mutex> lock(deviceListMutex_);
  return deviceList_;
}

bool PipeWireEngine::setDevice(const std::string& deviceId) {
  if (running_) {
    stop();
  }

  currentDeviceId_ = deviceId;

  // Find device info in map to determine flow
  {
    std::lock_guard<std::mutex> lock(deviceListMutex_);
    auto it = deviceMap_.find(deviceId);
    if (it != deviceMap_.end()) {
      currentFlow_ = it->second.flow;
      currentDeviceName_ = it->second.name;
    }
  }

  return true;
}

DeviceInfo PipeWireEngine::currentDevice() {
  DeviceInfo di;
  di.id = currentDeviceId_;
  di.name = currentDeviceName_;
  di.flow = currentFlow_;
  return di;
}

void PipeWireEngine::setFftSize(int fft) { plan_.fftSize = fft; }
void PipeWireEngine::setHopSize(int hop) { plan_.hopSize = hop; }
void PipeWireEngine::setColumns(int c) {
  plan_.columns = std::max(1, std::min(c, 256));
  if (sampleRate_ > 0) {
    binmap_ = makeBinMap(sampleRate_, plan_.fftSize, plan_.columns);
  }
}
void PipeWireEngine::setDbFloor(float db) { plan_.dbFloor = db; }
void PipeWireEngine::setMasterGain(float g) { masterGain_ = g; }
void PipeWireEngine::setTilt(float exp) { tiltExp_ = exp; }
void PipeWireEngine::setLoopback(bool on) { loopback_ = on; }
void PipeWireEngine::setCallback(FftCallback cb) { cb_ = std::move(cb); }
void PipeWireEngine::setWaveCallback(WaveCallback cb) { waveCb_ = std::move(cb); }
void PipeWireEngine::setVuCallback(VuCallback cb) { vuCb_ = std::move(cb); }

void PipeWireEngine::enable(bool on) {
  if (on) {
    start();
  } else {
    stop();
  }
}

static const struct pw_stream_events streamEvents = {
  PW_VERSION_STREAM_EVENTS,
  .state_changed = PipeWireEngine::onStreamStateChanged,
  .process = PipeWireEngine::onStreamProcess,
};

void PipeWireEngine::onStreamStateChanged(void* data, enum pw_stream_state old,
                                           enum pw_stream_state state, const char* error) {
  auto* engine = static_cast<PipeWireEngine*>(data);

  std::cerr << "Stream state changed: " << pw_stream_state_as_string(state);
  if (error) {
    std::cerr << " (error: " << error << ")";
  }
  std::cerr << std::endl;

  if (state == PW_STREAM_STATE_ERROR) {
    engine->running_ = false;
  }
}

void PipeWireEngine::onStreamProcess(void* data) {
  auto* engine = static_cast<PipeWireEngine*>(data);

  struct pw_buffer* buf = pw_stream_dequeue_buffer(engine->stream_);
  if (!buf) {
    return;
  }

  struct spa_buffer* spaBuf = buf->buffer;
  struct spa_data* d = &spaBuf->datas[0];

  if (d->data && d->chunk->size > 0) {
    const float* samples = static_cast<const float*>(d->data);
    size_t numFrames = d->chunk->size / (engine->nChannels_ * sizeof(float));
    engine->processAudioData(samples, numFrames);
  }

  pw_stream_queue_buffer(engine->stream_, buf);
}

void PipeWireEngine::start() {
  if (running_ || !coreReady_) return;

  pw_thread_loop_lock(loop_);

  // Create audio stream
  const struct spa_pod* params[1];
  uint8_t buffer[1024];
  struct spa_pod_builder b = SPA_POD_BUILDER_INIT(buffer, sizeof(buffer));

  // Setup audio format
  struct spa_audio_info_raw audioInfo = {};
  audioInfo.format = SPA_AUDIO_FORMAT_F32;
  audioInfo.channels = 2;
  audioInfo.rate = 48000;

  sampleRate_ = audioInfo.rate;
  nChannels_ = audioInfo.channels;
  isFloat_ = true;

  params[0] = spa_format_audio_raw_build(&b, SPA_PARAM_EnumFormat, &audioInfo);

  // Create stream properties
  struct pw_properties* props = pw_properties_new(
    PW_KEY_MEDIA_TYPE, "Audio",
    PW_KEY_MEDIA_CATEGORY, "Capture",
    PW_KEY_MEDIA_ROLE, "Music",
    nullptr
  );

  // For render devices (sinks), use stream.capture.sink property to capture output
  // For capture devices (sources), use normal target
  if (!currentDeviceId_.empty()) {
    if (currentFlow_ == DeviceInfo::Flow::Render) {
      // Capture from sink output (loopback)
      pw_properties_set(props, "stream.capture.sink", "true");
      pw_properties_set(props, PW_KEY_TARGET_OBJECT, currentDeviceId_.c_str());
      std::cerr << "Loopback capture from sink: " << currentDeviceId_ << std::endl;
    } else {
      // Normal capture from source
      pw_properties_set(props, PW_KEY_TARGET_OBJECT, currentDeviceId_.c_str());
      std::cerr << "Capturing from source: " << currentDeviceId_ << std::endl;
    }
  } else {
    std::cerr << "Capturing from default device" << std::endl;
  }

  stream_ = pw_stream_new(core_, "FFT Audio Capture", props);
  if (!stream_) {
    pw_thread_loop_unlock(loop_);
    throw std::runtime_error("Failed to create PipeWire stream");
  }

  pw_stream_add_listener(stream_, &streamListener_, &streamEvents, this);

  // Connect stream
  enum pw_stream_flags flags = (enum pw_stream_flags)(
    PW_STREAM_FLAG_AUTOCONNECT |
    PW_STREAM_FLAG_MAP_BUFFERS |
    PW_STREAM_FLAG_RT_PROCESS
  );

  if (pw_stream_connect(stream_,
                        PW_DIRECTION_INPUT,
                        PW_ID_ANY,
                        flags,
                        params, 1) < 0) {
    pw_stream_destroy(stream_);
    stream_ = nullptr;
    pw_thread_loop_unlock(loop_);
    throw std::runtime_error("Failed to connect PipeWire stream");
  }

  pw_thread_loop_unlock(loop_);

  // Initialize FFT
  binmap_ = makeBinMap(sampleRate_, plan_.fftSize, plan_.columns);
  kiss_ = new Kiss();
  kiss_->in.resize(plan_.fftSize);
  kiss_->out.resize(plan_.fftSize / 2 + 1);
  kiss_->cfg = kiss_fftr_alloc(plan_.fftSize, 0, nullptr, nullptr);

  // Initialize buffers
  waveformBuf_.clear();
  waveformBuf_.reserve(2048);

  vuBufs_.clear();
  vuBufs_.resize(nChannels_);
  for (auto& buf : vuBufs_) {
    buf.reserve(4096);
  }

  running_ = true;

  // Start publish thread for periodic callbacks (60Hz)
  publishRunning_ = true;
  publishThread_ = std::thread(&PipeWireEngine::publishLoop, this);

  std::cerr << "PipeWire stream started" << std::endl;
}

void PipeWireEngine::stop() {
  if (!running_) return;

  running_ = false;

  // Stop publish thread first
  if (publishRunning_) {
    publishRunning_ = false;
    if (publishThread_.joinable()) {
      publishThread_.join();
    }
  }

  // Lock and destroy stream
  if (loop_) {
    pw_thread_loop_lock(loop_);
  }

  if (stream_) {
    pw_stream_disconnect(stream_);
    pw_stream_destroy(stream_);
    stream_ = nullptr;
  }

  if (loop_) {
    pw_thread_loop_unlock(loop_);
  }

  // Clean up FFT
  if (kiss_) {
    kiss_fft_free(kiss_->cfg);
    delete kiss_;
    kiss_ = nullptr;
  }

  std::cerr << "PipeWire stream stopped" << std::endl;
}

void PipeWireEngine::publishLoop() {
  const double publishInterval = 1.0 / 60.0;  // 60 Hz

  while (publishRunning_) {
    auto start = std::chrono::high_resolution_clock::now();

    publishWaveform();
    computeAndPublishVu();

    auto end = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> elapsed = end - start;

    double sleepTime = publishInterval - elapsed.count();
    if (sleepTime > 0) {
      std::this_thread::sleep_for(std::chrono::duration<double>(sleepTime));
    }
  }
}

void PipeWireEngine::processAudioData(const float* data, size_t numFrames) {
  if (!running_ || !data || numFrames == 0) return;

  const float* samples = data;
  std::vector<float> hop(plan_.hopSize);
  static size_t hopFill = 0;

  for (size_t i = 0; i < numFrames; ++i) {
    // Take left channel (mono for FFT)
    float sample = samples[i * nChannels_];

    // Add to hop buffer
    hop[hopFill++] = sample;

    // Add to waveform buffer
    {
      std::lock_guard<std::mutex> lock(waveformMutex_);
      waveformBuf_.push_back(sample);
      if (waveformBuf_.size() > 2048) {
        waveformBuf_.erase(waveformBuf_.begin(), waveformBuf_.begin() + (waveformBuf_.size() - 2048));
      }
    }

    // Add to VU buffers (all channels)
    {
      std::lock_guard<std::mutex> lock(vuMutex_);
      for (int ch = 0; ch < nChannels_; ++ch) {
        float chSample = samples[i * nChannels_ + ch];
        vuBufs_[ch].push_back(chSample);
        if (vuBufs_[ch].size() > 4096) {
          vuBufs_[ch].erase(vuBufs_[ch].begin());
        }
      }
    }

    // Process hop when full
    if (hopFill == (size_t)plan_.hopSize) {
      sampleBuf_.write(hop.data(), plan_.hopSize);
      hopFill = 0;

      if (sampleBuf_.count() >= (size_t)plan_.fftSize) {
        std::vector<float> frame(plan_.fftSize);
        sampleBuf_.readLatest(frame.data(), frame.size());
        computeFftAndPublish(frame.data());
      }
    }
  }
}

void PipeWireEngine::publishWaveform() {
  if (!waveCb_) return;

  std::vector<float> waveSamples;
  {
    std::lock_guard<std::mutex> lock(waveformMutex_);
    if (waveformBuf_.size() < 2048) return;
    waveSamples = waveformBuf_;
  }

  // Downsample 2048 -> 1024
  std::vector<int16_t> downsampled(1024);
  for (int i = 0; i < 1024; ++i) {
    float sample = waveSamples[i * 2];
    int32_t val = static_cast<int32_t>(sample * 32767.0f * masterGain_);
    val = std::max(-32768, std::min(32767, val));
    downsampled[i] = static_cast<int16_t>(val);
  }

  waveCb_(downsampled);
}

void PipeWireEngine::computeAndPublishVu() {
  if (!vuCb_ || nChannels_ == 0) return;

  std::vector<float> channelSamples[8];
  {
    std::lock_guard<std::mutex> lock(vuMutex_);
    for (int ch = 0; ch < nChannels_ && ch < 8; ++ch) {
      if (vuBufs_[ch].empty()) return;
      channelSamples[ch] = vuBufs_[ch];
    }
  }

  std::vector<uint8_t> vuLevels(nChannels_);

  for (int ch = 0; ch < nChannels_; ++ch) {
    const auto& samples = channelSamples[ch];
    if (samples.empty()) {
      vuLevels[ch] = 0;
      continue;
    }

    size_t n = std::min<size_t>(1024, samples.size());
    size_t start = samples.size() - n;

    double sumSquares = 0.0;
    for (size_t i = start; i < samples.size(); ++i) {
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

void PipeWireEngine::computeFftAndPublish(const float* frame) {
  // Apply Hamming window
  for (int i = 0; i < plan_.fftSize; ++i) {
    float w = 0.54f - 0.46f * std::cos(2.0 * kPI * i / (plan_.fftSize - 1));
    kiss_->in[i] = frame[i] * w;
  }

  kiss_fftr(kiss_->cfg, kiss_->in.data(), kiss_->out.data());

  auto& out = specBuf_.writeBuf();
  out.resize(plan_.columns);
  const float dbFloor = plan_.dbFloor;

  for (int b = 0; b < plan_.columns; ++b) {
    double sum = 0;
    int cnt = 0;
    for (int j = binmap_.start[b]; j < binmap_.end[b]; ++j, ++cnt) {
      double re = kiss_->out[j].r;
      double im = kiss_->out[j].i;
      const double ampScale = 2.0 / double(plan_.fftSize);
      sum += std::sqrt(re * re + im * im) * ampScale;
    }
    double lin = cnt > 0 ? sum / cnt : 0.0;
    double db = 20.0 * std::log10(lin + 1e-20);

    double clamped = std::max(db, (double)dbFloor);
    double norm = double(b + 10) / double(plan_.columns + 10);
    double gain = std::pow(norm, (double)tiltExp_);
    float v = float(((clamped - dbFloor) / -dbFloor) * gain * masterGain_);
    if (clampUnit_) v = std::max(0.0f, std::min(1.0f, v));

    out[b] = static_cast<uint8_t>(std::round(v * 255.0f));
  }

  specBuf_.publish();
  if (cb_) cb_(specBuf_.readBuf());
}
