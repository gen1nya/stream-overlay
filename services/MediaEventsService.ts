import { ipcMain } from "electron";
import ElectronStore from "electron-store";
import { MediaEventConfig, StoreSchema } from "./store/StoreSchema";

export class MediaEventsService {
    private appStorage: ElectronStore<StoreSchema>;
    private broadcastCallback: ((channel: string, data: any) => void) | null = null;

    constructor(appStorage: ElectronStore<StoreSchema>) {
        this.appStorage = appStorage;
        this.migrateFromBotConfig();
    }

    /**
     * Миграция: если mediaEvents есть в botConfig, переносим в отдельное хранилище
     */
    private migrateFromBotConfig(): void {
        const bots = this.appStorage.get('bots') || {};
        let migrated = false;

        for (const botName of Object.keys(bots)) {
            const botConfig = bots[botName];
            if (botConfig?.mediaEvents?.events?.length > 0) {
                console.log(`[MediaEventsService] Migrating mediaEvents from bot: ${botName}`);
                const existingEvents = this.getAll();
                const newEvents = botConfig.mediaEvents.events;

                // Мержим, избегая дубликатов по id
                for (const event of newEvents) {
                    if (!existingEvents.find(e => e.id === event.id)) {
                        existingEvents.push(event);
                    }
                }

                this.appStorage.set('mediaEvents', existingEvents);

                // Очищаем в botConfig
                bots[botName].mediaEvents = { events: [] };
                migrated = true;
            }
        }

        if (migrated) {
            this.appStorage.set('bots', bots);
            console.log(`[MediaEventsService] Migration complete`);
        }
    }

    setBroadcastCallback(callback: (channel: string, data: any) => void): void {
        this.broadcastCallback = callback;
    }

    private broadcast(channel: string, data: any): void {
        if (this.broadcastCallback) {
            this.broadcastCallback(channel, data);
        }
    }

    getAll(): MediaEventConfig[] {
        return this.appStorage.get('mediaEvents') || [];
    }

    get(id: string): MediaEventConfig | undefined {
        const events = this.getAll();
        return events.find(e => e.id === id);
    }

    save(mediaEvent: MediaEventConfig): boolean {
        try {
            const events = this.getAll();
            const existingIndex = events.findIndex(e => e.id === mediaEvent.id);

            if (existingIndex >= 0) {
                events[existingIndex] = mediaEvent;
            } else {
                events.push(mediaEvent);
            }

            this.appStorage.set('mediaEvents', events);
            this.broadcast('media:updated', events);
            return true;
        } catch (error) {
            console.error('[MediaEventsService] Failed to save:', error);
            return false;
        }
    }

    delete(id: string): boolean {
        try {
            const events = this.getAll();
            const filtered = events.filter(e => e.id !== id);

            if (filtered.length === events.length) {
                return false; // Не найден
            }

            this.appStorage.set('mediaEvents', filtered);
            this.broadcast('media:updated', filtered);
            return true;
        } catch (error) {
            console.error('[MediaEventsService] Failed to delete:', error);
            return false;
        }
    }

    registerIpcHandlers(): void {
        ipcMain.handle('media:get-all', async () => {
            return this.getAll();
        });

        ipcMain.handle('media:get', async (_e, id: string) => {
            return this.get(id);
        });

        ipcMain.handle('media:save', async (_e, mediaEvent: MediaEventConfig) => {
            return this.save(mediaEvent);
        });

        ipcMain.handle('media:delete', async (_e, id: string) => {
            return this.delete(id);
        });
    }
}
