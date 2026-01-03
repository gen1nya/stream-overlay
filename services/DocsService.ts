import { ipcMain, app } from "electron";
import * as fs from "fs";
import * as path from "path";

export interface DocNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    title?: string;  // Extracted from first # heading
    children?: DocNode[];
}

export interface SearchResult {
    path: string;
    title: string;
    matches: string[];  // Context around matches
}

export type SupportedLocale = 'ru' | 'en';

export class DocsService {
    private docsPath: string;

    constructor() {
        // In development, docs are in project root
        // In production, docs are bundled in ASAR
        if (app.isPackaged) {
            this.docsPath = path.join(process.resourcesPath, 'docs');
        } else {
            // __dirname is dist-backend/services/, so go up 2 levels to project root
            this.docsPath = path.join(app.getAppPath(), 'docs');
        }
        console.log('[DocsService] Docs path:', this.docsPath);
        console.log('[DocsService] Exists:', fs.existsSync(this.docsPath));
    }

    /**
     * Get the docs path for a specific locale
     */
    private getLocalePath(locale: SupportedLocale): string {
        return path.join(this.docsPath, locale);
    }

    /**
     * Extract title from markdown content (first # heading)
     */
    private extractTitle(content: string): string | undefined {
        const match = content.match(/^#\s+(.+)$/m);
        return match ? match[1].trim() : undefined;
    }

    /**
     * Convert filename to readable name
     */
    private fileNameToTitle(filename: string): string {
        return filename
            .replace(/\.md$/, '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    /**
     * Recursively scan directory and build tree
     */
    private scanDirectory(dirPath: string, relativePath: string = ''): DocNode[] {
        const nodes: DocNode[] = [];

        if (!fs.existsSync(dirPath)) {
            return nodes;
        }

        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        // Sort: folders first, then files, alphabetically
        entries.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        });

        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);
            const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

            if (entry.isDirectory()) {
                const children = this.scanDirectory(entryPath, entryRelativePath);
                if (children.length > 0) {
                    nodes.push({
                        name: this.fileNameToTitle(entry.name),
                        path: entryRelativePath,
                        type: 'folder',
                        children
                    });
                }
            } else if (entry.name.endsWith('.md')) {
                // Try to extract title from file
                let title: string | undefined;
                try {
                    const content = fs.readFileSync(entryPath, 'utf-8');
                    title = this.extractTitle(content);
                } catch (e) {
                    // Ignore read errors
                }

                nodes.push({
                    name: title || this.fileNameToTitle(entry.name),
                    path: entryRelativePath,
                    type: 'file',
                    title
                });
            }
        }

        return nodes;
    }

    /**
     * Get document tree for a locale
     */
    getTree(locale: SupportedLocale): DocNode[] {
        const localePath = this.getLocalePath(locale);
        console.log('[DocsService] getTree for locale:', locale, 'path:', localePath);
        console.log('[DocsService] locale path exists:', fs.existsSync(localePath));
        const tree = this.scanDirectory(localePath);
        console.log('[DocsService] tree:', JSON.stringify(tree, null, 2));
        return tree;
    }

    /**
     * Get content of a document
     */
    getContent(locale: SupportedLocale, relativePath: string): string | null {
        const filePath = path.join(this.getLocalePath(locale), relativePath);

        // Security: prevent path traversal
        const resolved = path.resolve(filePath);
        const localeDir = path.resolve(this.getLocalePath(locale));
        if (!resolved.startsWith(localeDir)) {
            console.error('[DocsService] Path traversal attempt:', relativePath);
            return null;
        }

        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch (e) {
            console.error('[DocsService] Failed to read file:', filePath, e);
            return null;
        }
    }

    /**
     * Search documents for a query
     */
    search(locale: SupportedLocale, query: string): SearchResult[] {
        const results: SearchResult[] = [];
        const localePath = this.getLocalePath(locale);
        const lowerQuery = query.toLowerCase();

        const searchDir = (dirPath: string, relativePath: string = '') => {
            if (!fs.existsSync(dirPath)) return;

            const entries = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry.name);
                const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

                if (entry.isDirectory()) {
                    searchDir(entryPath, entryRelativePath);
                } else if (entry.name.endsWith('.md')) {
                    try {
                        const content = fs.readFileSync(entryPath, 'utf-8');
                        const lowerContent = content.toLowerCase();

                        if (lowerContent.includes(lowerQuery)) {
                            const title = this.extractTitle(content) || this.fileNameToTitle(entry.name);
                            const matches = this.extractMatches(content, query);

                            results.push({
                                path: entryRelativePath,
                                title,
                                matches
                            });
                        }
                    } catch (e) {
                        // Ignore read errors
                    }
                }
            }
        };

        searchDir(localePath);
        return results;
    }

    /**
     * Extract context around matches
     */
    private extractMatches(content: string, query: string, maxMatches: number = 3): string[] {
        const matches: string[] = [];
        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const contextLength = 50;

        let searchStart = 0;
        while (matches.length < maxMatches) {
            const index = lowerContent.indexOf(lowerQuery, searchStart);
            if (index === -1) break;

            const start = Math.max(0, index - contextLength);
            const end = Math.min(content.length, index + query.length + contextLength);

            let match = content.substring(start, end);
            if (start > 0) match = '...' + match;
            if (end < content.length) match = match + '...';

            matches.push(match.replace(/\n/g, ' '));
            searchStart = index + query.length;
        }

        return matches;
    }

    /**
     * Check if locale has any documents
     */
    hasDocuments(locale: SupportedLocale): boolean {
        const tree = this.getTree(locale);
        return tree.length > 0;
    }

    /**
     * Get available locales
     */
    getAvailableLocales(): SupportedLocale[] {
        const locales: SupportedLocale[] = [];
        if (this.hasDocuments('ru')) locales.push('ru');
        if (this.hasDocuments('en')) locales.push('en');
        return locales;
    }

    /**
     * Register IPC handlers
     */
    registerIpcHandlers(): void {
        ipcMain.handle('docs:get-tree', async (_e, locale: SupportedLocale) => {
            return this.getTree(locale);
        });

        ipcMain.handle('docs:get-content', async (_e, locale: SupportedLocale, relativePath: string) => {
            return this.getContent(locale, relativePath);
        });

        ipcMain.handle('docs:search', async (_e, locale: SupportedLocale, query: string) => {
            return this.search(locale, query);
        });

        ipcMain.handle('docs:get-available-locales', async () => {
            return this.getAvailableLocales();
        });

        ipcMain.handle('docs:has-documents', async (_e, locale: SupportedLocale) => {
            return this.hasDocuments(locale);
        });
    }
}
