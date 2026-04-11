import { ipcMain } from "electron";
import ElectronStore from "electron-store";
import { ObsActionConfig, ObsConnectionConfig, StoreSchema } from "./store/StoreSchema";

const DEFAULT_CONNECTION: ObsConnectionConfig = {
    enabled: false,
    host: 'localhost',
    port: 4455,
    autoConnect: false,
};

export class ObsService {
    private appStorage: ElectronStore<StoreSchema>;
    private broadcastCallback: ((channel: string, data: any) => void) | null = null;

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

    getConnectionConfig(): ObsConnectionConfig {
        return this.appStorage.get('obsConnection') || DEFAULT_CONNECTION;
    }

    saveConnectionConfig(config: ObsConnectionConfig): boolean {
        try {
            this.appStorage.set('obsConnection', config);
            this.broadcast('obs:connection-updated', config);
            return true;
        } catch (error) {
            console.error('[ObsService] Failed to save connection config:', error);
            return false;
        }
    }

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
    }
}
