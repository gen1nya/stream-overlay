#include <napi.h>
#include <thread>
#include <atomic>
#include <vector>
#include <string>
#include <mutex>
#include <iostream>
#include <sstream>

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
  std::vector<uint8_t> thumbnail; // raw bytes
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
  ~GSMTCBridge() { StopInternal(); }

private:
  Napi::Value Start(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Первый аргумент - data callback (обязательный)
    if (!info[0].IsFunction()) {
      Napi::TypeError::New(env, "data callback required").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    // Второй аргумент - error callback (опциональный)
    bool hasErrorCallback = info.Length() > 1 && info[1].IsFunction();

    std::lock_guard<std::mutex> lock(mutex_);
    if (running_) return env.Undefined();

    // Data callback
    tsfn_ = Napi::ThreadSafeFunction::New(
      env,
      info[0].As<Napi::Function>(),
      "GSMTCCallback",
      0, 1
    );

    // Error callback (если передан)
    if (hasErrorCallback) {
      errorTsfn_ = Napi::ThreadSafeFunction::New(
        env,
        info[1].As<Napi::Function>(),
        "GSMTCErrorCallback",
        0, 1
      );
    }

    running_ = true;
    worker_ = std::thread([this] { this->Pump(); });
    return env.Undefined();
  }

  Napi::Value Stop(const Napi::CallbackInfo& info) {
    StopInternal();
    return info.Env().Undefined();
  }

  void StopInternal() {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      if (!running_) return;
      running_ = false;
    }

    // Ждём завершения потока (КРИТИЧНО!)
    if (worker_.joinable()) {
      worker_.join();
    }

    // Теперь безопасно очищаем ресурсы
    std::lock_guard<std::mutex> lock(mutex_);
    if (tsfn_) {
      tsfn_.Release();
      tsfn_ = {};
    }
    if (errorTsfn_) {
      errorTsfn_.Release();
      errorTsfn_ = {};
    }
  }

  // Логирование ошибки
  void LogError(const std::string& location, const std::string& message, int32_t hresult = 0) {
    // Логируем в stderr (видно в Node.js консоли)
    std::cerr << "[GSMTC Error] " << location << ": " << message;
    if (hresult != 0) {
      std::cerr << " (HRESULT: 0x" << std::hex << hresult << std::dec << ")";
    }
    std::cerr << std::endl;

    // Если есть error callback - отправляем туда
    Napi::ThreadSafeFunction errorTsfn_copy;
    {
      std::lock_guard<std::mutex> lock(mutex_);
      if (errorTsfn_ && running_) {
        errorTsfn_copy = errorTsfn_;
      }
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
            if (data->hresult != 0) {
              o.Set("hresult", Napi::Number::New(env, data->hresult));
            }
            cb.Call({ o });
          } catch (...) {}
          delete data;
        });
    }
  }

  void Pump() {
    winrt::init_apartment(apartment_type::single_threaded);

    GlobalSystemMediaTransportControlsSessionManager mgr{ nullptr };
    event_token currentChangedToken{};

    try {
      mgr = GlobalSystemMediaTransportControlsSessionManager::RequestAsync().get();

      // Подписка на смену текущей сессии
      currentChangedToken = mgr.CurrentSessionChanged([this](auto const& m, auto const&) {
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

      // начальная сессия
      auto s = mgr.GetCurrentSession();
      SubscribeToSession(s);
      if (s) EmitSnapshot(s);

      // держим поток живым
      while (running_) {
        std::this_thread::sleep_for(std::chrono::milliseconds(200));
      }

    } catch (const winrt::hresult_error& e) {
      LogError("Pump/Init", winrt::to_string(e.message()), e.code());
    } catch (const std::exception& e) {
      LogError("Pump/Init", e.what());
    } catch (...) {
      LogError("Pump/Init", "Unknown error during initialization");
    }

    // Cleanup: отписываемся от событий ПЕРЕД выходом из потока
    try {
      std::lock_guard<std::mutex> lock(mutex_);

      if (session_) {
        if (mediaPropsToken_.value)  session_.MediaPropertiesChanged(mediaPropsToken_);
        if (playbackToken_.value)    session_.PlaybackInfoChanged(playbackToken_);
        if (timelineToken_.value)    session_.TimelinePropertiesChanged(timelineToken_);
        session_ = nullptr;
      }

      if (mgr && currentChangedToken.value) {
        mgr.CurrentSessionChanged(currentChangedToken);
      }
    } catch (const winrt::hresult_error& e) {
      LogError("Pump/Cleanup", winrt::to_string(e.message()), e.code());
    } catch (...) {
      LogError("Pump/Cleanup", "Unknown error during cleanup");
    }

    winrt::uninit_apartment();
  }

  void SubscribeToSession(GlobalSystemMediaTransportControlsSession const& s) {
    std::lock_guard<std::mutex> lock(mutex_);

    // Отписываемся от старой сессии
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
      playbackToken_ = {};
      timelineToken_ = {};
    }

    session_ = s;
    if (!session_) return;

    // Подписываемся на новую сессию
    try {
      mediaPropsToken_ = session_.MediaPropertiesChanged([this](auto const& sess, auto const&) {
        if (!running_) return;
        try {
          EmitSnapshot(sess);
        } catch (const winrt::hresult_error& e) {
          LogError("MediaPropertiesChanged", winrt::to_string(e.message()), e.code());
        } catch (const std::exception& e) {
          LogError("MediaPropertiesChanged", e.what());
        } catch (...) {
          LogError("MediaPropertiesChanged", "Unknown error");
        }
      });

      playbackToken_ = session_.PlaybackInfoChanged([this](auto const& sess, auto const&) {
        if (!running_) return;
        try {
          EmitSnapshot(sess);
        } catch (const winrt::hresult_error& e) {
          LogError("PlaybackInfoChanged", winrt::to_string(e.message()), e.code());
        } catch (const std::exception& e) {
          LogError("PlaybackInfoChanged", e.what());
        } catch (...) {
          LogError("PlaybackInfoChanged", "Unknown error");
        }
      });

      timelineToken_ = session_.TimelinePropertiesChanged([this](auto const& sess, auto const&) {
        if (!running_) return;
        try {
          EmitSnapshot(sess);
        } catch (const winrt::hresult_error& e) {
          LogError("TimelinePropertiesChanged", winrt::to_string(e.message()), e.code());
        } catch (const std::exception& e) {
          LogError("TimelinePropertiesChanged", e.what());
        } catch (...) {
          LogError("TimelinePropertiesChanged", "Unknown error");
        }
      });
    } catch (const winrt::hresult_error& e) {
      LogError("SubscribeToSession/Subscribe", winrt::to_string(e.message()), e.code());
      session_ = nullptr;
    } catch (...) {
      LogError("SubscribeToSession/Subscribe", "Unknown error");
      session_ = nullptr;
    }
  }

  static std::vector<uint8_t> ReadAll(IRandomAccessStream const& stream) {
    if (!stream) return {};

    auto size = stream.Size();
    if (size == 0) return {};

    auto input = stream.GetInputStreamAt(0);
    DataReader reader(input);
    reader.LoadAsync(static_cast<uint32_t>(size)).get();
    std::vector<uint8_t> bytes(static_cast<size_t>(size));
    reader.ReadBytes(bytes);
    return bytes;
  }

  void EmitSnapshot(GlobalSystemMediaTransportControlsSession const& s) {
    if (!running_) return;
    if (!s) return;

    EventData ev;

    // media properties (title/artist/album/thumbnail)
    try {
      auto props = s.TryGetMediaPropertiesAsync().get();
      if (!props) {
        LogError("EmitSnapshot", "TryGetMediaPropertiesAsync returned null");
        return;
      }

      ev.title  = winrt::to_string(props.Title());
      ev.artist = winrt::to_string(props.Artist());
      ev.album  = winrt::to_string(props.AlbumTitle());

      if (auto thumb = props.Thumbnail()) {
        try {
          auto rs = thumb.OpenReadAsync().get();
          ev.thumbnail = ReadAll(rs);
        } catch (const winrt::hresult_error& e) {
          LogError("EmitSnapshot/Thumbnail", winrt::to_string(e.message()), e.code());
        } catch (...) {
          LogError("EmitSnapshot/Thumbnail", "Failed to read thumbnail");
        }
      }
    } catch (const winrt::hresult_error& e) {
      LogError("EmitSnapshot/MediaProps", winrt::to_string(e.message()), e.code());
      // Продолжаем с пустыми метаданными
    } catch (const std::exception& e) {
      LogError("EmitSnapshot/MediaProps", e.what());
    } catch (...) {
      LogError("EmitSnapshot/MediaProps", "Unknown error");
    }

    // playback info (status)
    try {
      auto pb = s.GetPlaybackInfo();
      ev.playbackStatus = static_cast<int32_t>(pb.PlaybackStatus());
    } catch (const winrt::hresult_error& e) {
      LogError("EmitSnapshot/PlaybackInfo", winrt::to_string(e.message()), e.code());
    } catch (...) {
      LogError("EmitSnapshot/PlaybackInfo", "Unknown error");
    }

    // timeline (duration/position)
    try {
      auto tl = s.GetTimelineProperties();
      auto toMs = [](Windows::Foundation::TimeSpan ts) -> int64_t {
        return ts.count() / 10000;
      };
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

    // Проверяем tsfn_ с блокировкой
    Napi::ThreadSafeFunction tsfn_copy;
    {
      std::lock_guard<std::mutex> lock(mutex_);
      if (!tsfn_ || !running_) return;
      tsfn_copy = tsfn_;
    }

    // Вызываем без блокировки
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
            auto buf = Napi::Buffer<uint8_t>::Copy(env, data->thumbnail.data(),
                                                   data->thumbnail.size());
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

    // Если очередь переполнена, удаляем данные вручную
    if (status != napi_ok) {
      LogError("EmitSnapshot", "Failed to queue callback (queue full?)");
      delete new EventData(std::move(ev));
    }
  }

  std::thread worker_;
  std::atomic<bool> running_{false};
  std::mutex mutex_;
  Napi::ThreadSafeFunction tsfn_{};
  Napi::ThreadSafeFunction errorTsfn_{};

  GlobalSystemMediaTransportControlsSession session_{ nullptr };
  event_token mediaPropsToken_{};
  event_token playbackToken_{};
  event_token timelineToken_{};
};

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  return GSMTCBridge::Init(env, exports);
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)