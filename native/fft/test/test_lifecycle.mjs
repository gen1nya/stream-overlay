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

  // Proves the WASAPI loopback capture path works on SOME render device.
  // We sweep devices instead of relying on the *default* one, because the
  // default endpoint may be held in exclusive mode (e.g. by VoiceMeeter) and
  // return AUDCLNT_E_DEVICE_IN_USE — that's an environment condition, not an
  // API regression, so a single busy/default device must not fail the suite.
  // A genuine Windows/WASAPI breakage would make *every* device yield 0.
  it('at least one render device can be captured (loopback)', { timeout: 60000 }, async () => {
    const probe = new FftBridge();
    const renders = probe.listDevices().filter((d) => d.flow === 'render');
    assert.ok(renders.length > 0, 'no active render devices found');

    let captured = null;
    const skipped = [];
    for (const d of renders) {
      const bridge = new FftBridge();
      let n = 0;
      bridge.onFft(() => { n++; });
      bridge.onWave(() => { n++; });
      bridge.onVu(() => { n++; });

      const ok = await bridge.setDevice(d.id);
      if (!ok) { skipped.push(`${d.name} (setDevice=false)`); continue; }
      bridge.setLoopback(true);
      await bridge.enable(true);

      const deadline = Date.now() + 1500;
      while (Date.now() < deadline && n === 0) await sleep(100);

      await bridge.enable(false);

      if (n > 0) { captured = d.name; break; } // early-exit on first working device
      skipped.push(d.name); // busy (exclusive mode) or no signal
    }

    assert.ok(captured, `No render device produced callbacks. Tried: ${skipped.join('; ')}`);
    console.log(`# captured loopback from: ${captured}`);
  });

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
    bridge.listDevices(); // enumerate first so an unknown id can be rejected (PipeWire validates against the list)
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

  // Verifies the onError plumbing (native -> JS). Enabling the default endpoint
  // either captures cleanly OR fails (e.g. AUDCLNT_E_DEVICE_IN_USE when the
  // default device is held in exclusive mode). Whichever happens, the binding
  // must hold and a reported error must carry a numeric code + message.
  it('onError reports init failures with a numeric code', { timeout: 8000 }, async () => {
    const bridge = new FftBridge();
    let captured = 0;
    const errors = [];
    bridge.onVu(() => { captured++; });
    bridge.onError((code, message) => { errors.push({ code, message }); });

    await bridge.enable(true);
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline && captured === 0 && errors.length === 0) await sleep(100);
    await bridge.enable(false);

    if (errors.length > 0) {
      const e = errors[0];
      assert.equal(typeof e.code, 'number', 'error code should be numeric');
      assert.ok(e.message && e.message.length > 0, 'error message should be non-empty');
      console.log(`# onError fired: code=0x${(e.code >>> 0).toString(16)} ${e.message}`);
    } else {
      assert.ok(captured > 0, 'expected either a reported error or captured callbacks');
      console.log('# default device captured cleanly (no error path exercised)');
    }
  });

  // Exercises follow-system-default mode: enabling with setFollowDefault(true)
  // must resolve the current default endpoint and then either capture it or
  // report why it couldn't (e.g. exclusive-mode busy). Proves the follow path runs.
  it('follow-default mode resolves the default endpoint', { timeout: 8000 }, async () => {
    const bridge = new FftBridge();
    let captured = 0;
    const errors = [];
    bridge.onVu(() => { captured++; });
    bridge.onError((code, message) => { errors.push({ code, message }); });

    bridge.setFollowDefault(true);
    await bridge.enable(true);
    const deadline = Date.now() + 2500;
    while (Date.now() < deadline && captured === 0 && errors.length === 0) await sleep(100);
    await bridge.enable(false);

    assert.ok(captured > 0 || errors.length > 0,
      'follow mode should resolve the default and either capture or report an error');
    console.log(`# follow-default: captured=${captured} errors=${errors.length}` +
      (errors[0] ? ` (${errors[0].message})` : ''));
  });
});
