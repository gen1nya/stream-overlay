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

export type ObsConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ObsStatusSnapshot {
    status: ObsConnectionStatus;
    lastError: string | null;
    host: string;
    port: number;
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
    private isShuttingDown = false;

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
        };
    }

    private setStatus(status: ObsConnectionStatus, error: string | null = null): void {
        this.status = status;
        this.lastError = error;
        this.broadcast('obs:status', this.getStatusSnapshot());
    }

    async connect(): Promise<boolean> {
        if (this.status === 'connecting' || this.status === 'connected') {
            return this.status === 'connected';
        }

        const config = this.getConnectionConfig();
        this.userInitiatedDisconnect = false;
        this.cancelReconnect();
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
            const message = error?.message || String(error);
            console.warn(`[ObsService] Connect failed: ${message}`);
            this.setStatus('error', message);
            this.scheduleReconnect();
            return false;
        }
    }

    async disconnect(): Promise<void> {
        this.userInitiatedDisconnect = true;
        this.cancelReconnect();
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
            const message = err?.message || null;
            console.log(`[ObsService] Connection closed${message ? `: ${message}` : ''}`);
            if (this.userInitiatedDisconnect) {
                this.setStatus('disconnected');
            } else {
                this.setStatus('error', message);
                this.scheduleReconnect();
            }
        });
        client.on('ConnectionError', (err) => {
            if (this.isShuttingDown) return;
            const message = err?.message || String(err);
            console.warn(`[ObsService] Connection error: ${message}`);
            this.setStatus('error', message);
        });

        this.client = client;
    }

    private scheduleReconnect(): void {
        if (this.isShuttingDown || this.userInitiatedDisconnect) return;
        const config = this.getConnectionConfig();
        if (!config.enabled) return;

        const delay = BACKOFF_STEPS_MS[Math.min(this.reconnectAttempt, BACKOFF_STEPS_MS.length - 1)];
        this.reconnectAttempt += 1;
        console.log(`[ObsService] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempt})`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch(() => { /* handled */ });
        }, delay);
    }

    private cancelReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
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
    }
}
