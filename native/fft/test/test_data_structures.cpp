#include <cassert>
#include <cstring>
#include <cmath>
#include <iostream>
#include <string>
#include <vector>

#include "../src/ringbuffers.h"
#include "../src/fft_bands.h"
#include "../src/sample_convert.h"

static int gTests = 0;
static int gFailed = 0;

#define TEST(name) \
  do { \
    ++gTests; \
    std::cout << "  " << name << " ... "; \
    std::cout.flush(); \
  } while(0)

#define PASS() std::cout << "PASS" << std::endl
#define FAIL(msg) do { std::cout << "FAIL: " << msg << std::endl; ++gFailed; } while(0)

// ── FloatRingBuffer tests ──────────────────────────────────────────

void testRingBuffer_writeAndReadLatest() {
  TEST("write + readLatest");
  FloatRingBuffer rb(8);
  float data[] = {1, 2, 3, 4, 5};
  rb.write(data, 5);

  float out[5];
  rb.readLatest(out, 5);
  bool ok = true;
  for (int i = 0; i < 5; ++i) {
    if (out[i] != data[i]) { ok = false; break; }
  }
  if (ok && rb.count() == 5) PASS(); else FAIL("data mismatch or wrong count");
}

void testRingBuffer_writeSingle() {
  TEST("writeSingle");
  FloatRingBuffer rb(4);
  rb.writeSingle(10.0f);
  rb.writeSingle(20.0f);
  rb.writeSingle(30.0f);

  float out[3];
  rb.readLatest(out, 3);
  if (out[0] == 10.0f && out[1] == 20.0f && out[2] == 30.0f && rb.count() == 3)
    PASS();
  else
    FAIL("writeSingle data mismatch");
}

void testRingBuffer_overflowWrap() {
  TEST("overflow wrap-around");
  FloatRingBuffer rb(4);
  // Write 6 values into a buffer of size 4
  float data[] = {1, 2, 3, 4, 5, 6};
  rb.write(data, 6);

  // Count should saturate at capacity
  if (rb.count() != 4) { FAIL("count should be 4"); return; }

  // Latest 4 values should be 3,4,5,6
  float out[4];
  rb.readLatest(out, 4);
  if (out[0] == 3.0f && out[1] == 4.0f && out[2] == 5.0f && out[3] == 6.0f)
    PASS();
  else
    FAIL("wrapped data mismatch");
}

void testRingBuffer_iterLatest() {
  TEST("iterLatest");
  FloatRingBuffer rb(8);
  float data[] = {10, 20, 30, 40, 50};
  rb.write(data, 5);

  std::vector<float> collected;
  rb.iterLatest(3, [&](float v){ collected.push_back(v); });

  if (collected.size() == 3 && collected[0] == 30.0f && collected[1] == 40.0f && collected[2] == 50.0f)
    PASS();
  else
    FAIL("iterLatest values wrong");
}

void testRingBuffer_iterLatest_clampToCount() {
  TEST("iterLatest clamps to count");
  FloatRingBuffer rb(8);
  rb.writeSingle(1.0f);
  rb.writeSingle(2.0f);

  std::vector<float> collected;
  rb.iterLatest(100, [&](float v){ collected.push_back(v); }); // request more than available

  if (collected.size() == 2 && collected[0] == 1.0f && collected[1] == 2.0f)
    PASS();
  else
    FAIL("should clamp to count");
}

void testRingBuffer_readLatestThrows() {
  TEST("readLatest throws when insufficient data");
  FloatRingBuffer rb(8);
  rb.writeSingle(1.0f);

  float out[4];
  try {
    rb.readLatest(out, 4);
    FAIL("should have thrown");
  } catch (const std::runtime_error&) {
    PASS();
  }
}

void testRingBuffer_countTracking() {
  TEST("count tracking");
  FloatRingBuffer rb(4);
  assert(rb.count() == 0);
  assert(rb.capacity() == 4);

  rb.writeSingle(1.0f);
  if (rb.count() != 1) { FAIL("count should be 1"); return; }

  rb.writeSingle(2.0f);
  rb.writeSingle(3.0f);
  rb.writeSingle(4.0f);
  if (rb.count() != 4) { FAIL("count should be 4"); return; }

  // Overflow: count stays at capacity
  rb.writeSingle(5.0f);
  if (rb.count() != 4) { FAIL("count should stay at 4 after overflow"); return; }

  PASS();
}

void testRingBuffer_wrapReadLatest() {
  TEST("readLatest across wrap boundary");
  FloatRingBuffer rb(4);
  // Fill completely then add 2 more (write pointer wraps)
  for (int i = 1; i <= 6; ++i) rb.writeSingle((float)i);

  // Latest 4 should be [3,4,5,6]
  float out[4];
  rb.readLatest(out, 4);
  if (out[0] == 3.0f && out[1] == 4.0f && out[2] == 5.0f && out[3] == 6.0f)
    PASS();
  else
    FAIL("wrap boundary read mismatch");
}

// ── TripleBuffer tests ─────────────────────────────────────────────

void testTripleBuffer_writePublishRead() {
  TEST("write → publish → read cycle");
  // Triple buffer uses staging: publish moves write→staging, staging→read.
  // So data written before publish N becomes readable after publish N+1.
  TripleBuffer<float> tb(4);

  // First write + publish: data goes to staging
  auto& wb1 = tb.writeBuf();
  wb1[0] = 1.0f; wb1[1] = 2.0f; wb1[2] = 3.0f; wb1[3] = 4.0f;
  tb.publish();

  // Second publish: staging (with our data) becomes readable
  tb.writeBuf()[0] = 99.0f; // dummy write
  tb.publish();

  auto& rb = tb.readBuf();
  if (rb[0] == 1.0f && rb[1] == 2.0f && rb[2] == 3.0f && rb[3] == 4.0f)
    PASS();
  else
    FAIL("published data not visible in readBuf after two publishes");
}

void testTripleBuffer_publishSwaps() {
  TEST("latest publish wins");
  TripleBuffer<float> tb(2);

  // Write A + publish (A goes to staging)
  tb.writeBuf()[0] = 10.0f;
  tb.writeBuf()[1] = 20.0f;
  tb.publish();

  // Write B + publish (B goes to staging, A goes to read)
  tb.writeBuf()[0] = 30.0f;
  tb.writeBuf()[1] = 40.0f;
  tb.publish();

  // After two publishes, reader sees A (the first write)
  auto& rb = tb.readBuf();
  if (rb[0] == 10.0f && rb[1] == 20.0f)
    PASS();
  else
    FAIL("expected first write visible after second publish");
}

void testTripleBuffer_readBufStableWithoutPublish() {
  TEST("readBuf stable without publish");
  TripleBuffer<float> tb(2);

  // Seed: write + publish twice to get data into readBuf
  tb.writeBuf()[0] = 100.0f;
  tb.publish();
  tb.writeBuf()[0] = 0.0f; // dummy
  tb.publish();

  // Now readBuf should have 100.0f
  float v1 = tb.readBuf()[0];
  float v2 = tb.readBuf()[0];

  // Write more but don't publish — readBuf should not change
  tb.writeBuf()[0] = 200.0f;
  float v3 = tb.readBuf()[0];

  if (v1 == 100.0f && v2 == 100.0f && v3 == 100.0f)
    PASS();
  else
    FAIL("readBuf changed without publish");
}

// ── BinMap tests ───────────────────────────────────────────────────

void testBinMap_fullCoverage() {
  TEST("bands cover full spectrum (start[0]=0, end[last]=halfBins)");
  int sampleRate = 44100;
  int fftSize = 4096;
  int columns = 256;
  int halfBins = fftSize / 2;

  BinMap m = makeBinMap(sampleRate, fftSize, columns);

  if (m.start[0] != 0) { FAIL("start[0] should be 0, got " + std::to_string(m.start[0])); return; }
  if (m.end[columns - 1] != halfBins) {
    FAIL("end[last] should be " + std::to_string(halfBins) + ", got " + std::to_string(m.end[columns - 1]));
    return;
  }
  PASS();
}

void testBinMap_noGaps() {
  TEST("no gaps between adjacent bands");
  int sampleRate = 44100;
  int fftSize = 4096;
  int columns = 256;

  BinMap m = makeBinMap(sampleRate, fftSize, columns);

  bool ok = true;
  for (int b = 1; b < columns; ++b) {
    // Adjacent bands should overlap or be contiguous (no gap)
    // start[b] should be <= end[b-1] (they can overlap, that's fine)
    if (m.start[b] > m.end[b - 1]) {
      std::cout << "gap at band " << b << ": end[" << (b-1) << "]=" << m.end[b-1]
                << ", start[" << b << "]=" << m.start[b] << std::endl;
      ok = false;
      break;
    }
  }
  if (ok) PASS(); else FAIL("gap found between bands");
}

void testBinMap_monotonic() {
  TEST("bands monotonically increasing");
  int sampleRate = 44100;
  int fftSize = 4096;
  int columns = 256;

  BinMap m = makeBinMap(sampleRate, fftSize, columns);

  bool ok = true;
  for (int b = 0; b < columns; ++b) {
    if (m.end[b] <= m.start[b]) {
      std::cout << "empty band at " << b << ": start=" << m.start[b] << ", end=" << m.end[b] << std::endl;
      ok = false;
      break;
    }
  }
  if (!ok) { FAIL("found empty band"); return; }

  for (int b = 1; b < columns; ++b) {
    if (m.start[b] < m.start[b - 1]) {
      ok = false;
      break;
    }
  }
  if (ok) PASS(); else FAIL("start indices not monotonic");
}

void testBinMap_differentSampleRates() {
  TEST("works with different sample rates");
  // 48000 Hz is common for WASAPI
  int sampleRate = 48000;
  int fftSize = 4096;
  int columns = 256;
  int halfBins = fftSize / 2;

  BinMap m = makeBinMap(sampleRate, fftSize, columns);

  bool ok = (m.start[0] == 0) && (m.end[columns - 1] == halfBins);
  for (int b = 0; b < columns && ok; ++b) {
    if (m.end[b] <= m.start[b]) ok = false;
  }
  if (ok) PASS(); else FAIL("failed at 48kHz sample rate");
}

// ── sampleToFloat tests ──────────────────────────────────────────────────────
// These cover the bit-twiddling for every capture format. The Windows test box
// only ever delivers float32, so the I16/I24/I32 paths can ONLY be validated
// here, by feeding known little-endian byte patterns.

static bool approxf(float a, float b) { return std::fabs(a - b) < 1e-6f; }

void testSampleConvert_bytes() {
  TEST("sampleBytes per format");
  if (sampleBytes(SampleFormat::F32) == 4 && sampleBytes(SampleFormat::I16) == 2 &&
      sampleBytes(SampleFormat::I24) == 3 && sampleBytes(SampleFormat::I32) == 4)
    PASS();
  else
    FAIL("wrong byte sizes");
}

void testSampleConvert_f32() {
  TEST("F32 round-trip");
  float in = 0.5f; uint8_t b[4]; std::memcpy(b, &in, 4);
  if (approxf(sampleToFloat(b, SampleFormat::F32), 0.5f)) PASS();
  else FAIL("f32 mismatch");
}

void testSampleConvert_i16() {
  TEST("I16 scaling + endianness");
  uint8_t zero[2] = {0x00, 0x00};
  uint8_t half[2] = {0x00, 0x40};  // 0x4000 = 16384 -> 0.5
  uint8_t neg1[2] = {0x00, 0x80};  // 0x8000 = -32768 -> -1.0
  uint8_t maxv[2] = {0xFF, 0x7F};  // 0x7FFF = 32767 -> ~0.99997
  float mx = sampleToFloat(maxv, SampleFormat::I16);
  if (approxf(sampleToFloat(zero, SampleFormat::I16), 0.0f) &&
      approxf(sampleToFloat(half, SampleFormat::I16), 0.5f) &&
      approxf(sampleToFloat(neg1, SampleFormat::I16), -1.0f) &&
      mx > 0.99f && mx < 1.0f)
    PASS();
  else
    FAIL("i16 conversion wrong");
}

void testSampleConvert_i32() {
  TEST("I32 scaling (incl. 24-in-32)");
  uint8_t half[4] = {0x00, 0x00, 0x00, 0x40};  // 0x40000000 = 2^30 -> 0.5
  uint8_t neg1[4] = {0x00, 0x00, 0x00, 0x80};  // 0x80000000 = -2^31 -> -1.0
  if (approxf(sampleToFloat(half, SampleFormat::I32), 0.5f) &&
      approxf(sampleToFloat(neg1, SampleFormat::I32), -1.0f))
    PASS();
  else
    FAIL("i32 conversion wrong");
}

void testSampleConvert_i24() {
  TEST("I24 packed scaling + sign-extend");
  uint8_t zero[3] = {0x00, 0x00, 0x00};
  uint8_t half[3] = {0x00, 0x00, 0x40};  // 0x400000 = 2^22 -> 0.5
  uint8_t neg1[3] = {0x00, 0x00, 0x80};  // 0x800000 -> -2^23 -> -1.0
  uint8_t negS[3] = {0xFF, 0xFF, 0xFF};  // 0xFFFFFF -> -1 -> tiny negative
  float ns = sampleToFloat(negS, SampleFormat::I24);
  if (approxf(sampleToFloat(zero, SampleFormat::I24), 0.0f) &&
      approxf(sampleToFloat(half, SampleFormat::I24), 0.5f) &&
      approxf(sampleToFloat(neg1, SampleFormat::I24), -1.0f) &&
      ns < 0.0f && ns > -0.001f)
    PASS();
  else
    FAIL("i24 conversion wrong");
}

// ── Main ───────────────────────────────────────────────────────────

int main() {
  std::cout << "\n=== FloatRingBuffer ===" << std::endl;
  testRingBuffer_writeAndReadLatest();
  testRingBuffer_writeSingle();
  testRingBuffer_overflowWrap();
  testRingBuffer_iterLatest();
  testRingBuffer_iterLatest_clampToCount();
  testRingBuffer_readLatestThrows();
  testRingBuffer_countTracking();
  testRingBuffer_wrapReadLatest();

  std::cout << "\n=== TripleBuffer ===" << std::endl;
  testTripleBuffer_writePublishRead();
  testTripleBuffer_publishSwaps();
  testTripleBuffer_readBufStableWithoutPublish();

  std::cout << "\n=== BinMap ===" << std::endl;
  testBinMap_fullCoverage();
  testBinMap_noGaps();
  testBinMap_monotonic();
  testBinMap_differentSampleRates();

  std::cout << "\n=== SampleConvert ===" << std::endl;
  testSampleConvert_bytes();
  testSampleConvert_f32();
  testSampleConvert_i16();
  testSampleConvert_i32();
  testSampleConvert_i24();

  std::cout << "\n────────────────────────" << std::endl;
  std::cout << gTests << " tests, " << gFailed << " failed" << std::endl;

  return gFailed > 0 ? 1 : 0;
}
