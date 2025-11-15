#include "pulse_engine.h"
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

struct PulseAudioEngine::Kiss {
  kiss_fftr_cfg cfg = nullptr;
  std::vector<float> in;
  std::vector<kiss_fft_cpx> out;
};

PulseAudioEngine::PulseAudioEngine() {
  // Initialize PulseAudio threaded mainloop
  mainloop_ = pa_threaded_mainloop_new();
  if (!mainloop_) {
    throw std::runtime_error("Failed to create PulseAudio mainloop");
  }

  pa_threaded_mainloop_lock(mainloop_);

  pa_mainloop_api* mlapi = pa_threaded_mainloop_get_api(mainloop_);
  context_ = pa_context_new(mlapi, "FFT Audio Analyzer");
  if (!context_) {
    pa_threaded_mainloop_unlock(mainloop_);
    throw std::runtime_error("Failed to create PulseAudio context");
  }

  pa_context_set_state_callback(context_, contextStateCallback, this);

  if (pa_context_connect(context_, nullptr, PA_CONTEXT_NOFLAGS, nullptr) < 0) {
    pa_threaded_mainloop_unlock(mainloop_);
    throw std::runtime_error("Failed to connect to PulseAudio server");
  }

  if (pa_threaded_mainloop_start(mainloop_) < 0) {
    pa_threaded_mainloop_unlock(mainloop_);
    throw std::runtime_error("Failed to start PulseAudio mainloop");
  }

  pa_threaded_mainloop_unlock(mainloop_);

  // Don't wait in constructor - let PulseAudio connect asynchronously
  // Operations will check contextReady_ before executing
  std::cerr << "PulseAudio engine created, waiting for context to become ready..." << std::endl;
}

PulseAudioEngine::~PulseAudioEngine() {
  enable(false);

  if (mainloop_) {
    pa_threaded_mainloop_stop(mainloop_);
  }

  if (context_) {
    pa_context_disconnect(context_);
    pa_context_unref(context_);
  }

  if (mainloop_) {
    pa_threaded_mainloop_free(mainloop_);
  }
}

void PulseAudioEngine::contextStateCallback(pa_context* c, void* userdata) {
  auto* engine = static_cast<PulseAudioEngine*>(userdata);
  pa_context_state_t state = pa_context_get_state(c);

  switch (state) {
    case PA_CONTEXT_READY:
      engine->contextReady_ = true;
      pa_threaded_mainloop_signal(engine->mainloop_, 0);
      break;
    case PA_CONTEXT_FAILED:
    case PA_CONTEXT_TERMINATED:
      engine->contextReady_ = false;
      pa_threaded_mainloop_signal(engine->mainloop_, 0);
      break;
    default:
      break;
  }
}

void PulseAudioEngine::sinkInfoCallback(pa_context* c, const pa_sink_info* info, int eol, void* userdata) {
  auto* engine = static_cast<PulseAudioEngine*>(userdata);

  if (eol > 0) {
    std::lock_guard<std::mutex> lock(engine->deviceListMutex_);
    engine->deviceListReady_ = true;
    engine->deviceListCond_.notify_one();
    return;
  }

  if (info) {
    DeviceInfo di;
    // For sinks, we use monitor source name for loopback capture
    di.id = info->monitor_source_name ? std::string(info->monitor_source_name) : std::string(info->name);
    di.name = info->description ? std::string(info->description) : std::string(info->name);
    di.flow = DeviceInfo::Flow::Render;

    std::lock_guard<std::mutex> lock(engine->deviceListMutex_);
    engine->deviceList_.push_back(di);
  }
}

void PulseAudioEngine::sourceInfoCallback(pa_context* c, const pa_source_info* info, int eol, void* userdata) {
  auto* engine = static_cast<PulseAudioEngine*>(userdata);

  if (eol > 0) {
    std::lock_guard<std::mutex> lock(engine->deviceListMutex_);
    engine->deviceListReady_ = true;
    engine->deviceListCond_.notify_one();
    return;
  }

  if (info) {
    DeviceInfo di;
    di.id = std::string(info->name);
    di.name = info->description ? std::string(info->description) : std::string(info->name);
    di.flow = DeviceInfo::Flow::Capture;

    std::lock_guard<std::mutex> lock(engine->deviceListMutex_);
    engine->deviceList_.push_back(di);
  }
}

std::vector<DeviceInfo> PulseAudioEngine::listDevices() {
  if (!contextReady_) {
    std::cerr << "PulseAudio context not ready" << std::endl;
    return {};
  }

  pa_threaded_mainloop_lock(mainloop_);

  {
    std::lock_guard<std::mutex> lock(deviceListMutex_);
    deviceList_.clear();
    deviceListReady_ = false;
  }

  // Get sinks (output devices) - for loopback
  pa_operation* op = pa_context_get_sink_info_list(context_, sinkInfoCallback, this);

  if (op) {
    // Wait for operation to complete with timeout
    int iterations = 0;
    while (pa_operation_get_state(op) == PA_OPERATION_RUNNING && iterations < 100) {
      pa_threaded_mainloop_wait(mainloop_);
      iterations++;
    }
    pa_operation_unref(op);
  } else {
    std::cerr << "Failed to get sink info list" << std::endl;
  }

  {
    std::lock_guard<std::mutex> lock(deviceListMutex_);
    deviceListReady_ = false;
  }

  // Get sources (input devices)
  op = pa_context_get_source_info_list(context_, sourceInfoCallback, this);

  if (op) {
    int iterations = 0;
    while (pa_operation_get_state(op) == PA_OPERATION_RUNNING && iterations < 100) {
      pa_threaded_mainloop_wait(mainloop_);
      iterations++;
    }
    pa_operation_unref(op);
  } else {
    std::cerr << "Failed to get source info list" << std::endl;
  }

  pa_threaded_mainloop_unlock(mainloop_);

  std::lock_guard<std::mutex> lock(deviceListMutex_);
  return deviceList_;
}

bool PulseAudioEngine::setDevice(const std::string& deviceId) {
  if (running_) {
    stop();
  }

  currentDeviceId_ = deviceId;

  // Determine if this is a monitor source (loopback) or regular source
  // Monitor sources typically have ".monitor" suffix
  if (deviceId.find(".monitor") != std::string::npos) {
    currentFlow_ = DeviceInfo::Flow::Render;
  } else {
    currentFlow_ = DeviceInfo::Flow::Capture;
  }

  return true;
}

DeviceInfo PulseAudioEngine::currentDevice() {
  DeviceInfo di;
  di.id = currentDeviceId_;
  di.name = currentDeviceName_;
  di.flow = currentFlow_;
  return di;
}

void PulseAudioEngine::setFftSize(int fft) { plan_.fftSize = fft; }
void PulseAudioEngine::setHopSize(int hop) { plan_.hopSize = hop; }
void PulseAudioEngine::setColumns(int c) {
  plan_.columns = std::max(1, std::min(c, 256));
  if (sampleRate_ > 0) {
    binmap_ = makeBinMap(sampleRate_, plan_.fftSize, plan_.columns);
  }
}
void PulseAudioEngine::setDbFloor(float db) { plan_.dbFloor = db; }
void PulseAudioEngine::setMasterGain(float g) { masterGain_ = g; }
void PulseAudioEngine::setTilt(float exp) { tiltExp_ = exp; }
void PulseAudioEngine::setLoopback(bool on) { loopback_ = on; }
void PulseAudioEngine::setCallback(FftCallback cb) { cb_ = std::move(cb); }
void PulseAudioEngine::setWaveCallback(WaveCallback cb) { waveCb_ = std::move(cb); }
void PulseAudioEngine::setVuCallback(VuCallback cb) { vuCb_ = std::move(cb); }

void PulseAudioEngine::enable(bool on) {
  if (on) {
    start();
  } else {
    stop();
  }
}

void PulseAudioEngine::streamStateCallback(pa_stream* s, void* userdata) {
  auto* engine = static_cast<PulseAudioEngine*>(userdata);
  pa_stream_state_t state = pa_stream_get_state(s);

  switch (state) {
    case PA_STREAM_READY:
      pa_threaded_mainloop_signal(engine->mainloop_, 0);
      break;
    case PA_STREAM_FAILED:
    case PA_STREAM_TERMINATED:
      pa_threaded_mainloop_signal(engine->mainloop_, 0);
      break;
    default:
      break;
  }
}

void PulseAudioEngine::streamReadCallback(pa_stream* s, size_t nbytes, void* userdata) {
  auto* engine = static_cast<PulseAudioEngine*>(userdata);
  const void* data;
  size_t bytes;

  while (pa_stream_readable_size(s) > 0) {
    if (pa_stream_peek(s, &data, &bytes) < 0) {
      std::cerr << "pa_stream_peek() failed" << std::endl;
      return;
    }

    if (data && bytes > 0) {
      engine->processAudioData(data, bytes);
    }

    pa_stream_drop(s);
  }
}

void PulseAudioEngine::start() {
  if (running_ || !contextReady_) return;

  if (currentDeviceId_.empty()) {
    // Use default source
    currentDeviceId_ = "@DEFAULT_SOURCE@";
  }

  pa_threaded_mainloop_lock(mainloop_);

  // Setup sample spec
  pa_sample_spec ss;
  ss.format = PA_SAMPLE_FLOAT32LE;  // Use float32 for easier processing
  ss.channels = 2;  // Stereo
  ss.rate = 48000;  // 48kHz sample rate

  sampleRate_ = ss.rate;
  nChannels_ = ss.channels;
  isFloat_ = true;

  // Create stream
  stream_ = pa_stream_new(context_, "Audio Capture", &ss, nullptr);
  if (!stream_) {
    pa_threaded_mainloop_unlock(mainloop_);
    throw std::runtime_error("Failed to create PulseAudio stream");
  }

  pa_stream_set_state_callback(stream_, streamStateCallback, this);
  pa_stream_set_read_callback(stream_, streamReadCallback, this);

  // Buffer attributes
  pa_buffer_attr attr;
  attr.maxlength = (uint32_t) -1;
  attr.fragsize = pa_usec_to_bytes(10000, &ss);  // 10ms fragments
  attr.minreq = (uint32_t) -1;
  attr.prebuf = (uint32_t) -1;
  attr.tlength = (uint32_t) -1;

  // Connect stream
  const char* dev = (currentDeviceId_ == "@DEFAULT_SOURCE@") ? nullptr : currentDeviceId_.c_str();
  pa_stream_flags_t flags = (pa_stream_flags_t)(PA_STREAM_ADJUST_LATENCY);

  if (pa_stream_connect_record(stream_, dev, &attr, flags) < 0) {
    pa_stream_unref(stream_);
    stream_ = nullptr;
    pa_threaded_mainloop_unlock(mainloop_);
    throw std::runtime_error("Failed to connect PulseAudio stream");
  }

  // Wait for stream to be ready
  pa_stream_state_t state;
  do {
    pa_threaded_mainloop_wait(mainloop_);
    state = pa_stream_get_state(stream_);
  } while (state != PA_STREAM_READY && state != PA_STREAM_FAILED && state != PA_STREAM_TERMINATED);

  if (state != PA_STREAM_READY) {
    pa_stream_unref(stream_);
    stream_ = nullptr;
    pa_threaded_mainloop_unlock(mainloop_);
    throw std::runtime_error("Stream failed to become ready");
  }

  pa_threaded_mainloop_unlock(mainloop_);

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
  publishThread_ = std::thread(&PulseAudioEngine::publishLoop, this);
}

void PulseAudioEngine::stop() {
  if (!running_) return;

  running_ = false;

  // Stop publish thread
  if (publishRunning_) {
    publishRunning_ = false;
    if (publishThread_.joinable()) {
      publishThread_.join();
    }
  }

  pa_threaded_mainloop_lock(mainloop_);

  if (stream_) {
    pa_stream_disconnect(stream_);
    pa_stream_unref(stream_);
    stream_ = nullptr;
  }

  pa_threaded_mainloop_unlock(mainloop_);

  // Clean up FFT
  if (kiss_) {
    kiss_fft_free(kiss_->cfg);
    delete kiss_;
    kiss_ = nullptr;
  }
}

void PulseAudioEngine::publishLoop() {
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

void PulseAudioEngine::processAudioData(const void* data, size_t bytes) {
  if (!running_ || !data || bytes == 0) return;

  const float* samples = static_cast<const float*>(data);
  size_t numFrames = bytes / (nChannels_ * sizeof(float));

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

void PulseAudioEngine::publishWaveform() {
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

void PulseAudioEngine::computeAndPublishVu() {
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

void PulseAudioEngine::computeFftAndPublish(const float* frame) {
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
