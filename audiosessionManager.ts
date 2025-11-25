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

    // Кеш для текущего состояния медиасессии
    private currentMediaMetadata: MediaMetadata | null = null;
    private currentFFTSpectrum: number[] | null = null;

    constructor(store: ElectronStore<StoreSchema>, logService: LogService) {
        this.appStorage = store;
        this.config = this.appStorage.get("audio")

        this.fftbridge.setDbFloor(this.config.fft.dbFloor)
        this.fftbridge.setMasterGain(this.config.fft.masterGain)
        this.fftbridge.setTilt(this.config.fft.tilt)

        const device = this.config.fft.device;
        if (device) {
            const devices = this.fftbridge.listDevices()
            const validDevice = devices.find(d => d.id === device.id);
            if (validDevice) {
                logService.logMessage(`Restoring saved audio device: ${device.name}`);
            } else {
                logService.logMessage(`Saved audio device not found: ${device.name}; Reset`);
                this.appStorage.set("audio.fft.device", null);
            }
            if (validDevice) {
                // setDevice might be sync or async depending on module version
                const setDeviceResult = this.fftbridge.setDevice(device.id);
                const handleSuccess = (success: boolean) => {
                    if (success) {
                        this.fftbridge.setLoopback(device.flow === 'render');
                        console.log(`Audio device set to: ${device.name}`);
                        logService.logMessage(`Audio device set to: ${device.name}`);
                        if (this.config.fft.enabled) {
                            const enableResult = this.fftbridge.enable(true);
                            if (enableResult && typeof enableResult.then === 'function') {
                                enableResult.then(() => {
                                    console.log("FFT enabled");
                                }).catch((err) => {
                                    console.error("Failed to enable FFT:", err);
                                });
                            } else {
                                console.log("FFT enabled");
                            }
                        }
                    } else {
                        logService.logMessage(`Failed to set audio device: ${device.name}`);
                        console.error(`Failed to set audio device: ${device.name}`);
                    }
                };

                if (setDeviceResult && typeof setDeviceResult.then === 'function') {
                    setDeviceResult.then(handleSuccess).catch((err) => {
                        logService.logMessage(`Error setting audio device: ${err.message}`);
                        console.error(`Error setting audio device:`, err);
                    });
                } else {
                    handleSuccess(setDeviceResult as boolean);
                }
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
        const vuSource = new Promise((resolve) => {
            this.fftbridge.onVu((vu: Uint8Array) => {
                this.mediaWss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(this.createMessage(2, vu));
                    }
                });
            })
        });
        const waveFormSource = new Promise((resolve) => {
            this.fftbridge.onWave((waveform: Int16Array) => {
                this.mediaWss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(this.createMessage(0, waveform));
                    }
                });
            })
        });
        const fftSource = new Promise((resolve) => {
            this.fftbridge.onFft((spectrum: Uint8Array) => {
                const spectrumValues = Object.values(spectrum) as number[];
                this.currentFFTSpectrum = spectrumValues;
                this.broadcastMedia('fft', spectrumValues);
                this.mediaWss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(this.createMessage(1, spectrum));
                    }
                });
            })
        });

        const mediaSessionSource = new Promise((resolve) => {
            this.gsmtcBridge.start((s) => {
                const status =
                    s.playbackStatus === 4 ? "Playing" : s.playbackStatus;

                // Sticky state: ignore empty/invalid data from temporary tab switches
                // Only update if we have valid data (non-empty title)
                const hasValidData = s.title && s.title.trim().length > 0;

                if (!hasValidData) {
                    // Invalid/empty data (e.g., tab switch in browser) - keep current state
                    // This includes "Stopped" with empty appId/title which is just noise
                    return;
                }

                let albumArt: string | undefined = undefined;

                if (s.imageUrl) {
                    // если Linux дал URL — используем его
                    albumArt = s.imageUrl;
                } else if (s.thumbnail && (s.thumbnail as Buffer).length) {
                    // иначе — Windows thumbnail → base64
                    const mime = this.detectMime(s.thumbnail as Buffer);
                    const b64 = (s.thumbnail as Buffer).toString("base64");
                    albumArt = `data:${mime};base64,${b64}`;
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
        });

        mediaSessionSource.then(() => {
            console.log("GSMTCBridge finished successfully");
        }).catch((err) => {
            console.error("Error starting GSMTCBridge:", err);
        });

        fftSource.then(() => {
            console.log("FftBridge finished successfully");
        }).catch((err) => {
            console.error("Error starting FftBridge:", err);
        });

        waveFormSource.then(() => {
            console.log("Waveform source finished successfully");
        }).catch((err) => {
            console.error("Error in waveform source:", err);
        });

        vuSource.then(() => {
            console.log("VU source finished successfully");
        }).catch((err) => {
            console.error("Error in VU source:", err);
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

        console.log("✅ [AudiosessionManager] AudiosessionManager closed");
    }

    getDevices(): AudioDevice[] {
        return this.fftbridge.listDevices();
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