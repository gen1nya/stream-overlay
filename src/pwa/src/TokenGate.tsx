import React, { useState } from 'react';
import { Connection, saveConnection } from './config';

export function TokenGate({ onConnected }: { onConnected: (conn: Connection) => void }) {
    const [baseUrl, setBaseUrl] = useState(() => {
        // Default the base URL to the current origin when served from
        // the gateway, otherwise empty. Developer running vite dev on
        // :5174 will fill it in manually.
        if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes(':5174')) {
            return window.location.origin;
        }
        return '';
    });
    const [token, setToken] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [testing, setTesting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        const trimmedUrl = baseUrl.trim().replace(/\/+$/, '');
        const trimmedToken = token.trim();
        if (!trimmedUrl || !trimmedToken) {
            setError('Укажите адрес гейтвея и токен');
            return;
        }
        try {
            // eslint-disable-next-line no-new
            new URL(trimmedUrl);
        } catch {
            setError('Адрес должен быть вида http://192.168.1.10:42010');
            return;
        }

        setTesting(true);
        try {
            const res = await fetch(`${trimmedUrl}/health`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const body = await res.json();
            if (!body?.ok || body?.gateway !== 'remote-companion') {
                throw new Error('Это не похоже на Companion Gateway');
            }
        } catch (err: any) {
            setError(`Не удалось связаться с гейтвеем: ${err?.message ?? err}`);
            setTesting(false);
            return;
        }

        const conn: Connection = { baseUrl: trimmedUrl, token: trimmedToken };
        saveConnection(conn);
        onConnected(conn);
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '100%',
            padding: 24,
        }}>
            <div style={{ marginBottom: 28, textAlign: 'center' }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px 0' }}>Twitch Companion</h1>
                <p style={{ fontSize: 13, color: '#888', margin: 0, lineHeight: 1.5 }}>
                    Отсканируй QR-код из десктопного приложения камерой телефона
                    — подключение произойдёт автоматически.
                </p>
                <p style={{ fontSize: 12, color: '#555', margin: '10px 0 0 0', lineHeight: 1.4 }}>
                    Или введи данные вручную:
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#a1a1aa' }}>Адрес гейтвея</span>
                    <input
                        type="url"
                        inputMode="url"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="http://192.168.1.10:42010"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        style={inputStyle}
                    />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#a1a1aa' }}>Токен</span>
                    <input
                        type="password"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="Значение REMOTE_GATEWAY_DEV_TOKEN"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        style={inputStyle}
                    />
                </label>

                {error && (
                    <div style={{
                        fontSize: 13,
                        color: '#fca5a5',
                        background: 'rgba(239, 68, 68, 0.1)',
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}>{error}</div>
                )}

                <button type="submit" disabled={testing} style={{
                    marginTop: 8,
                    padding: '14px',
                    fontSize: 15,
                    fontWeight: 600,
                    background: testing ? '#3f3f46' : '#7c3aed',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: testing ? 'default' : 'pointer',
                }}>
                    {testing ? 'Проверка…' : 'Подключиться'}
                </button>
            </form>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    background: '#18181b',
    border: '1px solid #2a2a2f',
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 15,
    color: '#e0e0e0',
    outline: 'none',
};
