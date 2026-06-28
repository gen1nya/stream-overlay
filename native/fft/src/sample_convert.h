#pragma once
#include <cstdint>
#include <cstring>

// Sample formats we can read out of a WASAPI shared-mode capture buffer.
// (Windows -> SampleFormat mapping lives in wasapi_engine.cpp; this header is
//  intentionally platform-free so the conversion can be unit-tested.)
enum class SampleFormat { F32, I16, I24, I32, Unsupported };

inline int sampleBytes(SampleFormat fmt) {
  switch (fmt) {
    case SampleFormat::F32: return 4;
    case SampleFormat::I16: return 2;
    case SampleFormat::I24: return 3;
    case SampleFormat::I32: return 4;
    default:                return 0;
  }
}

// Convert one little-endian sample at p into a float in [-1, 1).
// 24-in-32 containers are handled by the I32 path: WAVEFORMATEXTENSIBLE keeps
// the valid bits left-justified (MSBs), so the 32-bit value already spans the
// full range and /2^31 is correct.
inline float sampleToFloat(const uint8_t* p, SampleFormat fmt) {
  switch (fmt) {
    case SampleFormat::F32: {
      float v;
      std::memcpy(&v, p, sizeof(v));
      return v;
    }
    case SampleFormat::I16: {
      int16_t v;
      std::memcpy(&v, p, sizeof(v));
      return static_cast<float>(v / 32768.0);
    }
    case SampleFormat::I24: {
      int32_t v = static_cast<int32_t>(
          static_cast<uint32_t>(p[0]) |
          (static_cast<uint32_t>(p[1]) << 8) |
          (static_cast<uint32_t>(p[2]) << 16));
      if (v & 0x800000) v |= static_cast<int32_t>(0xFF000000); // sign-extend 24->32
      return static_cast<float>(v / 8388608.0); // 2^23
    }
    case SampleFormat::I32: {
      int32_t v;
      std::memcpy(&v, p, sizeof(v));
      return static_cast<float>(v / 2147483648.0); // 2^31
    }
    default:
      return 0.0f;
  }
}
