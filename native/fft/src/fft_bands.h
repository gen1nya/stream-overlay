#pragma once
#include <vector>
#include <cmath>  // sqrt, floor, ceil

struct BandPlan {
  int fftSize = 4096;
  int columns = 256;
  int hopSize = 256;        // ~5.8 ms at 44.1k
  float dbFloor = -80.0f;
};

// Center frequencies copied from your service (geometric spacing).
extern const double kBandCenters[256];

struct BinMap {
  std::vector<int> start;
  std::vector<int> end;
};

inline BinMap makeBinMap(int sampleRate, int fftSize, int columns) {
  int halfBins = fftSize / 2;
  double binWidth = double(sampleRate) / double(fftSize);
  BinMap m; m.start.resize(columns); m.end.resize(columns);
  for (int b = 0; b < columns; ++b) {
    double fLo = b == 0 ? 0.0 : std::sqrt(kBandCenters[b-1] * kBandCenters[b]);
    double fHi = b == columns-1 ? sampleRate/2.0 - 1.0 : std::sqrt(kBandCenters[b] * kBandCenters[b+1]);
    int s = int(std::floor(fLo / binWidth));
    int e = int(std::ceil (fHi / binWidth));
    if (s < 0) s = 0; if (e > halfBins) e = halfBins; if (e <= s) e = s + 1;
    m.start[b] = s; m.end[b] = e;
  }
  return m;
}