import { ipcMain, app } from "electron";
import ElectronStore from "electron-store";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { MediaFile, MediaFileType, StoreSchema } from "./store/StoreSchema";

// MIME type to file type mapping
const MIME_TO_TYPE: Record<string, MediaFileType> = {
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/gif': 'image',
    'image/webp': 'image',
    'image/svg+xml': 'image',
    'video/mp4': 'video',
    'video/webm': 'video',
    'video/quicktime': 'video',
    'audio/mpeg': 'audio',
    'audio/wav': 'audio',
    'audio/ogg': 'audio',
    'audio/flac': 'audio',
    'audio/aac': 'audio',
    'audio/x-m4a': 'audio',
};

// Extension to MIME type mapping (fallback)
const EXT_TO_MIME: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.m4a': 'audio/x-m4a',
};

export class MediaLibraryService {
    private appStorage: ElectronStore<StoreSchema>;
    private broadcastCallback: ((channel: string, data: any) => void) | null = null;
    private mediaBasePath: string;

    constructor(appStorage: ElectronStore<StoreSchema>) {
        this.appStorage = appStorage;
        this.mediaBasePath = path.join(app.getPath('userData'), 'media');
        this.ensureDirectories();
        this.migrateExistingImages();
    }

    /**
     * Ensure media directories exist
     */
    private ensureDirectories(): void {
        const dirs = ['images', 'videos', 'audio'];
        for (const dir of dirs) {
            const dirPath = path.join(this.mediaBasePath, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`[MediaLibraryService] Created directory: ${dirPath}`);
            }
        }
    }

    /**
     * Migrate existing images from userData/images/ to media library
     */
    private migrateExistingImages(): void {
        const oldImagesPath = path.join(app.getPath('userData'), 'images');
        if (!fs.existsSync(oldImagesPath)) return;

        const existingFiles = this.getAll();
        const existingFilenames = new Set(existingFiles.map(f => f.originalName));

        try {
            const files = fs.readdirSync(oldImagesPath);
            let migratedCount = 0;

            for (const filename of files) {
                // Skip if already in library
                if (existingFilenames.has(filename)) continue;

                const filePath = path.join(oldImagesPath, filename);
                const stats = fs.statSync(filePath);

                // Skip directories
                if (stats.isDirectory()) continue;

                const ext = path.extname(filename).toLowerCase();
                const mimeType = EXT_TO_MIME[ext];

                // Only migrate known image types
                if (mimeType && MIME_TO_TYPE[mimeType] === 'image') {
                    const mediaFile: MediaFile = {
                        id: uuidv4(),
                        filename: filename, // Keep original filename for backwards compatibility
                        originalName: filename,
                        type: 'image',
                        mimeType: mimeType,
                        size: stats.size,
                        dateAdded: stats.mtimeMs,
                    };
                    existingFiles.push(mediaFile);
                    migratedCount++;
                }
            }

            if (migratedCount > 0) {
                this.appStorage.set('mediaLibrary', existingFiles);
                console.log(`[MediaLibraryService] Migrated ${migratedCount} existing images to library`);
            }
        } catch (error) {
            console.error('[MediaLibraryService] Error migrating existing images:', error);
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

    /**
     * Get directory for file type
     */
    private getTypeDirectory(type: MediaFileType): string {
        const typeDir = type === 'image' ? 'images' : type === 'video' ? 'videos' : 'audio';
        return path.join(this.mediaBasePath, typeDir);
    }

    /**
     * Check if file is a legacy image (stored in old images/ folder)
     */
    private isLegacyImage(file: MediaFile): boolean {
        // Legacy images have filename === originalName (not UUID-prefixed)
        return file.type === 'image' && file.filename === file.originalName;
    }

    /**
     * Get absolute file path for a media file
     */
    getFilePath(file: MediaFile): string {
        if (this.isLegacyImage(file)) {
            // Legacy images are in old images/ folder
            return path.join(app.getPath('userData'), 'images', file.filename);
        }
        return path.join(this.getTypeDirectory(file.type), file.filename);
    }

    /**
     * Get HTTP URL for serving a media file
     */
    getHttpUrl(file: MediaFile): string {
        if (this.isLegacyImage(file)) {
            // Legacy images served from /images/
            return `/images/${encodeURIComponent(file.filename)}`;
        }
        const typeDir = file.type === 'image' ? 'images' : file.type === 'video' ? 'videos' : 'audio';
        return `/media/${typeDir}/${encodeURIComponent(file.filename)}`;
    }

    /**
     * Get all media files
     */
    getAll(): MediaFile[] {
        return this.appStorage.get('mediaLibrary') || [];
    }

    /**
     * Get media files filtered by type
     */
    getByType(type: MediaFileType): MediaFile[] {
        return this.getAll().filter(f => f.type === type);
    }

    /**
     * Get a single media file by ID
     */
    get(id: string): MediaFile | undefined {
        return this.getAll().find(f => f.id === id);
    }

    /**
     * Save a new media file
     */
    async save(
        originalName: string,
        buffer: Buffer,
        mimeType: string,
        dimensions?: { width?: number; height?: number; duration?: number }
    ): Promise<MediaFile | null> {
        try {
            const type = MIME_TO_TYPE[mimeType];
            if (!type) {
                console.error(`[MediaLibraryService] Unknown MIME type: ${mimeType}`);
                return null;
            }

            const ext = path.extname(originalName).toLowerCase() || this.getExtensionForMime(mimeType);
            const id = uuidv4();
            const filename = `${id}${ext}`;
            const filePath = path.join(this.getTypeDirectory(type), filename);

            // Write file to disk
            await fs.promises.writeFile(filePath, buffer);

            const mediaFile: MediaFile = {
                id,
                filename,
                originalName,
                type,
                mimeType,
                size: buffer.length,
                dateAdded: Date.now(),
                ...dimensions,
            };

            const files = this.getAll();
            files.push(mediaFile);
            this.appStorage.set('mediaLibrary', files);

            this.broadcast('media-library:updated', files);
            console.log(`[MediaLibraryService] Saved file: ${originalName} as ${filename}`);

            return mediaFile;
        } catch (error) {
            console.error('[MediaLibraryService] Failed to save file:', error);
            return null;
        }
    }

    /**
     * Delete a media file
     */
    async delete(id: string): Promise<boolean> {
        try {
            const files = this.getAll();
            const file = files.find(f => f.id === id);

            if (!file) {
                return false;
            }

            // Don't delete legacy images from disk (they might be used elsewhere)
            if (!this.isLegacyImage(file)) {
                const filePath = this.getFilePath(file);
                if (fs.existsSync(filePath)) {
                    await fs.promises.unlink(filePath);
                }
            }

            const filtered = files.filter(f => f.id !== id);
            this.appStorage.set('mediaLibrary', filtered);
            this.broadcast('media-library:updated', filtered);

            console.log(`[MediaLibraryService] Deleted file: ${file.originalName}`);
            return true;
        } catch (error) {
            console.error('[MediaLibraryService] Failed to delete file:', error);
            return false;
        }
    }

    /**
     * Get file extension for MIME type
     */
    private getExtensionForMime(mimeType: string): string {
        const entry = Object.entries(EXT_TO_MIME).find(([_, mime]) => mime === mimeType);
        return entry ? entry[0] : '';
    }

    /**
     * Register IPC handlers
     */
    registerIpcHandlers(): void {
        ipcMain.handle('media-library:get-all', async () => {
            return this.getAll();
        });

        ipcMain.handle('media-library:get-by-type', async (_e, type: MediaFileType) => {
            return this.getByType(type);
        });

        ipcMain.handle('media-library:get', async (_e, id: string) => {
            return this.get(id);
        });

        ipcMain.handle('media-library:save', async (_e, originalName: string, buffer: ArrayBuffer, mimeType: string, dimensions?: { width?: number; height?: number; duration?: number }) => {
            return this.save(originalName, Buffer.from(buffer), mimeType, dimensions);
        });

        ipcMain.handle('media-library:delete', async (_e, id: string) => {
            return this.delete(id);
        });

        ipcMain.handle('media-library:get-url', async (_e, id: string) => {
            const file = this.get(id);
            return file ? this.getHttpUrl(file) : null;
        });

        ipcMain.handle('media-library:get-file-path', async (_e, id: string) => {
            const file = this.get(id);
            return file ? this.getFilePath(file) : null;
        });
    }
}
