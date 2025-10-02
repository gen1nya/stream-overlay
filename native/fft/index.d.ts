export interface Device { id: string; name: string; flow: 'render'|'capture' }
export interface FftBridge {
  listDevices(): Device[]
  setDevice(id: string): boolean
  getCurrentDevice(): Device
  setBufferSize(fftSize: number): void
  setHopSize(hopSize: number): void
  setColumns(columns: number): void
  enable(on: boolean): void
  onFft(cb: (spectrum: Float32Array)=>void): void
  onWave(cb: (waveform: Int16Array )=>void): void
}
export const FftBridge: { new(): FftBridge }