// macos-media.js - Mock implementation for macOS
const EventEmitter = require("events");

class GSMTCBridge extends EventEmitter {
    constructor() {
        super();
        this.running = false;
        this.callback = null;
        this.errorCallback = null;
        this.intervalId = null;
        this.trackIndex = 0;

        // Mock tracks to cycle through
        this.mockTracks = [
            {
                title: "Mock Song 1 (macOS)",
                artist: "Mock Artist",
                album: "Mock Album",
                appId: "com.apple.Music",
                durationMs: 240000,
                positionMs: 0,
                playbackStatus: "Playing",
                thumbnail: null
            },
            {
                title: "Another Track (macOS)",
                artist: "Test Band",
                album: "Test Album",
                appId: "com.spotify.client",
                durationMs: 180000,
                positionMs: 0,
                playbackStatus: "Playing",
                thumbnail: null
            }
        ];

        console.log("[GSMTCBridge macOS] Mock initialized");
    }

    start(dataCallback, errorCallback) {
        if (this.running) {
            console.warn("[GSMTCBridge macOS] Already running");
            return;
        }

        this.callback = dataCallback;
        this.errorCallback = errorCallback;
        this.running = true;

        console.log("[GSMTCBridge macOS] Started with mock data");

        // Send initial state
        this.sendMockData();

        // Update position every second
        this.intervalId = setInterval(() => {
            if (this.running) {
                this.sendMockData();
            }
        }, 1000);
    }

    stop() {
        if (!this.running) return;

        console.log("[GSMTCBridge macOS] Stopping");
        this.running = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.callback = null;
        this.errorCallback = null;
    }

    sendMockData() {
        if (!this.callback) return;

        const track = this.mockTracks[this.trackIndex];

        // Increment position
        track.positionMs += 1000;

        // If track finished, switch to next
        if (track.positionMs >= track.durationMs) {
            track.positionMs = 0;
            this.trackIndex = (this.trackIndex + 1) % this.mockTracks.length;
            console.log(`[GSMTCBridge macOS] Switching to track ${this.trackIndex + 1}`);
        }

        const state = {
            title: track.title,
            artist: track.artist,
            album: track.album,
            appId: track.appId,
            durationMs: track.durationMs,
            positionMs: track.positionMs,
            playbackStatus: track.playbackStatus,
            thumbnail: track.thumbnail
        };

        try {
            this.callback(state);
            this.emit("data", state);
        } catch (err) {
            console.error("[GSMTCBridge macOS] Error in callback:", err);
            if (this.errorCallback) {
                this.errorCallback({
                    message: err.message,
                    location: "sendMockData",
                    hresult: 0
                });
            }
        }
    }

    getCurrentState() {
        const track = this.mockTracks[this.trackIndex];
        return {
            title: track.title,
            artist: track.artist,
            album: track.album,
            appId: track.appId,
            durationMs: track.durationMs,
            positionMs: track.positionMs,
            playbackStatus: track.playbackStatus,
            thumbnail: track.thumbnail
        };
    }
}

module.exports = {
    GSMTCBridge
};
