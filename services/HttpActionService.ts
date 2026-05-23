import { ipcMain } from 'electron';
import ElectronStore from 'electron-store';
import keytar from 'keytar';
import { HttpActionConfig, HttpHeader, StoreSchema } from './store/StoreSchema';
import { LogService } from './logService';
import { InterpolationContext, interpolateTemplate } from './middleware/interpolate';

const KEYTAR_SERVICE = 'TwitchWatcherHttpSecrets';
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 1_048_576;

export interface HttpExecuteResult {
    ok: boolean;
    status?: number;
    error?: string;
    durationMs: number;
}

export class HttpActionService {
    private appStorage: ElectronStore<StoreSchema>;
    private broadcastCallback: ((channel: string, data: any) => void) | null = null;
    private logService: LogService | null = null;

    constructor(appStorage: ElectronStore<StoreSchema>) {
        this.appStorage = appStorage;
    }

    setBroadcastCallback(callback: (channel: string, data: any) => void): void {
        this.broadcastCallback = callback;
    }

    setLogService(logService: LogService): void {
        this.logService = logService;
    }

    private broadcast(channel: string, data: any): void {
        if (this.broadcastCallback) {
            this.broadcastCallback(channel, data);
        }
    }

    // ─── CRUD over httpActions[] ────────────────────────────────────

    getAll(): HttpActionConfig[] {
        return this.appStorage.get('httpActions') || [];
    }

    get(id: string): HttpActionConfig | undefined {
        return this.getAll().find(a => a.id === id);
    }

    save(action: HttpActionConfig): boolean {
        try {
            const actions = this.getAll();
            const existingIndex = actions.findIndex(a => a.id === action.id);

            if (existingIndex >= 0) {
                // Sweep keytar entries that referenced secrets which are no
                // longer present in the new action. Leaving them around
                // would let dead credentials sit in the keychain forever.
                const oldSecretKeys = collectSecretKeys(actions[existingIndex]);
                const newSecretKeys = new Set(collectSecretKeys(action));
                for (const key of oldSecretKeys) {
                    if (!newSecretKeys.has(key)) {
                        keytar.deletePassword(KEYTAR_SERVICE, key).catch(() => { /* best effort */ });
                    }
                }
                actions[existingIndex] = action;
            } else {
                actions.push(action);
            }

            this.appStorage.set('httpActions', actions);
            this.broadcast('http:updated', actions);
            return true;
        } catch (error) {
            console.error('[HttpActionService] Failed to save:', error);
            return false;
        }
    }

    delete(id: string): boolean {
        try {
            const actions = this.getAll();
            const target = actions.find(a => a.id === id);
            if (!target) return false;

            const filtered = actions.filter(a => a.id !== id);
            this.appStorage.set('httpActions', filtered);

            for (const key of collectSecretKeys(target)) {
                keytar.deletePassword(KEYTAR_SERVICE, key).catch(() => { /* best effort */ });
            }

            this.broadcast('http:updated', filtered);
            return true;
        } catch (error) {
            console.error('[HttpActionService] Failed to delete:', error);
            return false;
        }
    }

    // ─── Secret storage (keytar) ────────────────────────────────────

    async setSecret(keytarKey: string, value: string): Promise<boolean> {
        if (!keytarKey) return false;
        try {
            if (value) {
                await keytar.setPassword(KEYTAR_SERVICE, keytarKey, value);
            } else {
                await keytar.deletePassword(KEYTAR_SERVICE, keytarKey);
            }
            return true;
        } catch (error) {
            console.error('[HttpActionService] keytar write failed:', error);
            return false;
        }
    }

    async hasSecret(keytarKey: string): Promise<boolean> {
        if (!keytarKey) return false;
        try {
            const value = await keytar.getPassword(KEYTAR_SERVICE, keytarKey);
            return Boolean(value);
        } catch (error) {
            console.error('[HttpActionService] keytar read failed:', error);
            return false;
        }
    }

    private async getSecret(keytarKey: string): Promise<string | null> {
        try {
            return await keytar.getPassword(KEYTAR_SERVICE, keytarKey);
        } catch (error) {
            console.error('[HttpActionService] keytar read failed:', error);
            return null;
        }
    }

    // ─── Execution ──────────────────────────────────────────────────

    async execute(id: string, ctx?: InterpolationContext): Promise<HttpExecuteResult> {
        const action = this.get(id);
        if (!action) {
            const error = `HTTP action not found: ${id}`;
            this.logError(error);
            return { ok: false, error, durationMs: 0 };
        }
        return this.executeConfig(action, ctx);
    }

    async executeConfig(action: HttpActionConfig, ctx?: InterpolationContext): Promise<HttpExecuteResult> {
        const start = Date.now();
        const safeCtx = ctx ?? {};
        const timeoutMs = action.timeoutMs && action.timeoutMs > 0 ? action.timeoutMs : DEFAULT_TIMEOUT_MS;

        let url: string;
        try {
            // trim() defends against accidental whitespace in the saved
            // URL (we've seen leading spaces creep in from the editor).
            url = interpolateTemplate((action.url || '').trim(), safeCtx);
            // Reject anything that isn't http(s) to avoid file:// / data:
            // sneaking through after interpolation.
            const parsed = new URL(url);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                throw new Error(`Unsupported protocol: ${parsed.protocol}`);
            }
        } catch (err: any) {
            const error = `Invalid URL: ${err?.message || String(err)}`;
            this.logError(`[HttpAction:${action.name}] ${error}`);
            return { ok: false, error, durationMs: Date.now() - start };
        }

        const headers: Record<string, string> = {};
        for (const header of action.headers || []) {
            if (!header.name) continue;
            const value = await this.resolveHeaderValue(header, safeCtx);
            if (value === null) {
                this.logError(`[HttpAction:${action.name}] missing secret for header "${header.name}", skipping`);
                continue;
            }
            headers[header.name] = value;
        }

        let body: string | undefined;
        if (action.method !== 'GET' && action.body && action.body.type !== 'none') {
            body = interpolateTemplate(action.body.content || '', safeCtx);
            if (action.body.type === 'json' && body && !headers['Content-Type'] && !headers['content-type']) {
                headers['Content-Type'] = 'application/json';
            }
            if (action.body.type === 'form' && body && !headers['Content-Type'] && !headers['content-type']) {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                method: action.method,
                headers,
                body,
                signal: controller.signal,
            });

            if (!response.ok) {
                const snippet = await readBodySnippet(response);
                const error = `HTTP ${response.status}${snippet ? `: ${snippet}` : ''}`;
                this.logError(`[HttpAction:${action.name}] ${error}`);
                return { ok: false, status: response.status, error, durationMs: Date.now() - start };
            }

            // Drain the body so the connection can be released. We don't
            // capture it because v1 is fire-and-forget.
            try { await response.arrayBuffer(); } catch { /* ignore */ }

            return { ok: true, status: response.status, durationMs: Date.now() - start };
        } catch (err: any) {
            const error = err?.name === 'AbortError'
                ? `Timeout after ${timeoutMs}ms`
                : (err?.message || String(err));
            this.logError(`[HttpAction:${action.name}] ${error}`);
            return { ok: false, error, durationMs: Date.now() - start };
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private async resolveHeaderValue(header: HttpHeader, ctx: InterpolationContext): Promise<string | null> {
        if (header.value.type === 'plain') {
            return interpolateTemplate(header.value.value || '', ctx);
        }
        // Secrets are pulled from keytar verbatim — no interpolation, no
        // logging. If the keytar entry is missing the request will skip
        // this header (see caller).
        const secret = await this.getSecret(header.value.keytarKey);
        return secret;
    }

    private logError(message: string): void {
        if (this.logService) {
            this.logService.log({
                timestamp: new Date().toISOString(),
                message,
                userId: null,
                userName: null,
            });
        } else {
            console.warn(message);
        }
    }

    // ─── IPC ────────────────────────────────────────────────────────

    registerIpcHandlers(): void {
        ipcMain.handle('http:get-all', async () => {
            return this.getAll();
        });

        ipcMain.handle('http:get', async (_e, id: string) => {
            return this.get(id);
        });

        ipcMain.handle('http:save', async (_e, action: HttpActionConfig) => {
            return this.save(action);
        });

        ipcMain.handle('http:delete', async (_e, id: string) => {
            return this.delete(id);
        });

        ipcMain.handle('http:secret-set', async (_e, keytarKey: string, value: string) => {
            return this.setSecret(keytarKey, value);
        });

        ipcMain.handle('http:secret-has', async (_e, keytarKey: string) => {
            return this.hasSecret(keytarKey);
        });

        ipcMain.handle('http:test', async (_e, action: HttpActionConfig) => {
            // Use a minimal test context so ${user}/${args[0]}/etc. render
            // to something visible instead of an empty string.
            const testCtx: InterpolationContext = {
                user: 'TestUser',
                target: 'TestTarget',
                args: ['arg1', 'arg2', 'arg3'],
                reward: 'Test Reward',
                rewardCost: 100,
                raider: 'TestRaider',
                viewers: 42,
            };
            return this.executeConfig(action, testCtx);
        });
    }
}

function collectSecretKeys(action: HttpActionConfig): string[] {
    const keys: string[] = [];
    for (const header of action.headers || []) {
        if (header.value.type === 'secret' && header.value.keytarKey) {
            keys.push(header.value.keytarKey);
        }
    }
    return keys;
}

async function readBodySnippet(response: Response): Promise<string> {
    try {
        const text = await response.text();
        if (!text) return '';
        const trimmed = text.length > 200 ? `${text.slice(0, 200)}…` : text;
        return trimmed.replace(/\s+/g, ' ').trim();
    } catch {
        return '';
    }
}
