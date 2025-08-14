#include <napi.h>
#include <thread>
#include <atomic>
#include <vector>
#include <string>

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
    if (!info[0].IsFunction()) Napi::TypeError::New(env, "callback required").ThrowAsJavaScriptException();
    if (running_) return env.Undefined();

    tsfn_ = Napi::ThreadSafeFunction::New(
      env,
      info[0].As<Napi::Function>(),
      "GSMTCCallback",
      0, 1
    );

    running_ = true;
    worker_ = std::thread([this] { this->Pump(); });
    return env.Undefined();
  }

  Napi::Value Stop(const Napi::CallbackInfo& info) {
    StopInternal();
    return info.Env().Undefined();
  }

  void StopInternal() {
    if (!running_) return;
    running_ = false;
    if (worker_.joinable()) worker_.join();
    if (tsfn_) { tsfn_.Release(); tsfn_ = {}; }
  }

  void Pump() {
    winrt::init_apartment(apartment_type::single_threaded);

    try {
      auto mgr = GlobalSystemMediaTransportControlsSessionManager::RequestAsync().get();

      // подписка на смену текущей сессии
      auto currentChangedToken = mgr.CurrentSessionChanged([this](auto const& m, auto const&) {
        auto s = m.GetCurrentSession();
        SubscribeToSession(s);
        if (s) EmitSnapshot(s);
      });

      // начальная сессия
      auto s = mgr.GetCurrentSession();
      SubscribeToSession(s);
      if (s) EmitSnapshot(s);

      // держим поток живым
      while (running_) std::this_thread::sleep_for(std::chrono::milliseconds(200));

      // отписки
      if (session_) {
        if (mediaPropsToken_.value)  session_.MediaPropertiesChanged(mediaPropsToken_);
        if (playbackToken_.value)    session_.PlaybackInfoChanged(playbackToken_);
        if (timelineToken_.value)    session_.TimelinePropertiesChanged(timelineToken_);
        session_ = nullptr;
      }
      mgr.CurrentSessionChanged(currentChangedToken);
    } catch (...) {
      // проглатываем — в JS можно добавить защиту/повтор
    }
  }

  void SubscribeToSession(GlobalSystemMediaTransportControlsSession const& s) {
    if (session_) {
      if (mediaPropsToken_.value)  session_.MediaPropertiesChanged(mediaPropsToken_);
      if (playbackToken_.value)    session_.PlaybackInfoChanged(playbackToken_);
      if (timelineToken_.value)    session_.TimelinePropertiesChanged(timelineToken_);
      session_ = nullptr;
    }
    session_ = s;
    if (!session_) return;

    mediaPropsToken_ = session_.MediaPropertiesChanged([this](auto const& sess, auto const&) {
      EmitSnapshot(sess);
    });
    playbackToken_ = session_.PlaybackInfoChanged([this](auto const& sess, auto const&) {
      EmitSnapshot(sess);
    });
    timelineToken_ = session_.TimelinePropertiesChanged([this](auto const& sess, auto const&) {
      EmitSnapshot(sess);
    });
  }

  static std::vector<uint8_t> ReadAll(IRandomAccessStream const& stream) {
    auto size = stream.Size();
    auto input = stream.GetInputStreamAt(0);
    DataReader reader(input);
    reader.LoadAsync(static_cast<uint32_t>(size)).get();
    std::vector<uint8_t> bytes(static_cast<size_t>(size));
    if (size) reader.ReadBytes(bytes);
    return bytes;
  }

  void EmitSnapshot(GlobalSystemMediaTransportControlsSession const& s) {
    if (!s) return;

    EventData ev;

    // media properties (title/artist/album/thumbnail)
    try {
      auto props = s.TryGetMediaPropertiesAsync().get();
      ev.title  = winrt::to_string(props.Title());
      ev.artist = winrt::to_string(props.Artist());
      ev.album  = winrt::to_string(props.AlbumTitle());

      if (auto thumb = props.Thumbnail()) {
        auto rs = thumb.OpenReadAsync().get();
        ev.thumbnail = ReadAll(rs);
      }
    } catch (...) {}

    // playback info (status)
    try {
      auto pb = s.GetPlaybackInfo();
      ev.playbackStatus = static_cast<int32_t>(pb.PlaybackStatus());
    } catch (...) {}

    // timeline (duration/position)
    try {
      auto tl = s.GetTimelineProperties();
      auto toMs = [](Windows::Foundation::TimeSpan ts) -> int64_t {
        // 1 tick = 100 ns
        return ts.count() / 10000;
      };
      ev.durationMs = toMs(tl.EndTime());
      ev.positionMs = toMs(tl.Position());
    } catch (...) {}

    // app id
    try {
      ev.appId = winrt::to_string(s.SourceAppUserModelId());
    } catch (...) {}

    if (tsfn_) {
      tsfn_.BlockingCall(new EventData(std::move(ev)),
        [](Napi::Env env, Napi::Function cb, EventData* data) {
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
          delete data;
        });
    }
  }

  std::thread worker_;
  std::atomic_bool running_{false};
  Napi::ThreadSafeFunction tsfn_{};

  GlobalSystemMediaTransportControlsSession session_{ nullptr };
  event_token mediaPropsToken_{};
  event_token playbackToken_{};
  event_token timelineToken_{};
};

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  return GSMTCBridge::Init(env, exports);
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)

