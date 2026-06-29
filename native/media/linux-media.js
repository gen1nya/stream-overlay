// linux-media.js — MPRIS bridge (track-all model)
//
// Subscribes to PropertiesChanged on EVERY MPRIS player on the session bus and
// keeps a per-player snapshot. The "active" player is whichever one is actually
// Playing (priority list only breaks ties); when nothing is playing we stick to
// the last active player. This is why a paused/idle Spotify no longer shadows the
// KDE/browser player you're actually listening to. NameOwnerChanged adds/removes
// players live, so a player that appears after startup is picked up too.
const dbus = require("dbus-next");
const EventEmitter = require("events");

const { sessionBus } = dbus;

const MPRIS_PREFIX = "org.mpris.MediaPlayer2";
const PLAYER_PATH = "/org/mpris/MediaPlayer2";
const PLAYER_IFACE = "org.mpris.MediaPlayer2.Player";
const PROPS_IFACE = "org.freedesktop.DBus.Properties";
// Tie-break only: used when several players are Playing, or when none are.
const PRIORITY = ["spotify", "vlc", "mpv", "plasma-browser-integration"];

class GSMTCBridge extends EventEmitter {
    constructor(logger) {
        super();
        this.bus = sessionBus();
        this.logger = typeof logger === "function" ? logger : null;

        this.running = false;
        this.callback = null;
        this.lastState = null;

        // name -> { name, propsIface, onChanged, state }
        this.players = new Map();
        this.activeName = null;

        this._dbusIface = null;
        this._onNameOwnerChanged = null;

        this.lastEmitTime = 0;
        this.throttleMs = 1000; // 1-second throttle (player switches bypass it)
    }

    setLogger(fn) {
        if (typeof fn === "function") this.logger = fn;
    }

    log(msg) {
        try { if (this.logger) this.logger(msg); } catch { /* logger must never break the bridge */ }
        console.log(msg);
    }

    logError(ctx, e) {
        const m = `GSMTCBridge (linux) ${ctx}: ${e && e.message ? e.message : e}`;
        try { if (this.logger) this.logger(m); } catch { /* logger must never break the bridge */ }
        console.error(m, e);
    }

    // Console-only (never the in-app log): expected/benign conditions like a
    // stale browser instance that doesn't expose the Properties interface.
    logDebug(msg) {
        console.log(msg);
    }

    async start(callback) {
        this.callback = callback;
        this.running = true;

        try {
            await this.subscribeNameOwnerChanged();
            const names = await this.listMprisNames();
            this.log(`🔎 MPRIS players at start: ${names.length ? names.join(", ") : "(none)"}`);
            for (const name of names) {
                await this.addPlayer(name);
            }
            this.recomputeActive(true);
        } catch (e) {
            this.logError("start error", e);
        }
    }

    stop() {
        this.running = false;
        this.callback = null;
        for (const name of [...this.players.keys()]) {
            this.removePlayer(name);
        }
        this.players.clear();
        try {
            if (this._dbusIface && this._onNameOwnerChanged) {
                this._dbusIface.off("NameOwnerChanged", this._onNameOwnerChanged);
            }
        } catch { /* best-effort detach on shutdown */ }
        this._dbusIface = null;
        this._onNameOwnerChanged = null;
        this.activeName = null;
    }

    getCurrentState() {
        return this.lastState;
    }

    // ---- bus helpers -------------------------------------------------------

    async getDbusIface() {
        if (this._dbusIface) return this._dbusIface;
        const obj = await this.bus.getProxyObject(
            "org.freedesktop.DBus",
            "/org/freedesktop/DBus"
        );
        this._dbusIface = obj.getInterface("org.freedesktop.DBus");
        return this._dbusIface;
    }

    async listMprisNames() {
        const iface = await this.getDbusIface();
        const names = await iface.ListNames();
        return names.filter((n) => n.startsWith(MPRIS_PREFIX));
    }

    async subscribeNameOwnerChanged() {
        const iface = await this.getDbusIface();
        this._onNameOwnerChanged = (name, oldOwner, newOwner) => {
            if (!name || !name.startsWith(MPRIS_PREFIX)) return;
            if (newOwner && !oldOwner) {
                // player appeared
                this.addPlayer(name)
                    .then(() => this.recomputeActive())
                    .catch((e) => this.logError(`addPlayer ${name}`, e));
            } else if (!newOwner && oldOwner) {
                // player vanished
                this.removePlayer(name);
                this.recomputeActive(true);
            }
        };
        iface.on("NameOwnerChanged", this._onNameOwnerChanged);
    }

    // ---- per-player tracking ----------------------------------------------

    async addPlayer(name) {
        if (this.players.has(name)) return;
        try {
            const obj = await this.bus.getProxyObject(name, PLAYER_PATH);
            // Throws if the player doesn't expose the Properties interface
            // (e.g. a stale browser instance) — skip those.
            const propsIface = obj.getInterface(PROPS_IFACE);

            const entry = { name, propsIface, state: null, onChanged: null };
            entry.onChanged = () => {
                this.refreshPlayer(name)
                    .then(() => this.recomputeActive())
                    .catch((e) => this.logError(`refresh ${name}`, e));
            };
            propsIface.on("PropertiesChanged", entry.onChanged);
            this.players.set(name, entry);

            await this.refreshPlayer(name);
            this.log(`✔ Tracking MPRIS player: ${name}`);
        } catch (e) {
            // A player without the Properties interface (e.g. a stale browser
            // instance) is normal churn — skip quietly, don't surface in-app.
            if (e && /interface not found/i.test(e.message || "")) {
                this.logDebug(`(skip ${name}: no Properties interface)`);
            } else {
                this.logError(`addPlayer ${name}`, e);
            }
        }
    }

    removePlayer(name) {
        const entry = this.players.get(name);
        if (!entry) return;
        try { entry.propsIface.off("PropertiesChanged", entry.onChanged); } catch { /* already gone */ }
        this.players.delete(name);
        if (this.activeName === name) this.activeName = null;
        this.log(`✖ Dropped MPRIS player: ${name}`);
    }

    async refreshPlayer(name) {
        const entry = this.players.get(name);
        if (!entry) return;
        const props = entry.propsIface;

        const unwrap = (v) => (Array.isArray(v) ? v[0] : v);
        const toNumber = (v) => (typeof v === "bigint" ? Number(v) : (typeof v === "number" ? v : 0));

        const metaVar = unwrap(await props.Get(PLAYER_IFACE, "Metadata"));
        const statusVar = unwrap(await props.Get(PLAYER_IFACE, "PlaybackStatus"));
        let positionUs = 0;
        try {
            positionUs = toNumber(unwrap(await props.Get(PLAYER_IFACE, "Position"))?.value);
        } catch {
            // Some players don't implement Position — ignore.
        }

        const meta = metaVar?.value || {};
        const status = statusVar?.value || "Stopped";
        const lengthUs = toNumber(meta["mpris:length"]?.value);

        const artist = meta["xesam:artist"]?.value;
        const artUrl = meta["mpris:artUrl"]?.value || null;
        let thumbnail = null;
        if (artUrl && artUrl.startsWith("file://")) {
            const filePath = decodeURIComponent(artUrl.replace("file://", ""));
            try {
                thumbnail = require("fs").readFileSync(filePath);
            } catch { /* art file missing/unreadable — leave thumbnail null */ }
        }

        entry.state = {
            title: meta["xesam:title"]?.value || "",
            artist: Array.isArray(artist) ? artist.join(", ") : (typeof artist === "string" ? artist : ""),
            album: meta["xesam:album"]?.value || "",
            appId: name,
            durationMs: Math.floor(lengthUs / 1000),
            positionMs: Math.floor(positionUs / 1000),
            playbackStatus: status,
            imageUrl: artUrl && !artUrl.startsWith("file://") ? artUrl : null,
            thumbnail,
        };
    }

    // ---- active-player selection + emit ------------------------------------

    recomputeActive(forceEmit = false) {
        const entries = [...this.players.values()].filter((e) => e.state);
        if (!entries.length) return;

        const priorityIdx = (name) => {
            const i = PRIORITY.findIndex((p) => name.includes(p));
            return i === -1 ? PRIORITY.length : i;
        };
        const byPriority = (a, b) => priorityIdx(a.name) - priorityIdx(b.name);

        const playing = entries
            .filter((e) => e.state.playbackStatus === "Playing")
            .sort(byPriority);

        let chosen;
        if (playing.length) {
            chosen = playing[0]; // someone is playing → follow them
        } else if (this.activeName && this.players.get(this.activeName)?.state) {
            chosen = this.players.get(this.activeName); // nobody playing → stay sticky
        } else {
            chosen = [...entries].sort(byPriority)[0]; // active gone → best by priority
        }

        const changed = chosen.name !== this.activeName;
        this.activeName = chosen.name;
        if (changed) {
            this.log(`🎯 Active MPRIS player: ${chosen.name} (${chosen.state.playbackStatus})`);
        }
        // A player switch must not be swallowed by the throttle.
        this.emitState(chosen.state, forceEmit || changed);
    }

    emitState(state, force = false) {
        if (!this.running) return;
        this.lastState = state;
        const now = Date.now();
        if (force || now - this.lastEmitTime >= this.throttleMs) {
            this.lastEmitTime = now;
            if (this.callback) this.callback(state);
            this.emit("data", state);
        }
    }
}

module.exports = {
    GSMTCBridge
};
