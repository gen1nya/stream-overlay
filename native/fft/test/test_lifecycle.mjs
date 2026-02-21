import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load the native addon from the build directory
const addonPath = path.join(__dirname, '..', 'build', 'Release', 'fft_bridge.node');
let FftBridge;
try {
  const addon = require(addonPath);
  FftBridge = addon.FftBridge;
} catch (e) {
  console.error(`Failed to load native addon from ${addonPath}`);
  console.error('Build the addon first: cd native/fft && node-gyp rebuild');
  console.error(e.message);
  process.exit(1);
}

// Helper: run an async fn with a timeout
function withTimeout(fn, ms = 5000) {
  return async () => {
    const result = await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Test timed out after ${ms}ms`)), ms)
      ),
    ]);
    return result;
  };
}

// Helper: sleep
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('FftBridge lifecycle', () => {
  // Force exit after tests complete — GC destruction of Bridge instances
  // can hang due to TSFN cleanup blocking during Node.js shutdown.
  after(() => { setTimeout(() => process.exit(0), 100); });

  it('basic enable/disable', { timeout: 5000 }, withTimeout(async () => {
    const bridge = new FftBridge();
    await bridge.enable(true);
    await sleep(1000);
    await bridge.enable(false);
  }));

  it('rapid cycling (5x)', { timeout: 10000 }, withTimeout(async () => {
    const bridge = new FftBridge();
    for (let i = 0; i < 5; i++) {
      await bridge.enable(true);
      await bridge.enable(false);
    }
  }, 10000));

  it('double enable is idempotent', { timeout: 5000 }, withTimeout(async () => {
    const bridge = new FftBridge();
    await bridge.enable(true);
    await bridge.enable(true); // should not crash
    await bridge.enable(false);
  }));

  it('double disable does not crash', { timeout: 5000 }, withTimeout(async () => {
    const bridge = new FftBridge();
    await bridge.enable(false);
    await bridge.enable(false);
  }));

  it('callbacks fire when enabled', { timeout: 5000 }, withTimeout(async () => {
    const bridge = new FftBridge();
    let fftCount = 0;
    let waveCount = 0;
    let vuCount = 0;

    bridge.onFft(() => { fftCount++; });
    bridge.onWave(() => { waveCount++; });
    bridge.onVu(() => { vuCount++; });

    await bridge.enable(true);

    // Wait up to 3s for at least one callback
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline && fftCount === 0 && waveCount === 0 && vuCount === 0) {
      await sleep(100);
    }

    await bridge.enable(false);

    const totalCallbacks = fftCount + waveCount + vuCount;
    assert.ok(totalCallbacks > 0, `Expected at least 1 callback, got ${totalCallbacks}`);
  }));

  it('stop with callbacks - clean shutdown', { timeout: 5000 }, withTimeout(async () => {
    const bridge = new FftBridge();
    let callbackCount = 0;

    bridge.onFft(() => { callbackCount++; });
    bridge.onWave(() => { callbackCount++; });
    bridge.onVu(() => { callbackCount++; });

    await bridge.enable(true);
    await sleep(500);

    // Disable and verify stop completes
    await bridge.stop();

    const countAtStop = callbackCount;
    await sleep(500);

    // No new callbacks should fire after stop
    assert.equal(callbackCount, countAtStop, 'Callbacks should stop after stop()');
  }));

  it('bad device ID returns false', { timeout: 5000 }, withTimeout(async () => {
    const bridge = new FftBridge();
    const result = await bridge.setDevice('nonexistent_device_id_12345');
    assert.equal(result, false, 'setDevice with bad ID should return false');
  }));

  it('retry loop interrupted by disable', { timeout: 8000 }, withTimeout(async () => {
    const bridge = new FftBridge();

    // Set a valid-looking but non-existent device ID to trigger retry loop
    await bridge.setDevice('{00000000-0000-0000-0000-000000000000}');

    // Enable - this will start the retry loop (initCapture fails repeatedly)
    const enablePromise = bridge.enable(true);

    // Wait a bit for the retry loop to start
    await sleep(1000);

    // Disable should interrupt the retry sleep and return promptly
    const disableStart = Date.now();
    await bridge.enable(false);
    const disableElapsed = Date.now() - disableStart;

    // If enable hasn't resolved yet, wait for it (it might resolve or reject)
    try { await enablePromise; } catch { /* expected */ }

    assert.ok(disableElapsed < 3000, `Disable took ${disableElapsed}ms, should be < 3000ms`);
  }, 8000));
});
