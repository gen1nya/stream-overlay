// Gateway connection config stored in localStorage. The desktop app
// will eventually serve the PWA from the gateway itself, in which
// case the base URL is the current origin. During dev we run vite on
// 5174 and the gateway on 42010, so the user has to type the
// gateway host+port on the token screen.

const STORAGE_KEY = 'twitch-companion:connection';

export interface Connection {
    // e.g. "http://192.168.1.10:42010" — no trailing slash
    baseUrl: string;
    token: string;
}

export function loadConnection(): Connection | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Connection;
        if (typeof parsed?.baseUrl !== 'string' || typeof parsed?.token !== 'string') return null;
        return parsed;
    } catch {
        return null;
    }
}

export function saveConnection(conn: Connection): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conn));
}

export function clearConnection(): void {
    localStorage.removeItem(STORAGE_KEY);
}

// Derive the ws:// URL from the http(s):// base URL.
export function wsUrl(baseUrl: string, path: string, token: string): string {
    const u = new URL(baseUrl);
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${u.host}${path}?token=${encodeURIComponent(token)}`;
}
