#ifndef MOCK_ENGINE_H
#define MOCK_ENGINE_H

#include "audio_engine.h"
#include <vector>
#include <string>
#include <cmath>
#include <random>
#include <iostream>
#include <thread>
#include <chrono>

class MockEngine : public AudioEngine {
public:
    MockEngine() : deviceId_("mock-device"), running_(false) {
        std::cout << "[MockEngine] Initialized (macOS mock)" << std::endl;
    }

    ~MockEngine() override {
        enable(false);
    }

    std::vector<DeviceInfo> listDevices() override {
        std::vector<DeviceInfo> devices;

        // Mock system audio output device
        DeviceInfo output;
        output.id = "mock-output-1";
        output.name = "Mock System Audio (macOS)";
        output.flow = DeviceInfo::Flow::Render;
        devices.push_back(output);

        // Mock microphone input device
        DeviceInfo input;
        input.id = "mock-input-1";
        input.name = "Mock Built-in Microphone (macOS)";
        input.flow = DeviceInfo::Flow::Capture;
        devices.push_back(input);

        return devices;
    }

    bool setDevice(const std::string& id) override {
        std::cout << "[MockEngine] setDevice: " << id << std::endl;
        deviceId_ = id;
        return true;
    }

    DeviceInfo currentDevice() override {
        DeviceInfo info;
        info.id = deviceId_;
        info.name = "Mock Device (macOS)";
        info.flow = DeviceInfo::Flow::Render;
        return info;
    }

    void setFftSize(int fft) override {
        std::cout << "[MockEngine] setFftSize: " << fft << std::endl;
        fftSize_ = fft;
    }

    void setHopSize(int hop) override {
        std::cout << "[MockEngine] setHopSize: " << hop << std::endl;
        hopSize_ = hop;
    }

    void setColumns(int c) override {
        std::cout << "[MockEngine] setColumns: " << c << std::endl;
        columns_ = c;
    }

    void setDbFloor(float db) override {
        std::cout << "[MockEngine] setDbFloor: " << db << std::endl;
        dbFloor_ = db;
    }

    void setMasterGain(float g) override {
        std::cout << "[MockEngine] setMasterGain: " << g << std::endl;
        masterGain_ = g;
    }

    void setTilt(float exp) override {
        std::cout << "[MockEngine] setTilt: " << exp << std::endl;
        tilt_ = exp;
    }

    void setCallback(FftCallback cb) override {
        std::cout << "[MockEngine] setCallback" << std::endl;
        fftCallback_ = cb;
    }

    void setWaveCallback(WaveCallback cb) override {
        std::cout << "[MockEngine] setWaveCallback" << std::endl;
        waveCallback_ = cb;
    }

    void setVuCallback(VuCallback cb) override {
        std::cout << "[MockEngine] setVuCallback" << std::endl;
        vuCallback_ = cb;
    }

    void enable(bool on) override {
        std::cout << "[MockEngine] enable: " << (on ? "true" : "false") << std::endl;

        if (on && !running_) {
            running_ = true;
            captureThread_ = std::thread(&MockEngine::mockCaptureLoop, this);
        } else if (!on && running_) {
            running_ = false;
            if (captureThread_.joinable()) {
                captureThread_.join();
            }
        }
    }

    void setLoopback(bool on) override {
        std::cout << "[MockEngine] setLoopback: " << (on ? "true" : "false") << std::endl;
        // Mock implementation - do nothing
    }

private:
    std::string deviceId_;
    bool running_;
    std::thread captureThread_;
    std::mt19937 rng_{std::random_device{}()};

    // Configuration parameters
    int fftSize_ = 2048;
    int hopSize_ = 512;
    int columns_ = 64;
    float dbFloor_ = -60.0f;
    float masterGain_ = 1.0f;
    float tilt_ = 0.35f;

    // Callbacks
    FftCallback fftCallback_;
    WaveCallback waveCallback_;
    VuCallback vuCallback_;

    void mockCaptureLoop() {
        std::cout << "[MockEngine] Mock capture loop started" << std::endl;

        std::uniform_real_distribution<float> dist(0.0f, 1.0f);
        double phase = 0.0;

        while (running_) {
            // Generate mock FFT data (smooth animated bars)
            if (fftCallback_) {
                std::vector<uint8_t> spectrum(columns_);

                for (size_t i = 0; i < columns_; ++i) {
                    // Create smooth wave pattern with some randomness
                    double freq = (i + 1) * 0.1;
                    double base = std::sin(phase + freq) * 0.5 + 0.5;
                    double noise = dist(rng_) * 0.2;
                    double value = base * 0.8 + noise * 0.2;

                    // Decay towards higher frequencies (more realistic)
                    value *= std::exp(-i * 0.015);

                    spectrum[i] = static_cast<uint8_t>(value * 255);
                }

                fftCallback_(spectrum);
            }

            // Generate mock waveform data
            if (waveCallback_) {
                std::vector<int16_t> waveform(512);

                for (size_t i = 0; i < 512; ++i) {
                    double t = phase + i * 0.01;
                    double sample = std::sin(t * 440.0 * 2.0 * M_PI / 44100.0);
                    waveform[i] = static_cast<int16_t>(sample * 16384);
                }

                waveCallback_(waveform);
            }

            // Generate mock VU meter data
            if (vuCallback_) {
                std::vector<uint8_t> vu(2);
                double level = std::sin(phase) * 0.5 + 0.5;
                vu[0] = static_cast<uint8_t>(level * 200);  // Left channel
                vu[1] = static_cast<uint8_t>(level * 180);  // Right channel (slightly different)
                vuCallback_(vu);
            }

            phase += 0.05;

            // Update at ~60 FPS
            std::this_thread::sleep_for(std::chrono::milliseconds(16));
        }

        std::cout << "[MockEngine] Mock capture loop stopped" << std::endl;
    }
};

#endif // MOCK_ENGINE_H
