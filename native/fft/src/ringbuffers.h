#pragma once
#include <vector>
#include <stdexcept>
#include <cstring>
#include <atomic>
#include <mutex>
#include <atomic>
#include <mutex>

// Simple float ring buffer
class FloatRingBuffer {
public:
  explicit FloatRingBuffer(size_t size): buf_(size) {}
  size_t count() const { return count_; }
  size_t capacity() const { return buf_.size(); }
  void write(const float* src, size_t n) {
    for (size_t i=0;i<n;++i){ buf_[wpos_] = src[i]; wpos_=(wpos_+1)%buf_.size(); if(count_<buf_.size())++count_; }
  }
  void readLatest(float* dst, size_t n){
    if(count_ < n) throw std::runtime_error("Not enough data");
    size_t start = (wpos_ + buf_.size() - n)%buf_.size();
    for(size_t i=0;i<n;++i) dst[i] = buf_[(start+i)%buf_.size()];
  }
private:
  std::vector<float> buf_;
  size_t wpos_ = 0;
  size_t count_ = 0;
};

// Triple buffer for spectrum handoff
template <typename T>
class TripleBuffer {
public:
  explicit TripleBuffer(size_t count) { for(int i=0;i<3;++i) bufs_.emplace_back(count); }
  std::vector<T>& writeBuf(){ return bufs_[w_]; }
  const std::vector<T>& readBuf(){ return bufs_[r_]; }
  void publish(){ std::lock_guard<std::mutex> g(mu_); std::swap(r_, s_); std::swap(s_, w_); }
private:
  std::vector<std::vector<T>> bufs_;
  int r_=0,w_=1,s_=2; std::mutex mu_;
};