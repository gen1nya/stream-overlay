import {LogService} from "./services/logService";
import WebSocket from "ws";
import ElectronStore from "electron-store";
import {AudioConfig, AudioDevice, StoreSchema} from "./services/store/StoreSchema";
import {ipcMain} from "electron";

const {media, fft} = require('./native');

interface MediaMetadata {
    title: string;
    artist: string;
    albumTitle: string;
    appId: string;
    duration: number;
    position: number;
    status: string | number;
    albumArtBase64?: string;
}

export class AudiosessionManager {

    private mediaWss = new WebSocket.Server({port: 5001});
    private gsmtcBridge = new media.GSMTCBridge();
    private fftbridge = new fft.FftBridge()
    private appStorage: ElectronStore<StoreSchema>;
    private config: AudioConfig;
    private logService: LogService;

    // Кеш для текущего состояния медиасессии
    private currentMediaMetadata: MediaMetadata | null = null;
    private currentFFTSpectrum: number[] | null = null;

    // Thumbnail cache: skip re-encoding when bytes are identical
    private lastThumbnailBuffer: Buffer | null = null;
    private lastThumbnailBase64: string | null = null;

    constructor(store: ElectronStore<StoreSchema>, logService: LogService) {
        this.appStorage = store;
        this.logService = logService;
        this.config = this.appStorage.get("audio")

        this.fftbridge.setDbFloor(this.config.fft.dbFloor)
        this.fftbridge.setMasterGain(this.config.fft.masterGain)
        this.fftbridge.setTilt(this.config.fft.tilt)

        const device = this.config.fft.device;
        if (device) {
            // Validating the saved device requires enumerating devices, which is now
            // async (runs off the main process). Don't block the constructor on it.
            void this.restoreSavedDevice(device);
        } else {
            // No pinned device → follow the system default endpoint and auto-switch with it.
            logService.logMessage('Audio device: following system default (Auto)');
            this.fftbridge.setFollowDefault(true);
            this.fftbridge.setLoopback(true);
            if (this.config.fft.enabled) {
                Promise.resolve(this.fftbridge.enable(true))
                    .then(() => console.log('FFT enabled (follow default)'))
                    .catch((err) => console.error('Failed to enable FFT (follow default):', err));
            }
        }

        this.setupWebSocketServer();
        this.setupMediaBridges();
    }

    private setupWebSocketServer() {
        this.mediaWss.on('connection', (ws) => {
            console.log('New WebSocket client connected');

            // Отправляем текущее состояние новому клиенту
            if (this.currentMediaMetadata) {
                ws.send(JSON.stringify({
                    type: 'metadata',
                    data: this.currentMediaMetadata
                }));
            }

            if (this.currentFFTSpectrum) {
                ws.send(JSON.stringify({
                    type: 'fft',
                    data: this.currentFFTSpectrum
                }));
            }

            ws.on('close', () => {
                console.log('WebSocket client disconnected');
            });

            ws.on('error', (error) => {
                console.error('WebSocket client error:', error);
            });
        });
    }

    createMessage(type: number, data: Int16Array | Uint8Array): ArrayBuffer {
        const header = new Uint16Array([type]);
        const payload = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

        const combined = new Uint8Array(header.byteLength + payload.length);
        combined.set(new Uint8Array(header.buffer), 0);
        combined.set(payload, header.byteLength);

        return combined.buffer;
    }

    private setupMediaBridges() {
        this.fftbridge.onVu((vu: Uint8Array) => {
            this.mediaWss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(this.createMessage(2, vu));
                }
            });
        });

        this.fftbridge.onWave((waveform: Int16Array) => {
            this.mediaWss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(this.createMessage(0, waveform));
                }
            });
        });

        this.fftbridge.onFft((spectrum: Uint8Array) => {
            const spectrumValues = Array.from(spectrum) as number[];
            this.currentFFTSpectrum = spectrumValues;
            this.broadcastMedia('fft', spectrumValues);
            this.mediaWss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(this.createMessage(1, spectrum));
                }
            });
        });

        // Capture init/streaming errors (e.g. AUDCLNT_E_DEVICE_IN_USE when the
        // device is held in exclusive mode). The engine keeps retrying, but we
        // surface it so the user isn't left with a silently-dead visualizer.
        this.fftbridge.onError((code: number, message: string) => {
            const hex = '0x' + (code >>> 0).toString(16).toUpperCase().padStart(8, '0');
            const text = `FFT capture error ${hex}: ${message}`;
            console.error('[AudiosessionManager]', text);
            this.logService.logMessage(text);
            this.broadcastMedia('fft-error', {code, hex, message});
        });

        // Linux MPRIS bridge logs through the in-app log so failures are visible
        // in a GUI-launched build (no terminal). Native bridges lack setLogger.
        if (typeof (this.gsmtcBridge as any).setLogger === 'function') {
            (this.gsmtcBridge as any).setLogger((m: string) => this.logService.logMessage(m));
        }

        this.gsmtcBridge.start((s) => {
            const status =
                s.playbackStatus === 4 ? "Playing" : s.playbackStatus;

            // Sticky state: ignore empty/invalid data from temporary tab switches
            // Only update if we have valid data (non-empty title)
            const hasValidData = s.title && s.title.trim().length > 0;

            if (!hasValidData) {
                // Invalid/empty data (e.g., tab switch in browser) - keep current state
                return;
            }

            let albumArt: string | undefined = undefined;

            if (s.imageUrl) {
                albumArt = s.imageUrl;
            } else if (s.thumbnail && (s.thumbnail as Buffer).length) {
                const thumbBuf = s.thumbnail as Buffer;
                // Use cached base64 if thumbnail bytes are identical
                if (this.lastThumbnailBuffer && this.lastThumbnailBuffer.equals(thumbBuf)) {
                    albumArt = this.lastThumbnailBase64!;
                } else {
                    const mime = this.detectMime(thumbBuf);
                    const b64 = thumbBuf.toString("base64");
                    albumArt = `data:${mime};base64,${b64}`;
                    this.lastThumbnailBuffer = thumbBuf;
                    this.lastThumbnailBase64 = albumArt;
                }
            }

            const metadata: MediaMetadata = {
                title: s.title,
                artist: s.artist,
                albumTitle: s.album,
                appId: s.appId,
                duration: s.durationMs / 1000,
                position: s.positionMs / 1000,
                status,
                albumArtBase64: albumArt,
            };

            this.currentMediaMetadata = metadata;
            this.broadcastMedia("metadata", metadata);
        });
    }

    close() {
        console.log("🛑 [AudiosessionManager] Stopping AudiosessionManager...");

        console.log("🛑 [AudiosessionManager] Closing WebSocket server...");
        this.mediaWss.close(() => {
            console.log("✅ [AudiosessionManager] Media WebSocket server closed");
        });

        console.log("🛑 [AudiosessionManager] Closing WebSocket clients...");
        this.mediaWss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.close();
            }
        });
        console.log("✅ [AudiosessionManager] All WebSocket clients closed");

        try {
            console.log("🛑 [AudiosessionManager] Stopping GSMTC bridge...");
            this.gsmtcBridge.stop();
            console.log("✅ [AudiosessionManager] GSMTC bridge stopped, setting to null...");
            this.gsmtcBridge = null;
            console.log("✅ [AudiosessionManager] GSMTC bridge set to null");

            console.log("🛑 [AudiosessionManager] Stopping FFT bridge...");
            console.log("🛑 [AudiosessionManager] FFT bridge object:", this.fftbridge);
            console.log("🛑 [AudiosessionManager] FFT bridge type:", typeof this.fftbridge);
            console.log("🛑 [AudiosessionManager] FFT bridge stop type:", typeof this.fftbridge?.stop);

            if (this.fftbridge && typeof this.fftbridge.stop === 'function') {
                console.log("🛑 [AudiosessionManager] Calling FFT bridge stop()...");
                const stopResult = this.fftbridge.stop();
                if (stopResult && typeof stopResult.then === 'function') {
                    // Async version
                    stopResult.then(() => {
                        console.log("✅ [AudiosessionManager] FFT bridge stop() completed (async)");
                    }).catch((err) => {
                        console.error("❌ [AudiosessionManager] FFT bridge stop() error:", err);
                    });
                    console.log("✅ [AudiosessionManager] FFT bridge stop() called (will complete async)");
                } else {
                    // Sync version
                    console.log("✅ [AudiosessionManager] FFT bridge stop() completed (sync)");
                }
            } else {
                console.log("⚠️ [AudiosessionManager] FFT bridge or stop() method not available");
            }

            console.log("✅ [AudiosessionManager] FFT bridge stopped, setting to null...");
            this.fftbridge = null;
            console.log("✅ [AudiosessionManager] FFT bridge set to null");

            console.log("✅ [AudiosessionManager] Native bridges stopped");
        } catch (error) {
            console.error("❌ [AudiosessionManager] Error stopping native bridges:", error);
        }

        this.currentMediaMetadata = null;
        this.currentFFTSpectrum = null;
        this.lastThumbnailBuffer = null;
        this.lastThumbnailBase64 = null;

        console.log("✅ [AudiosessionManager] AudiosessionManager closed");
    }

    async getDevices(): Promise<AudioDevice[]> {
        return this.listDevices();
    }

    // Single-flight device enumeration. listDevices() is now async (runs off the main
    // process), so concurrent callers — e.g. startup restore racing a settings open —
    // could otherwise drive two native enumerations at once and race the engine's
    // registry state. Coalesce overlapping calls into one in-flight enumeration.
    private listDevicesInFlight: Promise<AudioDevice[]> | null = null;

    private listDevices(): Promise<AudioDevice[]> {
        if (!this.listDevicesInFlight) {
            this.listDevicesInFlight = Promise.resolve(this.fftbridge.listDevices())
                .finally(() => { this.listDevicesInFlight = null; });
        }
        return this.listDevicesInFlight;
    }

    // Restore a previously pinned device on startup: enumerate (async), validate it
    // still exists, then set + (optionally) enable. Resets the stored device if gone.
    private async restoreSavedDevice(device: AudioDevice): Promise<void> {
        try {
            const devices = await this.listDevices();
            const validDevice = devices.find(d => d.id === device.id);
            if (!validDevice) {
                this.logService.logMessage(`Saved audio device not found: ${device.name}; Reset`);
                this.appStorage.set("audio.fft.device", null);
                return;
            }

            this.logService.logMessage(`Restoring saved audio device: ${device.name}`);
            const success = await this.fftbridge.setDevice(device.id);
            if (!success) {
                this.logService.logMessage(`Failed to set audio device: ${device.name}`);
                console.error(`Failed to set audio device: ${device.name}`);
                return;
            }

            this.fftbridge.setLoopback(device.flow === 'render');
            console.log(`Audio device set to: ${device.name}`);
            this.logService.logMessage(`Audio device set to: ${device.name}`);

            if (this.config.fft.enabled) {
                await this.fftbridge.enable(true);
                console.log("FFT enabled");
            }
        } catch (err: any) {
            this.logService.logMessage(`Error setting audio device: ${err?.message}`);
            console.error(`Error setting audio device:`, err);
        }
    }

    async setDevice(device: AudioDevice): Promise<boolean> {
        const isAlive = await this.fftbridge.setDevice(device.id);
        this.fftbridge.setLoopback(device.flow === 'render');
        this.appStorage.set("audio.fft.device", device);
        this.config.fft.device = device;
        return isAlive;
    }

    getCurrentMediaState(): { metadata: MediaMetadata | null, spectrum: number[] | null } {
        return {
            metadata: this.currentMediaMetadata,
            spectrum: this.currentFFTSpectrum
        };
    }

    clearMediaState() {
        this.currentMediaMetadata = null;
        this.currentFFTSpectrum = null;
        this.broadcastMedia('clear', null);
    }

    private broadcastMedia(type: string, data: any) {
        const message = JSON.stringify({type, data});
        this.mediaWss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    private detectMime(buf: Buffer): string {
        if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
        if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
        if (buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
        if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4D) return 'image/bmp';
        return 'application/octet-stream';
    }

    registerIPCs() {
        ipcMain.handle('audio:getDevices', async () => {
            return this.getDevices();
        });

        ipcMain.handle('audio:setDevice', async (event, args) => {
            console.log("Setting audio device:", args);

            // Auto / follow system default — no concrete device id was given.
            if (!args || !args.id) {
                this.fftbridge.setFollowDefault(true);
                this.fftbridge.setLoopback(true);
                this.appStorage.set("audio.fft.device", null);
                this.config.fft.device = null;
                await this.fftbridge.enable(false);
                await this.fftbridge.enable(true);
                console.log("Audio device set to: Auto (system default)");
                return true;
            }

            const device: AudioDevice = args;
            try {
                const success = await this.setDevice(device);
                if (success) {
                    // restart the engine to apply the new device (both are now async)
                    await this.fftbridge.enable(false);
                    await this.fftbridge.enable(true);
                    this.appStorage.set("audio.fft.device", device);
                    this.config.fft.device = device;
                    console.log(`Audio device set to: ${device.name}`);
                    return true;
                } else {
                    throw new Error(`Failed to set audio device: ${device.name}`);
                }
            } catch (err) {
                console.error("Error in audio:setDevice:", err);
                throw new Error(`Failed to set audio device: ${device.name}`);
            }
        });

        ipcMain.handle('audio:getCurrentDevice', async () => {
            return this.config.fft.device;
        });

        ipcMain.handle('audio:setFFTGain', async (event, args) => {
            const masterGain = args;
            this.fftbridge.setMasterGain(masterGain);
            this.appStorage.set("audio.fft.masterGain", masterGain);
            this.config.fft.masterGain = masterGain;
            return masterGain;
        })

        ipcMain.handle('audio:setFFTDbFloor', async (event, args) => {
            const dbFloor = args;
            this.fftbridge.setDbFloor(dbFloor);
            this.appStorage.set("audio.fft.dbFloor", dbFloor);
            this.config.fft.dbFloor = dbFloor;
        })

        ipcMain.handle('audio:setFFTTilt', async (event, args) => {
            const tilt = args;
            this.fftbridge.setTilt(tilt);
            this.appStorage.set("audio.fft.tilt", tilt);
            this.config.fft.tilt = tilt;
            return tilt;
        })

        ipcMain.handle('audio:enableFFT', async (event, args) => {
            const enabled = args.enabled;
            try {
                if (enabled) {
                    const device = this.config.fft.device;
                    if (device) {
                        await this.fftbridge.enable(true);
                    } else {
                        throw new Error("No audio device set for FFT. Please set a device first.");
                    }
                } else {
                    await this.fftbridge.enable(false);
                }
                this.appStorage.set("audio.fft.enabled", enabled);
                this.config.fft.enabled = enabled;
                return enabled;
            } catch (err) {
                console.error("Error in audio:enableFFT:", err);
                throw err;
            }
        });

        ipcMain.handle('audio:getFFTConfig', async () => {
            return {
                dbFloor: this.config.fft.dbFloor,
                masterGain: this.config.fft.masterGain,
                tilt: this.config.fft.tilt,
                enabled: this.config.fft.enabled,
                device: this.config.fft.device
            };
        });

        ipcMain.handle('audio:getCurrentMediaState', async () => {
            return this.getCurrentMediaState();
        });

        ipcMain.handle('audio:clearMediaState', async () => {
            this.clearMediaState();
            return true;
        });
    }
}