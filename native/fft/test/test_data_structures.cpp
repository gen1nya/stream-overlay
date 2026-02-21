#include <cassert>
#include <cstring>
#include <cmath>
#include <iostream>
#include <string>
#include <vector>

#include "../src/ringbuffers.h"
#include "../src/fft_bands.h"

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

  std::cout << "\n────────────────────────" << std::endl;
  std::cout << gTests << " tests, " << gFailed << " failed" << std::endl;

  return gFailed > 0 ? 1 : 0;
}
