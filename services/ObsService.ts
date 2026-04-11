import { ipcMain } from "electron";
import ElectronStore from "electron-store";
import keytar from "keytar";
import OBSWebSocket from "obs-websocket-js";
import { ObsActionConfig, ObsConnectionConfig, StoreSchema } from "./store/StoreSchema";

const KEYTAR_SERVICE = 'TwitchWatcherObs';
const KEYTAR_ACCOUNT = 'obs-password';

const DEFAULT_CONNECTION: ObsConnectionConfig = {
    enabled: false,
    host: 'localhost',
    port: 4455,
    autoConnect: false,
};

const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000, 15000, 30000];

function formatObsError(err: any): string {
    if (!err) return '';
    // obs-websocket-js OBSWebSocketError carries { code, message }. The
    // native WebSocket also produces errors whose .message is sometimes
    // literally "Error" — in that case we fall through to the .code.
    const msg = err?.message;
    const code = err?.code;
    if (msg && msg !== 'Error' && msg !== '[object Object]') {
        return code ? `${msg} (code=${code})` : msg;
    }
    if (code !== undefined && code !== null) return `code=${code}`;
    try {
        return String(err);
    } catch {
        return 'unknown error';
    }
}

export type ObsConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ObsStatusSnapshot {
    status: ObsConnectionStatus;
    lastError: string | null;
    host: string;
    port: number;
    // Timestamp (ms since epoch) when the next auto-reconnect attempt
    // will fire, or null if there is no pending retry. The renderer
    // uses this to render a live countdown next to the status badge.
    nextRetryAt: number | null;
}

export interface ObsSceneInfo {
    sceneName: string;
}

export interface ObsInputInfo {
    inputName: string;
    inputKind: string;
}

export interface ObsSceneItemInfo {
    sceneItemId: number;
    sourceName: string;
    inputKind: string | null;
    sceneItemEnabled: boolean;
    isGroup: boolean;
}

export interface ObsFilterInfo {
    filterName: string;
    filterKind: string;
    filterEnabled: boolean;
}

export class ObsService {
    private appStorage: ElectronStore<StoreSchema>;
    private broadcastCallback: ((channel: string, data: any) => void) | null = null;

    private client: OBSWebSocket | null = null;
    private status: ObsConnectionStatus = 'disconnected';
    private lastError: string | null = null;

    private userInitiatedDisconnect = false;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private reconnectAttempt = 0;
    private nextRetryAt: number | null = null;
    private isShuttingDown = false;

    // Live-data caches, invalidated on disconnect.
    private scenesCache: ObsSceneInfo[] | null = null;
    private inputsCache: ObsInputInfo[] | null = null;
    private hotkeysCache: string[] | null = null;
    private sceneItemsCache: Map<string, ObsSceneItemInfo[]> = new Map();
    private filtersCache: Map<string, ObsFilterInfo[]> = new Map();

    constructor(appStorage: ElectronStore<StoreSchema>) {
        this.appStorage = appStorage;
    }

    setBroadcastCallback(callback: (channel: string, data: any) => void): void {
        this.broadcastCallback = callback;
    }

    private broadcast(channel: string, data: any): void {
        if (this.broadcastCallback) {
            this.broadcastCallback(channel, data);
        }
    }

    // ─── CRUD over obsActions[] ─────────────────────────────

    getAll(): ObsActionConfig[] {
        return this.appStorage.get('obsActions') || [];
    }

    get(id: string): ObsActionConfig | undefined {
        return this.getAll().find(a => a.id === id);
    }

    save(action: ObsActionConfig): boolean {
        try {
            const actions = this.getAll();
            const existingIndex = actions.findIndex(a => a.id === action.id);

            if (existingIndex >= 0) {
                actions[existingIndex] = action;
            } else {
                actions.push(action);
            }

            this.appStorage.set('obsActions', actions);
            this.broadcast('obs:updated', actions);
            return true;
        } catch (error) {
            console.error('[ObsService] Failed to save:', error);
            return false;
        }
    }

    delete(id: string): boolean {
        try {
            const actions = this.getAll();
            const filtered = actions.filter(a => a.id !== id);

            if (filtered.length === actions.length) {
                return false;
            }

            this.appStorage.set('obsActions', filtered);
            this.broadcast('obs:updated', filtered);
            return true;
        } catch (error) {
            console.error('[ObsService] Failed to delete:', error);
            return false;
        }
    }

    // ─── Connection config + keytar ──────────────────────────

    getConnectionConfig(): ObsConnectionConfig {
        return this.appStorage.get('obsConnection') || DEFAULT_CONNECTION;
    }

    async saveConnectionConfig(config: ObsConnectionConfig): Promise<boolean> {
        try {
            const prev = this.getConnectionConfig();
            this.appStorage.set('obsConnection', config);
            this.broadcast('obs:connection-updated', config);

            const hostChanged = prev.host !== config.host || prev.port !== config.port;
            if (hostChanged && this.status === 'connected') {
                await this.disconnect();
                if (config.enabled) {
                    this.connect().catch(() => { /* status broadcast handles it */ });
                }
            }
            return true;
        } catch (error) {
            console.error('[ObsService] Failed to save connection config:', error);
            return false;
        }
    }

    private async getStoredPassword(): Promise<string | null> {
        try {
            return await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
        } catch (error) {
            console.error('[ObsService] keytar read failed:', error);
            return null;
        }
    }

    async setPassword(password: string): Promise<boolean> {
        try {
            if (password) {
                await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, password);
            } else {
                await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
            }
            return true;
        } catch (error) {
            console.error('[ObsService] Failed to write password:', error);
            return false;
        }
    }

    async hasPassword(): Promise<boolean> {
        const pw = await this.getStoredPassword();
        return Boolean(pw);
    }

    // ─── Connection lifecycle ────────────────────────────────

    getStatusSnapshot(): ObsStatusSnapshot {
        const config = this.getConnectionConfig();
        return {
            status: this.status,
            lastError: this.lastError,
            host: config.host,
            port: config.port,
            nextRetryAt: this.nextRetryAt,
        };
    }

    private setStatus(status: ObsConnectionStatus, error: string | null = null): void {
        this.status = status;
        this.lastError = error;
        if (status !== 'connected') {
            this.invalidateCache();
        }
        this.broadcast('obs:status', this.getStatusSnapshot());
    }

    // ─── Live data (with lazy cache) ─────────────────────────

    invalidateCache(): void {
        this.scenesCache = null;
        this.inputsCache = null;
        this.hotkeysCache = null;
        this.sceneItemsCache.clear();
        this.filtersCache.clear();
    }

    private ensureConnected(): boolean {
        return this.status === 'connected' && this.client !== null;
    }

    async listScenes(force = false): Promise<ObsSceneInfo[]> {
        if (!force && this.scenesCache) return this.scenesCache;
        if (!this.ensureConnected()) {
            console.warn('[ObsService] listScenes: not connected');
            return [];
        }
        try {
            const res = await this.client!.call('GetSceneList');
            // obs-websocket returns scenes in reverse order of the OBS UI;
            // reverse so UI dropdowns match what the user sees in OBS.
            const scenes: ObsSceneInfo[] = (res.scenes as any[])
                .slice()
                .reverse()
                .map(s => ({ sceneName: String(s.sceneName) }));
            this.scenesCache = scenes;
            return scenes;
        } catch (error) {
            console.error('[ObsService] listScenes failed:', formatObsError(error));
            return [];
        }
    }

    async listInputs(force = false): Promise<ObsInputInfo[]> {
        if (!force && this.inputsCache) return this.inputsCache;
        if (!this.ensureConnected()) {
            console.warn('[ObsService] listInputs: not connected');
            return [];
        }
        try {
            const res = await this.client!.call('GetInputList');
            const inputs: ObsInputInfo[] = (res.inputs as any[]).map(i => ({
                inputName: String(i.inputName),
                inputKind: String(i.inputKind ?? ''),
            }));
            this.inputsCache = inputs;
            return inputs;
        } catch (error) {
            console.error('[ObsService] listInputs failed:', formatObsError(error));
            return [];
        }
    }

    async listHotkeys(force = false): Promise<string[]> {
        if (!force && this.hotkeysCache) return this.hotkeysCache;
        if (!this.ensureConnected()) {
            console.warn('[ObsService] listHotkeys: not connected');
            return [];
        }
        try {
            const res = await this.client!.call('GetHotkeyList');
            const hotkeys = (res.hotkeys as string[]).slice();
            this.hotkeysCache = hotkeys;
            return hotkeys;
        } catch (error) {
            console.error('[ObsService] listHotkeys failed:', formatObsError(error));
            return [];
        }
    }

    async listSceneItems(sceneName: string, force = false): Promise<ObsSceneItemInfo[]> {
        if (!force) {
            const cached = this.sceneItemsCache.get(sceneName);
            if (cached) return cached;
        }
        if (!this.ensureConnected()) {
            console.warn('[ObsService] listSceneItems: not connected');
            return [];
        }
        try {
            const res = await this.client!.call('GetSceneItemList', { sceneName });
            // Reverse so topmost item in OBS UI comes first.
            const items: ObsSceneItemInfo[] = (res.sceneItems as any[])
                .slice()
                .reverse()
                .map(item => ({
                    sceneItemId: Number(item.sceneItemId),
                    sourceName: String(item.sourceName),
                    inputKind: item.inputKind ? String(item.inputKind) : null,
                    sceneItemEnabled: Boolean(item.sceneItemEnabled),
                    isGroup: Boolean(item.isGroup),
                }));
            this.sceneItemsCache.set(sceneName, items);
            return items;
        } catch (error) {
            console.error(`[ObsService] listSceneItems(${sceneName}) failed:`, formatObsError(error));
            return [];
        }
    }

    async listSourceFilters(sourceName: string, force = false): Promise<ObsFilterInfo[]> {
        if (!force) {
            const cached = this.filtersCache.get(sourceName);
            if (cached) return cached;
        }
        if (!this.ensureConnected()) {
            console.warn('[ObsService] listSourceFilters: not connected');
            return [];
        }
        try {
            const res = await this.client!.call('GetSourceFilterList', { sourceName });
            const filters: ObsFilterInfo[] = (res.filters as any[]).map(f => ({
                filterName: String(f.filterName),
                filterKind: String(f.filterKind ?? ''),
                filterEnabled: Boolean(f.filterEnabled),
            }));
            this.filtersCache.set(sourceName, filters);
            return filters;
        } catch (error) {
            console.error(`[ObsService] listSourceFilters(${sourceName}) failed:`, formatObsError(error));
            return [];
        }
    }

    async refreshCache(): Promise<void> {
        this.invalidateCache();
        if (!this.ensureConnected()) return;
        // Warm the top-level caches. Per-scene/per-source caches stay lazy.
        await Promise.all([
            this.listScenes(true),
            this.listInputs(true),
            this.listHotkeys(true),
        ]);
    }

    // ─── Action execution ────────────────────────────────────

    async executeAction(actionId: string): Promise<boolean> {
        const action = this.get(actionId);
        if (!action) {
            console.warn(`[ObsService] executeAction: action not found: ${actionId}`);
            return false;
        }
        return this.executeActionConfig(action);
    }

    async executeActionConfig(action: ObsActionConfig): Promise<boolean> {
        if (!this.ensureConnected()) {
            console.warn('[ObsService] executeActionConfig: not connected');
            return false;
        }
        const client = this.client!;
        try {
            switch (action.operation) {
                case 'switch_scene': {
                    await client.call('SetCurrentProgramScene', { sceneName: action.sceneName });
                    return true;
                }
                case 'toggle_scene_item': {
                    // Always resolve sceneItemId fresh — the OBS-side ID can
                    // change if the user recreates the source, so a cached
                    // value might point at the wrong item.
                    const res = await client.call('GetSceneItemList', { sceneName: action.sceneName });
                    const item = (res.sceneItems as any[]).find(i => i.sourceName === action.sourceName);
                    if (!item) {
                        console.warn(`[ObsService] toggle_scene_item: source "${action.sourceName}" not found in scene "${action.sceneName}"`);
                        return false;
                    }
                    const current = Boolean(item.sceneItemEnabled);
                    const next = action.mode === 'toggle' ? !current : action.mode === 'on';
                    await client.call('SetSceneItemEnabled', {
                        sceneName: action.sceneName,
                        sceneItemId: Number(item.sceneItemId),
                        sceneItemEnabled: next,
                    });
                    return true;
                }
                case 'toggle_filter': {
                    let next: boolean;
                    if (action.mode === 'toggle') {
                        const res: any = await client.call('GetSourceFilter', {
                            sourceName: action.sourceName,
                            filterName: action.filterName,
                        });
                        next = !Boolean(res.filterEnabled);
                    } else {
                        next = action.mode === 'on';
                    }
                    await client.call('SetSourceFilterEnabled', {
                        sourceName: action.sourceName,
                        filterName: action.filterName,
                        filterEnabled: next,
                    });
                    return true;
                }
                case 'trigger_hotkey': {
                    await client.call('TriggerHotkeyByName', { hotkeyName: action.hotkeyName });
                    return true;
                }
                case 'record_control': {
                    if (action.mode === 'start') await client.call('StartRecord');
                    else if (action.mode === 'stop') await client.call('StopRecord');
                    else await client.call('ToggleRecord');
                    return true;
                }
                case 'stream_control': {
                    if (action.mode === 'start') await client.call('StartStream');
                    else if (action.mode === 'stop') await client.call('StopStream');
                    else await client.call('ToggleStream');
                    return true;
                }
                case 'virtualcam_control': {
                    if (action.mode === 'start') await client.call('StartVirtualCam');
                    else if (action.mode === 'stop') await client.call('StopVirtualCam');
                    else await client.call('ToggleVirtualCam');
                    return true;
                }
                case 'media_control': {
                    const mediaAction = `OBS_WEBSOCKET_MEDIA_INPUT_ACTION_${action.mediaAction.toUpperCase()}`;
                    await client.call('TriggerMediaInputAction', {
                        inputName: action.sourceName,
                        mediaAction,
                    });
                    return true;
                }
                default: {
                    const _exhaustive: never = action;
                    console.warn('[ObsService] Unknown OBS action operation:', _exhaustive);
                    return false;
                }
            }
        } catch (error) {
            console.error(`[ObsService] executeActionConfig(${action.operation}) failed:`, formatObsError(error));
            return false;
        }
    }

    async connect(): Promise<boolean> {
        if (this.status === 'connecting' || this.status === 'connected') {
            return this.status === 'connected';
        }

        const config = this.getConnectionConfig();
        this.userInitiatedDisconnect = false;
        // Clear any pending auto-reconnect timer, but preserve the attempt
        // counter so backoff continues to grow across failing attempts.
        this.clearReconnectTimer();
        this.setStatus('connecting');

        const password = (await this.getStoredPassword()) || undefined;
        const url = `ws://${config.host}:${config.port}`;

        try {
            this.ensureClient();
            await this.client!.connect(url, password);
            this.reconnectAttempt = 0;
            this.setStatus('connected');
            console.log(`[ObsService] Connected to ${url}`);
            return true;
        } catch (error: any) {
            const message = formatObsError(error);
            console.warn(`[ObsService] Connect failed: ${message}`);
            this.setStatus('error', message);
            // ConnectionClosed handler may have already scheduled — idempotent.
            this.scheduleReconnect();
            return false;
        }
    }

    async disconnect(): Promise<void> {
        this.userInitiatedDisconnect = true;
        this.resetReconnectState();
        if (this.client) {
            try {
                await this.client.disconnect();
            } catch (error) {
                console.warn('[ObsService] Disconnect error:', error);
            }
        }
        this.setStatus('disconnected');
    }

    async shutdown(): Promise<void> {
        this.isShuttingDown = true;
        await this.disconnect();
    }

    private ensureClient(): void {
        if (this.client) return;

        const client = new OBSWebSocket();
        client.on('ConnectionClosed', (err) => {
            if (this.isShuttingDown) return;
            const message = formatObsError(err);
            console.log(`[ObsService] Connection closed${message ? `: ${message}` : ''}`);
            if (this.userInitiatedDisconnect) {
                this.setStatus('disconnected');
            } else {
                this.setStatus('error', message || null);
                this.scheduleReconnect();
            }
        });
        client.on('ConnectionError', (err) => {
            if (this.isShuttingDown) return;
            const message = formatObsError(err);
            console.warn(`[ObsService] Connection error: ${message}`);
            this.setStatus('error', message);
        });

        this.client = client;
    }

    private scheduleReconnect(): void {
        // Idempotent: if a timer is already pending, the first caller wins.
        // This matters because a failed connect() fires both ConnectionClosed
        // and the catch block — we must schedule exactly one retry.
        if (this.reconnectTimer) return;
        if (this.isShuttingDown || this.userInitiatedDisconnect) return;
        const config = this.getConnectionConfig();
        if (!config.enabled) return;

        const delay = BACKOFF_STEPS_MS[Math.min(this.reconnectAttempt, BACKOFF_STEPS_MS.length - 1)];
        this.reconnectAttempt += 1;
        this.nextRetryAt = Date.now() + delay;
        console.log(`[ObsService] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempt})`);
        // Re-broadcast so the renderer picks up the new nextRetryAt
        // without waiting for the next status transition.
        this.broadcast('obs:status', this.getStatusSnapshot());

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.nextRetryAt = null;
            this.connect().catch(() => { /* handled */ });
        }, delay);
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.nextRetryAt = null;
    }

    private resetReconnectState(): void {
        this.clearReconnectTimer();
        this.reconnectAttempt = 0;
    }

    // ─── IPC ─────────────────────────────────────────────────

    registerIpcHandlers(): void {
        ipcMain.handle('obs:get-all', async () => {
            return this.getAll();
        });

        ipcMain.handle('obs:get', async (_e, id: string) => {
            return this.get(id);
        });

        ipcMain.handle('obs:save', async (_e, action: ObsActionConfig) => {
            return this.save(action);
        });

        ipcMain.handle('obs:delete', async (_e, id: string) => {
            return this.delete(id);
        });

        ipcMain.handle('obs:connection:get', async () => {
            return this.getConnectionConfig();
        });

        ipcMain.handle('obs:connection:save', async (_e, config: ObsConnectionConfig) => {
            return this.saveConnectionConfig(config);
        });

        ipcMain.handle('obs:connection:set-password', async (_e, password: string) => {
            return this.setPassword(password);
        });

        ipcMain.handle('obs:connection:has-password', async () => {
            return this.hasPassword();
        });

        ipcMain.handle('obs:connect', async () => {
            return this.connect();
        });

        ipcMain.handle('obs:disconnect', async () => {
            await this.disconnect();
            return true;
        });

        ipcMain.handle('obs:status', async () => {
            return this.getStatusSnapshot();
        });

        ipcMain.handle('obs:list-scenes', async (_e, force?: boolean) => {
            return this.listScenes(Boolean(force));
        });

        ipcMain.handle('obs:list-inputs', async (_e, force?: boolean) => {
            return this.listInputs(Boolean(force));
        });

        ipcMain.handle('obs:list-hotkeys', async (_e, force?: boolean) => {
            return this.listHotkeys(Boolean(force));
        });

        ipcMain.handle('obs:list-scene-items', async (_e, sceneName: string, force?: boolean) => {
            return this.listSceneItems(sceneName, Boolean(force));
        });

        ipcMain.handle('obs:list-filters', async (_e, sourceName: string, force?: boolean) => {
            return this.listSourceFilters(sourceName, Boolean(force));
        });

        ipcMain.handle('obs:refresh-cache', async () => {
            await this.refreshCache();
            return true;
        });

        ipcMain.handle('obs:test', async (_e, action: ObsActionConfig) => {
            return this.executeActionConfig(action);
        });
    }
}
