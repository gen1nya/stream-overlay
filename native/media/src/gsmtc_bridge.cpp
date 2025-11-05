#include <napi.h>
#include <thread>
#include <atomic>
#include <vector>
#include <string>
#include <mutex>
#include <iostream>

#include <winrt/base.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Media.Control.h>
#include <winrt/Windows.Storage.Streams.h>

using namespace winrt;
using namespace Windows::Foundation;
using namespace Windows::Media::Control;
using namespace Windows::Storage::Streams;

struct EventData {
  std::string title;
  std::string artist;
  std::string album;
  std::string appId;
  int64_t durationMs{};
  int64_t positionMs{};
  int32_t playbackStatus{};
  std::vector<uint8_t> thumbnail;
};

struct ErrorData {
  std::string message;
  std::string location;
  int32_t hresult{};
};

class GSMTCBridge : public Napi::ObjectWrap<GSMTCBridge> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function ctor = DefineClass(env, "GSMTCBridge", {
      InstanceMethod("start", &GSMTCBridge::Start),
      InstanceMethod("stop",  &GSMTCBridge::Stop)
    });
    exports.Set("GSMTCBridge", ctor);
    return exports;
  }

  GSMTCBridge(const Napi::CallbackInfo& info) : Napi::ObjectWrap<GSMTCBridge>(info) {}
  ~GSMTCBridge() {
    std::cerr << "[GSMTC] Destructor called" << std::endl;
    StopInternal();
  }

private:
  // ===== helpers =====
  template <typename AsyncOp, typename Rep, typename Period>
  bool wait_and_get(AsyncOp const& op, std::chrono::duration<Rep, Period> timeout) {
    // Возвращает true, если Completed, иначе false (Canceled/Errored/Timed out)
    auto st = op.wait_for(timeout);
    if (st == AsyncStatus::Completed) return true;
    return false;
  }

  static std::vector<uint8_t> ReadAll(IRandomAccessStream const& stream) {
    if (!stream) return {};
    auto size = stream.Size();
    if (size == 0) return {};

    auto input = stream.GetInputStreamAt(0);
    DataReader reader(input);

    // Защита от зависания LoadAsync — ждём не дольше 500мс
    auto load = reader.LoadAsync(static_cast<uint32_t>(size));
    if (!load) return {};
    if (!wait_for(load)) return {};

    std::vector<uint8_t> bytes(static_cast<size_t>(size));
    reader.ReadBytes(bytes);
    return bytes;
  }

  // Более явная форма wait_for для IAsyncAction/IAsyncOperation
  template <typename AsyncT>
  static bool wait_for(AsyncT const& op, std::chrono::milliseconds to = std::chrono::milliseconds(500)) {
    auto st = op.wait_for(to);
    return st == AsyncStatus::Completed;
  }

  // ===== API =====
  Napi::Value Start(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsFunction()) {
      Napi::TypeError::New(env, "data callback required").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    bool hasErrorCallback = info.Length() > 1 && info[1].IsFunction();

    std::lock_guard<std::mutex> lock(mutex_);
    if (running_) return env.Undefined();

    std::cerr << "[GSMTC] Starting..." << std::endl;

    tsfn_ = Napi::ThreadSafeFunction::New(env, info[0].As<Napi::Function>(), "GSMTCCallback", 0, 1);
    if (hasErrorCallback) {
      errorTsfn_ = Napi::ThreadSafeFunction::New(env, info[1].As<Napi::Function>(), "GSMTCErrorCallback", 0, 1);
    }

    running_ = true;
    worker_ = std::thread([this] { this->Pump(); });

    std::cerr << "[GSMTC] Started successfully" << std::endl;
    return env.Undefined();
  }

  Napi::Value Stop(const Napi::CallbackInfo& info) {
    std::cerr << "[GSMTC] Stop() called from JS" << std::endl;
    StopInternal();
    std::cerr << "[GSMTC] Stop() completed" << std::endl;
    return info.Env().Undefined();
  }

  void UnsubscribeSessionEvents_NoThrow_Locked_() {
    try {
      if (session_) {
        if (mediaPropsToken_.value)  session_.MediaPropertiesChanged(mediaPropsToken_);
        if (playbackToken_.value)    session_.PlaybackInfoChanged(playbackToken_);
        if (timelineToken_.value)    session_.TimelinePropertiesChanged(timelineToken_);
        session_ = nullptr;
      }
    } catch (const winrt::hresult_error& e) {
      LogError("UnsubscribeSessionEvents", winrt::to_string(e.message()), e.code());
    } catch (...) {
      LogError("UnsubscribeSessionEvents", "Unknown error");
    }
    mediaPropsToken_ = {};
    playbackToken_   = {};
    timelineToken_   = {};
  }

  void StopInternal() {
    std::cerr << "[GSMTC] StopInternal: begin" << std::endl;

    {
      std::lock_guard<std::mutex> lock(mutex_);
      if (!running_) {
        std::cerr << "[GSMTC] StopInternal: already stopped" << std::endl;
        return;
      }
      std::cerr << "[GSMTC] StopInternal: setting running_ = false" << std::endl;
      running_ = false;

      // Снять все подписки максимально рано
      std::cerr << "[GSMTC] StopInternal: unsubscribing session events..." << std::endl;
      UnsubscribeSessionEvents_NoThrow_Locked_();

      if (mgr_ && currentChangedToken_.value) {
        try {
          std::cerr << "[GSMTC] StopInternal: unsubscribing CurrentSessionChanged..." << std::endl;
          mgr_.CurrentSessionChanged(currentChangedToken_);
        } catch (const winrt::hresult_error& e) {
          LogError("StopInternal/UnsubscribeManager", winrt::to_string(e.message()), e.code());
        } catch (...) {
          LogError("StopInternal/UnsubscribeManager", "Unknown error");
        }
        currentChangedToken_ = {};
      }
      mgr_ = nullptr;
    }

    std::cerr << "[GSMTC] StopInternal: waiting for worker thread to join..." << std::endl;
    if (worker_.joinable()) {
      worker_.join();
      std::cerr << "[GSMTC] StopInternal: worker thread joined successfully" << std::endl;
    } else {
      std::cerr << "[GSMTC] StopInternal: worker thread was not joinable" << std::endl;
    }

    std::cerr << "[GSMTC] StopInternal: cleaning up ThreadSafeFunctions..." << std::endl;
    {
      std::lock_guard<std::mutex> lock(mutex_);
      if (tsfn_) { tsfn_.Abort(); tsfn_.Release(); tsfn_ = {}; }
      if (errorTsfn_) { errorTsfn_.Abort(); errorTsfn_.Release(); errorTsfn_ = {}; }
    }

    std::cerr << "[GSMTC] StopInternal: complete!" << std::endl;
  }

  void LogError(const std::string& location, const std::string& message, int32_t hresult = 0) {
    std::cerr << "[GSMTC Error] " << location << ": " << message;
    if (hresult != 0) std::cerr << " (HRESULT: 0x" << std::hex << hresult << std::dec << ")";
    std::cerr << std::endl;

    Napi::ThreadSafeFunction errorTsfn_copy;
    {
      std::lock_guard<std::mutex> lock(mutex_);
      if (errorTsfn_ && running_) errorTsfn_copy = errorTsfn_;
    }

    if (errorTsfn_copy) {
      auto* errData = new ErrorData{ message, location, hresult };
      errorTsfn_copy.NonBlockingCall(errData,
        [](Napi::Env env, Napi::Function cb, ErrorData* data) {
          Napi::HandleScope scope(env);
          try {
            Napi::Object o = Napi::Object::New(env);
            o.Set("location", data->location);
            o.Set("message", data->message);
            if (data->hresult != 0) o.Set("hresult", Napi::Number::New(env, data->hresult));
            cb.Call({ o });
          } catch (...) {}
          delete data;
        });
    }
  }

  void Pump() {
    std::cerr << "[GSMTC] Pump: thread started" << std::endl;

    // ВАЖНО: используем MTA, чтобы блокирующие get() не зависали в STA
    winrt::init_apartment(apartment_type::multi_threaded);
    std::cerr << "[GSMTC] Pump: WinRT apartment (MTA) initialized" << std::endl;

    try {
      std::cerr << "[GSMTC] Pump: requesting SessionManager..." << std::endl;
      {
        auto req = GlobalSystemMediaTransportControlsSessionManager::RequestAsync();
        // Ждём не дольше 1с — иначе считаем, что системы нет/висит
        if (!wait_for(req, std::chrono::milliseconds(1000))) {
          LogError("Pump/Init", "RequestAsync timeout");
          goto CLEANUP;
        }
        auto mgrLocal = req.get();
        {
          std::lock_guard<std::mutex> lock(mutex_);
          if (!running_) goto CLEANUP;
          mgr_ = mgrLocal;
        }
      }
      std::cerr << "[GSMTC] Pump: SessionManager obtained" << std::endl;

      {
        std::lock_guard<std::mutex> lock(mutex_);
        currentChangedToken_ = mgr_.CurrentSessionChanged([this](auto const& m, auto const&) {
          if (!running_) return;
          try {
            auto s = m.GetCurrentSession();
            SubscribeToSession(s);
            if (s) EmitSnapshot(s);
          } catch (const winrt::hresult_error& e) {
            LogError("CurrentSessionChanged", winrt::to_string(e.message()), e.code());
          } catch (const std::exception& e) {
            LogError("CurrentSessionChanged", e.what());
          } catch (...) {
            LogError("CurrentSessionChanged", "Unknown error");
          }
        });
      }

      {
        auto s = mgr_.GetCurrentSession();
        SubscribeToSession(s);
        if (s) EmitSnapshot(s);
      }

      std::cerr << "[GSMTC] Pump: entering main loop" << std::endl;
      while (running_) {
        std::this_thread::sleep_for(std::chrono::milliseconds(200));
      }
      std::cerr << "[GSMTC] Pump: exited main loop (running_ = false)" << std::endl;

    } catch (const winrt::hresult_error& e) {
      LogError("Pump/Init", winrt::to_string(e.message()), e.code());
    } catch (const std::exception& e) {
      LogError("Pump/Init", e.what());
    } catch (...) {
      LogError("Pump/Init", "Unknown error during initialization");
    }

  CLEANUP:
    std::cerr << "[GSMTC] Pump: uninitializing WinRT apartment..." << std::endl;
    winrt::uninit_apartment();
    std::cerr << "[GSMTC] Pump: thread ending" << std::endl;
  }

  void SubscribeToSession(GlobalSystemMediaTransportControlsSession const& s) {
    std::lock_guard<std::mutex> lock(mutex_);

    if (session_) {
      try {
        if (mediaPropsToken_.value)  session_.MediaPropertiesChanged(mediaPropsToken_);
        if (playbackToken_.value)    session_.PlaybackInfoChanged(playbackToken_);
        if (timelineToken_.value)    session_.TimelinePropertiesChanged(timelineToken_);
      } catch (const winrt::hresult_error& e) {
        LogError("SubscribeToSession/Unsubscribe", winrt::to_string(e.message()), e.code());
      } catch (...) {
        LogError("SubscribeToSession/Unsubscribe", "Unknown error");
      }
      session_ = nullptr;
      mediaPropsToken_ = {};
      playbackToken_   = {};
      timelineToken_   = {};
    }

    session_ = s;
    if (!session_) return;

    try {
      mediaPropsToken_ = session_.MediaPropertiesChanged([this](auto const& sess, auto const&) {
        if (!running_) return;
        try { EmitSnapshot(sess); }
        catch (const winrt::hresult_error& e) { LogError("MediaPropertiesChanged", winrt::to_string(e.message()), e.code()); }
        catch (const std::exception& e) { LogError("MediaPropertiesChanged", e.what()); }
        catch (...) { LogError("MediaPropertiesChanged", "Unknown error"); }
      });

      playbackToken_ = session_.PlaybackInfoChanged([this](auto const& sess, auto const&) {
        if (!running_) return;
        try { EmitSnapshot(sess); }
        catch (const winrt::hresult_error& e) { LogError("PlaybackInfoChanged", winrt::to_string(e.message()), e.code()); }
        catch (const std::exception& e) { LogError("PlaybackInfoChanged", e.what()); }
        catch (...) { LogError("PlaybackInfoChanged", "Unknown error"); }
      });

      timelineToken_ = session_.TimelinePropertiesChanged([this](auto const& sess, auto const&) {
        if (!running_) return;
        try { EmitSnapshot(sess); }
        catch (const winrt::hresult_error& e) { LogError("TimelinePropertiesChanged", winrt::to_string(e.message()), e.code()); }
        catch (const std::exception& e) { LogError("TimelinePropertiesChanged", e.what()); }
        catch (...) { LogError("TimelinePropertiesChanged", "Unknown error"); }
      });
    } catch (const winrt::hresult_error& e) {
      LogError("SubscribeToSession/Subscribe", winrt::to_string(e.message()), e.code());
      session_ = nullptr;
      mediaPropsToken_ = {};
      playbackToken_   = {};
      timelineToken_   = {};
    } catch (...) {
      LogError("SubscribeToSession/Subscribe", "Unknown error");
      session_ = nullptr;
      mediaPropsToken_ = {};
      playbackToken_   = {};
      timelineToken_   = {};
    }
  }

  void EmitSnapshot(GlobalSystemMediaTransportControlsSession const& s) {
    if (!running_ || !s) return;

    EventData ev;

    // media properties
    try {
      auto op = s.TryGetMediaPropertiesAsync();
      if (op && wait_for(op)) {
        auto props = op.get();
        if (props) {
          ev.title  = winrt::to_string(props.Title());
          ev.artist = winrt::to_string(props.Artist());
          ev.album  = winrt::to_string(props.AlbumTitle());

          if (auto thumb = props.Thumbnail()) {
            try {
              auto rop = thumb.OpenReadAsync();
              if (rop && wait_for(rop)) {
                auto rs = rop.get();
                ev.thumbnail = ReadAll(rs); // внутри тоже с таймаутом
              }
            } catch (const winrt::hresult_error& e) {
              LogError("EmitSnapshot/Thumbnail", winrt::to_string(e.message()), e.code());
            } catch (...) {
              LogError("EmitSnapshot/Thumbnail", "Failed to read thumbnail");
            }
          }
        }
      }
    } catch (const winrt::hresult_error& e) {
      LogError("EmitSnapshot/MediaProps", winrt::to_string(e.message()), e.code());
    } catch (const std::exception& e) {
      LogError("EmitSnapshot/MediaProps", e.what());
    } catch (...) {
      LogError("EmitSnapshot/MediaProps", "Unknown error");
    }

    // playback info
    try {
      auto pb = s.GetPlaybackInfo();
      ev.playbackStatus = static_cast<int32_t>(pb.PlaybackStatus());
    } catch (const winrt::hresult_error& e) {
      LogError("EmitSnapshot/PlaybackInfo", winrt::to_string(e.message()), e.code());
    } catch (...) {
      LogError("EmitSnapshot/PlaybackInfo", "Unknown error");
    }

    // timeline
    try {
      auto tl = s.GetTimelineProperties();
      auto toMs = [](Windows::Foundation::TimeSpan ts) -> int64_t { return ts.count() / 10000; };
      ev.durationMs = toMs(tl.EndTime());
      ev.positionMs = toMs(tl.Position());
    } catch (const winrt::hresult_error& e) {
      LogError("EmitSnapshot/Timeline", winrt::to_string(e.message()), e.code());
    } catch (...) {
      LogError("EmitSnapshot/Timeline", "Unknown error");
    }

    // app id
    try {
      ev.appId = winrt::to_string(s.SourceAppUserModelId());
    } catch (const winrt::hresult_error& e) {
      LogError("EmitSnapshot/AppId", winrt::to_string(e.message()), e.code());
    } catch (...) {
      LogError("EmitSnapshot/AppId", "Unknown error");
    }

    Napi::ThreadSafeFunction tsfn_copy;
    {
      std::lock_guard<std::mutex> lock(mutex_);
      if (!tsfn_ || !running_) return;
      tsfn_copy = tsfn_;
    }

    auto status = tsfn_copy.NonBlockingCall(new EventData(std::move(ev)),
      [](Napi::Env env, Napi::Function cb, EventData* data) {
        Napi::HandleScope scope(env);
        try {
          Napi::Object o = Napi::Object::New(env);
          o.Set("title",   data->title);
          o.Set("artist",  data->artist);
          o.Set("album",   data->album);
          o.Set("appId",   data->appId);
          o.Set("durationMs", Napi::Number::New(env, static_cast<double>(data->durationMs)));
          o.Set("positionMs", Napi::Number::New(env, static_cast<double>(data->positionMs)));
          o.Set("playbackStatus", data->playbackStatus);

          if (!data->thumbnail.empty()) {
            auto buf = Napi::Buffer<uint8_t>::Copy(env, data->thumbnail.data(), data->thumbnail.size());
            o.Set("thumbnail", buf);
          }
          cb.Call({ o });
        } catch (const Napi::Error& e) {
          std::cerr << "[GSMTC Error] Callback exception: " << e.what() << std::endl;
        } catch (...) {
          std::cerr << "[GSMTC Error] Unknown callback exception" << std::endl;
        }
        delete data;
      });

    if (status != napi_ok) {
      LogError("EmitSnapshot", "Failed to queue callback (queue full?)");
    }
  }

  std::thread worker_;
  std::atomic<bool> running_{false};
  std::mutex mutex_;
  Napi::ThreadSafeFunction tsfn_{};
  Napi::ThreadSafeFunction errorTsfn_{};

  GlobalSystemMediaTransportControlsSessionManager mgr_{ nullptr };
  event_token currentChangedToken_{};

  GlobalSystemMediaTransportControlsSession session_{ nullptr };
  event_token mediaPropsToken_{};
  event_token playbackToken_{};
  event_token timelineToken_{};
};

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  return GSMTCBridge::Init(env, exports);
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)