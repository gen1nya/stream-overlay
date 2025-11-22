#include <napi.h>
#include <string>
#include <vector>
#include <cstring>

// Platform-specific includes
#ifdef _WIN32
  #include <windows.h>
  #include "wasapi_engine.h"
  using PlatformEngine = WasapiEngine;
#elif __linux__
  #include "pipewire_engine.h"
  using PlatformEngine = PipeWireEngine;
#elif __APPLE__
  #include "mock_engine.h"
  using PlatformEngine = MockEngine;
#else
  #error "Unsupported platform"
#endif

class Bridge : public Napi::ObjectWrap<Bridge> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports){
    Napi::Function ctor = DefineClass(env, "FftBridge", {
      InstanceMethod("listDevices", &Bridge::ListDevices),
      InstanceMethod("setDevice", &Bridge::SetDevice),
      InstanceMethod("getCurrentDevice", &Bridge::GetCurrentDevice),
      InstanceMethod("setBufferSize", &Bridge::SetBufferSize),
      InstanceMethod("setHopSize", &Bridge::SetHopSize),
      InstanceMethod("setColumns", &Bridge::SetColumns),
      InstanceMethod("setDbFloor", &Bridge::SetDbFloor),
      InstanceMethod("setMasterGain", &Bridge::SetMasterGain),
      InstanceMethod("setTilt", &Bridge::SetTilt),
      InstanceMethod("setLoopback", &Bridge::SetLoopback),
      InstanceMethod("enable", &Bridge::Enable),
      InstanceMethod("onFft", &Bridge::OnFft),
      InstanceMethod("stop", &Bridge::Stop),
      InstanceMethod("onWave", &Bridge::OnWave),
      InstanceMethod("onVu", &Bridge::OnVu),
    });
    exports.Set("FftBridge", ctor);
    return exports;
  }

  Bridge(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<Bridge>(info) {
    tsfn_ = Napi::ThreadSafeFunction::New(
      info.Env(),
      Napi::Function::New(info.Env(), [](const Napi::CallbackInfo&){ /* noop */ }),
      "fft_cb",
      3,
      1
    );
  }

  ~Bridge(){
    if(!cbRef_.IsEmpty()) cbRef_.Unref();
    if(!waveRef_.IsEmpty()) waveRef_.Unref();
    if(!vuRef_.IsEmpty()) vuRef_.Unref();
    tsfn_.Release();
    eng_.enable(false);
  }

private:
  Napi::Value Stop(const Napi::CallbackInfo& info){
    try{
      eng_.enable(false);
      if (tsfn_) {
        tsfn_.Abort();
      }

      if(!cbRef_.IsEmpty()) {
        cbRef_.Unref();
        cbRef_.Reset();
      }
      if(!waveRef_.IsEmpty()) {
        waveRef_.Unref();
        waveRef_.Reset();
      }
      if(!vuRef_.IsEmpty()) {
        vuRef_.Unref();
        vuRef_.Reset();
      }
    } catch(const std::exception& e){ }
    return info.Env().Undefined();
  }

  Napi::Value ListDevices(const Napi::CallbackInfo& info){
    try{
      auto list = eng_.listDevices();
      Napi::Array arr = Napi::Array::New(info.Env(), list.size());
      for(size_t i=0;i<list.size();++i){
        Napi::Object o = Napi::Object::New(info.Env());
        o.Set("id", Napi::String::New(info.Env(), list[i].id));
        o.Set("name", Napi::String::New(info.Env(), list[i].name));
        o.Set("flow", list[i].flow==DeviceInfo::Flow::Render? "render":"capture");
        arr.Set(i,o);
      }
      return arr;
    } catch(const std::exception& e){
      Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
      return info.Env().Undefined();
    }
  }

  Napi::Value SetDevice(const Napi::CallbackInfo& info){
    try{
      std::string id = info[0].As<Napi::String>();
      bool ok = eng_.setDevice(id);
      return Napi::Boolean::New(info.Env(), ok);
    } catch(const std::exception& e){
      Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
      return info.Env().Undefined();
    }
  }

  Napi::Value GetCurrentDevice(const Napi::CallbackInfo& info){
    try{
      auto d = eng_.currentDevice();
      Napi::Object o = Napi::Object::New(info.Env());
      o.Set("id", Napi::String::New(info.Env(), d.id));
      o.Set("name", Napi::String::New(info.Env(), d.name));
      return o;
    } catch(const std::exception& e){
      Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
      return info.Env().Undefined();
    }
  }

  Napi::Value OnWave(const Napi::CallbackInfo& info){
    if(!info[0].IsFunction()){
      Napi::TypeError::New(info.Env(), "callback required").ThrowAsJavaScriptException();
      return info.Env().Undefined();
    }

    if(!waveRef_.IsEmpty()) waveRef_.Unref();
    waveRef_ = Napi::Persistent(info[0].As<Napi::Function>());
    waveRef_.Ref();

    eng_.setWaveCallback([this](const std::vector<int16_t>& v){
      auto payload = std::make_shared<std::vector<int16_t>>(v);
      this->tsfn_.BlockingCall(
        payload.get(),
        [this, payload](Napi::Env env, Napi::Function /*js*/, std::vector<int16_t>* data){
          Napi::HandleScope scope(env);
          if(!this->waveRef_.IsEmpty()){
            auto arr = Napi::Int16Array::New(env, data->size());
            std::memcpy(arr.Data(), data->data(), data->size()*sizeof(int16_t));
            this->waveRef_.Call({ arr });
          }
        }
      );
    });

    return info.Env().Undefined();
  }

  Napi::Value OnVu(const Napi::CallbackInfo& info){
    if(!info[0].IsFunction()){
      Napi::TypeError::New(info.Env(), "callback required").ThrowAsJavaScriptException();
      return info.Env().Undefined();
    }

    if(!vuRef_.IsEmpty()) vuRef_.Unref();
    vuRef_ = Napi::Persistent(info[0].As<Napi::Function>());
    vuRef_.Ref();

    eng_.setVuCallback([this](const std::vector<uint8_t>& v){
      auto payload = std::make_shared<std::vector<uint8_t>>(v);
      this->tsfn_.BlockingCall(
        payload.get(),
        [this, payload](Napi::Env env, Napi::Function /*js*/, std::vector<uint8_t>* data){
          Napi::HandleScope scope(env);
          if(!this->vuRef_.IsEmpty()){
            auto arr = Napi::Uint8Array::New(env, data->size());
            std::memcpy(arr.Data(), data->data(), data->size());
            this->vuRef_.Call({ arr });
          }
        }
      );
    });

    return info.Env().Undefined();
  }

  Napi::Value SetBufferSize(const Napi::CallbackInfo& info){
    try{
      eng_.setFftSize(info[0].As<Napi::Number>().Int32Value());
    } catch(const std::exception& e){
      Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
    }
    return info.Env().Undefined();
  }

  Napi::Value SetHopSize(const Napi::CallbackInfo& info){
    try{
      eng_.setHopSize(info[0].As<Napi::Number>().Int32Value());
    } catch(const std::exception& e){
      Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
    }
    return info.Env().Undefined();
  }

  Napi::Value SetColumns(const Napi::CallbackInfo& info){
    try{
      eng_.setColumns(info[0].As<Napi::Number>().Int32Value());
    } catch(const std::exception& e){
      Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
    }
    return info.Env().Undefined();
  }

  Napi::Value SetDbFloor(const Napi::CallbackInfo& info){
    try{
      eng_.setDbFloor(info[0].As<Napi::Number>().FloatValue());
    } catch(const std::exception& e){
      Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
    }
    return info.Env().Undefined();
  }

  Napi::Value SetMasterGain(const Napi::CallbackInfo& info){
    try{
      eng_.setMasterGain(info[0].As<Napi::Number>().FloatValue());
    } catch(const std::exception& e){
      Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
    }
    return info.Env().Undefined();
  }

  Napi::Value SetTilt(const Napi::CallbackInfo& info){
    try{
      eng_.setTilt(info[0].As<Napi::Number>().FloatValue());
    } catch(const std::exception& e){
      Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
    }
    return info.Env().Undefined();
  }

  Napi::Value SetLoopback(const Napi::CallbackInfo& info){
    try{
      eng_.setLoopback(info[0].As<Napi::Boolean>().Value());
    } catch(const std::exception& e){
      Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
    }
    return info.Env().Undefined();
  }

  Napi::Value Enable(const Napi::CallbackInfo& info){
    try{
      eng_.enable(info[0].As<Napi::Boolean>().Value());
    } catch(const std::exception& e){
      Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException();
    }
    return info.Env().Undefined();
  }

  Napi::Value OnFft(const Napi::CallbackInfo& info){
    if(!info[0].IsFunction()){
      Napi::TypeError::New(info.Env(), "callback required").ThrowAsJavaScriptException();
      return info.Env().Undefined();
    }

    if(!cbRef_.IsEmpty()) cbRef_.Unref();
    cbRef_ = Napi::Persistent(info[0].As<Napi::Function>());
    cbRef_.Ref();

    eng_.setCallback([this](const std::vector<uint8_t>& v){
      auto payload = std::make_shared<std::vector<uint8_t>>(v);
      this->tsfn_.BlockingCall(
        payload.get(),
        [this, payload](Napi::Env env, Napi::Function /*js*/, std::vector<uint8_t>* data){
          Napi::HandleScope scope(env);
          if(!this->cbRef_.IsEmpty()){
            auto arr = Napi::Uint8Array::New(env, data->size());
            std::memcpy(arr.Data(), data->data(), data->size());
            this->cbRef_.Call({ arr });
          }
        }
      );
    });

    return info.Env().Undefined();
  }

  PlatformEngine eng_;
  Napi::ThreadSafeFunction tsfn_;
  Napi::FunctionReference cbRef_;
  Napi::FunctionReference waveRef_;
  Napi::FunctionReference vuRef_;
};

Napi::Object InitAll(Napi::Env env, Napi::Object exports){
  return Bridge::Init(env, exports);
}

NODE_API_MODULE(fft_bridge, InitAll)
