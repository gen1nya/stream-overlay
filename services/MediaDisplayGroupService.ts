import { ipcMain } from "electron";
import ElectronStore from "electron-store";
import { MediaDisplayGroup, StoreSchema } from "./store/StoreSchema";

// Default group configuration
export const DEFAULT_GROUP: Omit<MediaDisplayGroup, 'id' | 'name'> = {
    enabled: true,
    position: {
        x: 560,  // Centered in 1920 viewport (1920/2 - 400)
        y: 240   // Centered in 1080 viewport (1080/2 - 300)
    },
    size: {
        width: 0,      // auto
        height: 0,     // auto
        maxWidth: 800,
        maxHeight: 600
    },
    animation: {
        in: 'fade',
        out: 'fade',
        inDuration: 300,
        outDuration: 300,
        easing: 'ease-out'
    },
    queue: {
        mode: 'sequential',
        maxItems: 10,
        gapBetween: 500
    },
    defaultDuration: 5,
    zIndex: 100
};

export class MediaDisplayGroupService {
    private appStorage: ElectronStore<StoreSchema>;
    private broadcastCallback: ((channel: string, data: any) => void) | null = null;

    constructor(appStorage: ElectronStore<StoreSchema>) {
        this.appStorage = appStorage;
        this.ensureDefaultGroup();
    }

    /**
     * Ensure at least one default group exists
     */
    private ensureDefaultGroup(): void {
        const groups = this.getAll();
        if (groups.length === 0) {
            const defaultGroup: MediaDisplayGroup = {
                id: 'default',
                name: 'Default',
                ...DEFAULT_GROUP
            };
            this.appStorage.set('mediaDisplayGroups', [defaultGroup]);
            console.log('[MediaDisplayGroupService] Created default group');
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

    getAll(): MediaDisplayGroup[] {
        return this.appStorage.get('mediaDisplayGroups') || [];
    }

    get(id: string): MediaDisplayGroup | undefined {
        const groups = this.getAll();
        return groups.find(g => g.id === id);
    }

    save(group: MediaDisplayGroup): boolean {
        try {
            const groups = this.getAll();
            const existingIndex = groups.findIndex(g => g.id === group.id);

            if (existingIndex >= 0) {
                groups[existingIndex] = group;
            } else {
                groups.push(group);
            }

            this.appStorage.set('mediaDisplayGroups', groups);
            this.broadcast('media-groups:updated', groups);
            return true;
        } catch (error) {
            console.error('[MediaDisplayGroupService] Failed to save:', error);
            return false;
        }
    }

    delete(id: string): boolean {
        try {
            // Don't allow deleting the last group
            const groups = this.getAll();
            if (groups.length <= 1) {
                console.warn('[MediaDisplayGroupService] Cannot delete the last group');
                return false;
            }

            const filtered = groups.filter(g => g.id !== id);
            if (filtered.length === groups.length) {
                return false; // Not found
            }

            this.appStorage.set('mediaDisplayGroups', filtered);
            this.broadcast('media-groups:updated', filtered);
            return true;
        } catch (error) {
            console.error('[MediaDisplayGroupService] Failed to delete:', error);
            return false;
        }
    }

    reorder(orderedIds: string[]): boolean {
        try {
            const groups = this.getAll();
            const reordered: MediaDisplayGroup[] = [];

            for (const id of orderedIds) {
                const group = groups.find(g => g.id === id);
                if (group) {
                    reordered.push(group);
                }
            }

            // Add any groups not in the order list at the end
            for (const group of groups) {
                if (!orderedIds.includes(group.id)) {
                    reordered.push(group);
                }
            }

            this.appStorage.set('mediaDisplayGroups', reordered);
            this.broadcast('media-groups:updated', reordered);
            return true;
        } catch (error) {
            console.error('[MediaDisplayGroupService] Failed to reorder:', error);
            return false;
        }
    }

    registerIpcHandlers(): void {
        ipcMain.handle('media-groups:get-all', async () => {
            return this.getAll();
        });

        ipcMain.handle('media-groups:get', async (_e, id: string) => {
            return this.get(id);
        });

        ipcMain.handle('media-groups:save', async (_e, group: MediaDisplayGroup) => {
            return this.save(group);
        });

        ipcMain.handle('media-groups:delete', async (_e, id: string) => {
            return this.delete(id);
        });

        ipcMain.handle('media-groups:reorder', async (_e, orderedIds: string[]) => {
            return this.reorder(orderedIds);
        });
    }
}
