// linux-media.js with throttling
const dbus = require("dbus-next");
const EventEmitter = require("events");

const { sessionBus } = dbus;

class GSMTCBridge extends EventEmitter {
    constructor() {
        super();
        this.bus = sessionBus();
        this.playerName = null;
        this.propsIface = null;
        this.running = false;
        this.callback = null;
        this.lastState = null;

        this.lastEmitTime = 0;
        this.throttleMs = 1000; // 1-second throttle
    }

    async start(callback) {
        this.callback = callback;
        this.running = true;

        console.log("🔎 Checking available MPRIS players...");
        const names = await this.bus.getProxyObject(
            "org.freedesktop.DBus",
            "/org/freedesktop/DBus"
        ).then(obj =>
            obj.getInterface("org.freedesktop.DBus").ListNames()
        );

        console.log("MPRIS Entries:");
        names
            .filter(n => n.startsWith("org.mpris.MediaPlayer2"))
            .forEach(n => console.log(" -", n));

        try {
            await this.selectInitialPlayer();
            if (this.playerName) {
                await this.subscribeToPlayer(this.playerName);
                await this.updateFromProps();
            }
        } catch (e) {
            console.error("GSMTCBridge (linux) start error:", e);
        }
    }

    stop() {
        this.running = false;
        this.callback = null;
        this.playerName = null;
        this.propsIface = null;
    }

    emitThrottled(state) {
        const now = Date.now();
        if (now - this.lastEmitTime >= this.throttleMs) {
            this.lastEmitTime = now;
            if (this.callback) this.callback(state);
            this.emit("data", state);
        }
    }

    async selectInitialPlayer() {
        const obj = await this.bus.getProxyObject(
            "org.freedesktop.DBus",
            "/org/freedesktop/DBus"
        );
        const iface = obj.getInterface("org.freedesktop.DBus");
        const names = await iface.ListNames();

        const mprisNames = names.filter(n => n.startsWith("org.mpris.MediaPlayer2"));

        const priorityOrder = ["spotify", "vlc", "mpv", "plasma-browser-integration"];

        for (const p of priorityOrder) {
            const match = mprisNames.find(n => n.includes(p));
            if (match) {
                console.log("🎯 Selected best player:", match);
                this.playerName = match;
                return;
            }
        }

        for (const name of mprisNames) {
            try {
                const playerObj = await this.bus.getProxyObject(
                    name, "/org/mpris/MediaPlayer2"
                );
                const ifaces = playerObj.interfaces.map(i => i.name);

                if (ifaces.includes("org.mpris.MediaPlayer2.Player")) {
                    console.log("🎯 Selected fallback player:", name);
                    this.playerName = name;
                    return;
                }
            } catch {}
        }

        console.warn("⚠ Нет активных медиаплееров");
        this.playerName = null;
    }

    async subscribeToPlayer(name) {
        const tryPaths = [
            "/org/mpris/MediaPlayer2",
            "/org/mpris/MediaPlayer2/player"
        ];

        for (const path of tryPaths) {
            try {
                const obj = await this.bus.getProxyObject(name, path);
                const propsIface = obj.getInterface("org.freedesktop.DBus.Properties");

                if (propsIface) {
                    this.propsIface = propsIface;
                    this.playerPath = path;

                    this.propsIface.on("PropertiesChanged", () =>
                        this.updateFromProps().catch(console.error)
                    );

                    console.log("✔ Subscribed to MPRIS player:", name, "at", path);
                    return;
                }
            } catch {}
        }

        console.error("✖ Failed to subscribe to player:", name, "(no valid Paths)");
    }

    async updateFromProps() {
        if (!this.playerName || !this.playerPath) return;

        try {
            const obj = await this.bus.getProxyObject(
                this.playerName,
                this.playerPath
            );

            const props = obj.getInterface("org.freedesktop.DBus.Properties");

            const unwrap = (v) => Array.isArray(v) ? v[0] : v;

            const metaVar     = unwrap(await props.Get("org.mpris.MediaPlayer2.Player", "Metadata"));
            const statusVar   = unwrap(await props.Get("org.mpris.MediaPlayer2.Player", "PlaybackStatus"));
            const positionVar = unwrap(await props.Get("org.mpris.MediaPlayer2.Player", "Position"));

            const toNumber = (v) => typeof v === "bigint" ? Number(v) : (typeof v === "number" ? v : 0);

            const meta = metaVar?.value || {};
            const status = statusVar?.value || "Stopped";
            const positionUs = toNumber(positionVar?.value);
            const lengthUs = toNumber(meta["mpris:length"]?.value);

            const artUrl = meta["mpris:artUrl"]?.value || null;
            let thumbnail = null;

            if (artUrl && artUrl.startsWith("file://")) {
                const filePath = decodeURIComponent(artUrl.replace("file://", ""));
                try {
                    const fs = require("fs");
                    thumbnail = fs.readFileSync(filePath);
                } catch {}
            }

            const state = {
                title: meta["xesam:title"]?.value || "",
                artist: Array.isArray(meta["xesam:artist"]?.value)
                    ? meta["xesam:artist"].value.join(", ")
                    : "",
                album: meta["xesam:album"]?.value || "",
                appId: this.playerName,
                durationMs: Math.floor(lengthUs / 1000),
                positionMs: Math.floor(positionUs / 1000),
                playbackStatus: status,
                imageUrl: artUrl && !artUrl.startsWith("file://") ? artUrl : null,
                thumbnail,
            };

            this.lastState = state;
            this.emitThrottled(state);

        } catch (e) {
            console.error("Failed to read MPRIS props:", e);
        }
    }

    getCurrentState() {
        return this.lastState;
    }
}

module.exports = {
    GSMTCBridge
};