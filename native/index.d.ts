export interface GsmtcState {
    title: string;
    artist: string;
    album: string;
    appId: string;
    durationMs: number;
    positionMs: number;
    playbackStatus: number;
    thumbnail?: Buffer;
}

export interface Device { id: string; name: string; flow: 'render'|'capture' }
export interface FftBridge {
    listDevices(): Device[]
    setDevice(id: string): Promise<boolean>
    getCurrentDevice(): Device
    setBufferSize(fftSize: number): void
    setHopSize(hopSize: number): void
    setColumns(columns: number): void
    setDbFloor(db: number): void
    setMasterGain(gain: number): void
    setTilt(exp: number): void
    setLoopback(on: boolean): void
    enable(on: boolean): Promise<void>
    stop(): Promise<void>
    onFft(cb: (spectrum: Float32Array)=>void): void
    onWave(cb: (waveform: Int16Array)=>void): void
    onVu(cb: (vu: Uint8Array)=>void): void
}

declare const native: {
    GSMTCBridge: new () => {
        start(cb: (s: GsmtcState) => void): void;
        stop(): void;
    };
    FftBridge: FftBridge;
};

export = native;