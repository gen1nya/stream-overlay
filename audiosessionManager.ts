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
            if (validDevice && this.fftbridge.setDevice(device.id)) {
                this.fftbridge.setLoopback(device.flow === 'render');
                console.log(`Audio device set to: ${device.name}`);
                logService.logMessage(`Audio device set to: ${device.name}`);
                if (this.config.fft.enabled) {
                    this.fftbridge.enable(true);
                    console.log("FFT enabled");
                }
            } else {
                logService.logMessage(`Failed to set audio device: ${device.name}`);
                console.error(`Failed to set audio device: ${device.name}`);
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

        const source = new Promise((resolve) => {
            this.gsmtcBridge.start((s) => {
                let dataUrl: string | undefined;
                const status = s.playbackStatus === 4 ? 'Playing' : s.playbackStatus;
                if (s.thumbnail && s.thumbnail.length) {
                    const mime = this.detectMime(s.thumbnail as Buffer);
                    const b64 = (s.thumbnail as Buffer).toString('base64');
                    dataUrl = `data:${mime};base64,${b64}`;
                }

                const metadata: MediaMetadata = {
                    title: s.title,
                    artist: s.artist,
                    albumTitle: s.album,
                    appId: s.appId,
                    duration: s.durationMs / 1000,
                    position: s.positionMs / 1000,
                    status: status,
                    albumArtBase64: dataUrl
                };

                // Сохраняем текущее состояние
                this.currentMediaMetadata = metadata;
                this.broadcastMedia('metadata', metadata);
            });
        });

        source.then(() => {
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
        console.log("🛑 Stopping AudiosessionManager...");

        this.mediaWss.close(() => {
            console.log("✅ Media WebSocket server closed");
        });

        this.mediaWss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.close();
            }
        });

        try {
            console.log("🛑 Stopping FFT bridge...");
            this.fftbridge = null;
            console.log("🛑 Stopping GSMTC bridge...");
            this.gsmtcBridge.stop();
            this.gsmtcBridge = null;

            console.log("✅ Native bridges stopped");
        } catch (error) {
            console.error("❌ Error stopping native bridges:", error);
        }

        this.currentMediaMetadata = null;
        this.currentFFTSpectrum = null;

        console.log("✅ AudiosessionManager closed");
    }

    getDevices(): AudioDevice[] {
        return this.fftbridge.listDevices();
    }

    setDevice(device: AudioDevice): boolean {
        const isAlive = this.fftbridge.setDevice(device.id);
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
            if (this.setDevice(device)) {
                // restart the engine to apply the new device
                this.fftbridge.enable(false);
                this.fftbridge.enable(true);
                this.appStorage.set("audio.fft.device", device);
                this.config.fft.device = device;
                console.log(`Audio device set to: ${device.name}`);
                return true;
            } else {
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
            if (enabled) {
                const device = this.config.fft.device;
                if (device) {
                    this.fftbridge.enable(true);
                } else {
                    throw new Error("No audio device set for FFT. Please set a device first.");
                }
            } else {
                this.fftbridge.enable(false);
            }
            this.appStorage.set("audio.fft.enabled", enabled);
            this.config.fft.enabled = enabled;
            return enabled;
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