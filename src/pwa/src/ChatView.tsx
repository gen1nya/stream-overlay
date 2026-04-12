import React, { useEffect, useRef, useState } from 'react';
import { Connection, wsUrl, clearConnection } from './config';

interface ChatMessage {
    id?: string;
    type?: string;
    userName?: string;
    htmlMessage?: string;
    color?: string;
    timestamp?: number;
}

type WsFrame =
    | { type: 'chat:snapshot'; messages: ChatMessage[]; showSourceChannel?: boolean }
    | { type: 'chat:update'; messages: ChatMessage[]; showSourceChannel?: boolean };

type Status = 'connecting' | 'open' | 'closed' | 'error';

export function ChatView({ conn, onReset }: { conn: Connection; onReset: () => void }) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [status, setStatus] = useState<Status>('connecting');
    const [lastError, setLastError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const listEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let cancelled = false;
        let retryTimer: number | null = null;

        function connect() {
            if (cancelled) return;
            setStatus('connecting');
            setLastError(null);
            const url = wsUrl(conn.baseUrl, '/ws/chat', conn.token);
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                if (cancelled) return;
                setStatus('open');
            };
            ws.onmessage = (ev) => {
                try {
                    const frame = JSON.parse(ev.data) as WsFrame;
                    if (frame.type === 'chat:snapshot' || frame.type === 'chat:update') {
                        setMessages(frame.messages ?? []);
                    }
                } catch (err) {
                    console.error('Failed to parse ws frame', err);
                }
            };
            ws.onerror = () => {
                if (cancelled) return;
                setStatus('error');
                setLastError('Соединение оборвалось');
            };
            ws.onclose = () => {
                if (cancelled) return;
                setStatus('closed');
                // Simple linear retry — 2s. The gateway is on LAN so
                // reconnect latency is not a problem.
                retryTimer = window.setTimeout(connect, 2000);
            };
        }

        connect();
        return () => {
            cancelled = true;
            if (retryTimer !== null) window.clearTimeout(retryTimer);
            try { wsRef.current?.close(); } catch { /* ignore */ }
            wsRef.current = null;
        };
    }, [conn.baseUrl, conn.token]);

    // Auto-scroll to the bottom as new messages arrive.
    useEffect(() => {
        listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages]);

    function handleSignOut() {
        clearConnection();
        onReset();
    }

    const statusLabel: Record<Status, string> = {
        connecting: 'Подключение…',
        open: 'Онлайн',
        closed: 'Переподключение…',
        error: 'Ошибка',
    };
    const statusColor: Record<Status, string> = {
        connecting: '#f59e0b',
        open: '#10b981',
        closed: '#f59e0b',
        error: '#ef4444',
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        }}>
            <header style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderBottom: '1px solid #2a2a2f',
                background: '#18181b',
                position: 'sticky',
                top: 0,
                zIndex: 10,
            }}>
                <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: statusColor[status],
                    flexShrink: 0,
                }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Чат</div>
                    <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {statusLabel[status]}{lastError ? ` · ${lastError}` : ''}
                    </div>
                </div>
                <button onClick={handleSignOut} style={{
                    background: 'transparent',
                    color: '#888',
                    border: '1px solid #2a2a2f',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 12,
                    cursor: 'pointer',
                }}>Выйти</button>
            </header>

            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 16px',
                WebkitOverflowScrolling: 'touch',
            }}>
                {messages.length === 0 ? (
                    <div style={{ color: '#666', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
                        Ждём сообщений…
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div key={msg.id ?? i} style={{
                            padding: '8px 0',
                            borderBottom: '1px solid #1d1d20',
                            fontSize: 15,
                            lineHeight: 1.4,
                        }}>
                            <span style={{
                                fontWeight: 700,
                                color: msg.color || '#a78bfa',
                                marginRight: 6,
                            }}>{msg.userName}:</span>
                            {msg.htmlMessage ? (
                                <span dangerouslySetInnerHTML={{ __html: msg.htmlMessage }}/>
                            ) : (
                                <span style={{ color: '#666' }}>(пустое сообщение)</span>
                            )}
                        </div>
                    ))
                )}
                <div ref={listEndRef}/>
            </div>
        </div>
    );
}
