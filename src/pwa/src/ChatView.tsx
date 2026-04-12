import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Connection, wsUrl, clearConnection } from './config';
import { deleteMessage } from './api';
import { UserSheet } from './UserSheet';

interface BaseEvent {
    id?: string;
    type?: string;
    userName?: string;
    userNameRaw?: string;
    userId?: string;
    color?: string;
    timestamp?: number;
}
interface ChatEvent extends BaseEvent {
    type: 'chat';
    htmlMessage?: string;
    htmlBadges?: string;
}
interface FollowEvent extends BaseEvent {
    type: 'follow';
}
interface RedemptionEvent extends BaseEvent {
    type: 'redemption';
    reward?: { id?: string; cost?: number; title?: string };
}
interface RaidEvent extends BaseEvent {
    type: 'raid';
    viewers?: number;
}
type FeedEvent = ChatEvent | FollowEvent | RedemptionEvent | RaidEvent | BaseEvent;

type WsFrame =
    | { type: 'chat:snapshot'; messages: FeedEvent[]; showSourceChannel?: boolean }
    | { type: 'chat:update'; messages: FeedEvent[]; showSourceChannel?: boolean };

type Status = 'connecting' | 'open' | 'closed' | 'error';

interface FeedRowProps {
    msg: FeedEvent;
    onUserClick: (msg: FeedEvent) => void;
    onDeleteMsg?: (messageId: string) => void;
}

function FeedRow({ msg, onUserClick, onDeleteMsg }: FeedRowProps) {
    const color = msg.color || '#a78bfa';
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        if (!confirmDelete) return;
        const timer = setTimeout(() => setConfirmDelete(false), 3000);
        return () => clearTimeout(timer);
    }, [confirmDelete]);

    const nameSpan = (
        <span
            onClick={(e) => { e.stopPropagation(); onUserClick(msg); }}
            style={{ fontWeight: 700, color, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >{msg.userName}</span>
    );

    const deleteBtn = msg.type === 'chat' && msg.id && onDeleteMsg ? (
        <button
            onClick={(e) => {
                e.stopPropagation();
                if (confirmDelete) { onDeleteMsg(msg.id!); setConfirmDelete(false); }
                else setConfirmDelete(true);
            }}
            style={{
                flexShrink: 0, marginLeft: 'auto',
                padding: '2px 8px', borderRadius: 4,
                border: confirmDelete ? '1px solid rgba(239,68,68,0.5)' : '1px solid transparent',
                background: confirmDelete ? 'rgba(239,68,68,0.15)' : 'transparent',
                color: confirmDelete ? '#fca5a5' : '#444',
                fontSize: 11, cursor: 'pointer',
                transition: 'all 0.15s ease',
            }}
        >{confirmDelete ? 'Удалить?' : '×'}</button>
    ) : null;

    if (msg.type === 'follow') {
        return (
            <FeedItem accent="#10b981">
                {nameSpan}
                <span style={{ color: '#a1a1aa' }}> подписался на канал</span>
            </FeedItem>
        );
    }
    if (msg.type === 'redemption') {
        const r = (msg as RedemptionEvent).reward;
        return (
            <FeedItem accent="#f59e0b">
                {nameSpan}
                <span style={{ color: '#a1a1aa' }}> выкупил(а) </span>
                <span style={{ fontWeight: 600, color: '#fbbf24' }}>{r?.title ?? 'награду'}</span>
                {typeof r?.cost === 'number' && (
                    <span style={{ color: '#a1a1aa' }}> за {r.cost}</span>
                )}
            </FeedItem>
        );
    }
    if (msg.type === 'raid') {
        const viewers = (msg as RaidEvent).viewers;
        return (
            <FeedItem accent="#ec4899">
                {nameSpan}
                <span style={{ color: '#a1a1aa' }}> заехал с рейдом</span>
                {typeof viewers === 'number' && (
                    <span style={{ color: '#a1a1aa' }}> ({viewers})</span>
                )}
            </FeedItem>
        );
    }

    const chat = msg as ChatEvent;
    return (
        <FeedItem>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {chat.htmlBadges && (
                        <span style={{ marginRight: 4 }}
                              dangerouslySetInnerHTML={{ __html: chat.htmlBadges }}/>
                    )}
                    {nameSpan}
                    <span style={{ marginRight: 6 }}>:</span>
                    {chat.htmlMessage ? (
                        <span dangerouslySetInnerHTML={{ __html: chat.htmlMessage }}/>
                    ) : (
                        <span style={{ color: '#666' }}>(пустое сообщение)</span>
                    )}
                </div>
                {deleteBtn}
            </div>
        </FeedItem>
    );
}

function FeedItem({ accent, children }: { accent?: string; children: React.ReactNode }) {
    return (
        <div style={{
            padding: '8px 0 8px 10px',
            borderBottom: '1px solid #1d1d20',
            borderLeft: accent ? `3px solid ${accent}` : '3px solid transparent',
            fontSize: 15,
            lineHeight: 1.4,
        }}>
            {children}
        </div>
    );
}

interface LogEntry { ts: string; text: string }
function now(): string { return new Date().toLocaleTimeString('ru-RU', { hour12: false }); }

export function ChatView({ conn, onReset }: { conn: Connection; onReset: () => void }) {
    const [messages, setMessages] = useState<FeedEvent[]>([]);
    const [status, setStatus] = useState<Status>('connecting');
    const [lastError, setLastError] = useState<string | null>(null);
    const [showDebug, setShowDebug] = useState(false);
    const [log, setLog] = useState<LogEntry[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const listEndRef = useRef<HTMLDivElement | null>(null);

    const addLog = (text: string) =>
        setLog((prev) => [...prev.slice(-50), { ts: now(), text }]);

    useEffect(() => {
        let cancelled = false;
        let retryTimer: number | null = null;
        let attempt = 0;

        function connect() {
            if (cancelled) return;
            attempt++;
            setStatus('connecting');
            setLastError(null);
            const url = wsUrl(conn.baseUrl, '/ws/chat', conn.token);
            addLog(`#${attempt} ws → ${url}`);
            let ws: WebSocket;
            try {
                ws = new WebSocket(url);
            } catch (e: any) {
                addLog(`#${attempt} new WebSocket threw: ${e?.message ?? e}`);
                setStatus('error');
                setLastError(String(e?.message ?? e));
                retryTimer = window.setTimeout(connect, 3000);
                return;
            }
            wsRef.current = ws;

            ws.onopen = () => {
                if (cancelled) return;
                setStatus('open');
                addLog(`#${attempt} open`);
            };
            ws.onmessage = (ev) => {
                try {
                    const frame = JSON.parse(ev.data) as WsFrame;
                    if (frame.type === 'chat:snapshot') {
                        addLog(`#${attempt} snapshot: ${frame.messages?.length ?? 0} msgs`);
                    }
                    if (frame.type === 'chat:snapshot' || frame.type === 'chat:update') {
                        setMessages(frame.messages ?? []);
                    }
                } catch (err) {
                    addLog(`#${attempt} parse error: ${err}`);
                }
            };
            ws.onerror = (ev: any) => {
                if (cancelled) return;
                setStatus('error');
                const info = ev?.message || ev?.type || 'unknown';
                setLastError(String(info));
                addLog(`#${attempt} onerror: ${info}`);
            };
            ws.onclose = (ev) => {
                if (cancelled) return;
                setStatus('closed');
                addLog(`#${attempt} close code=${ev.code} reason=${ev.reason || '—'} clean=${ev.wasClean}`);
                retryTimer = window.setTimeout(connect, 2000);
            };
        }

        addLog(`baseUrl=${conn.baseUrl}`);
        addLog(`token=${conn.token}`);
        addLog(`ua=${navigator.userAgent.slice(0, 80)}`);

        // HTTP sanity check before ws — if this fails, it's network, not ws-specific.
        fetch(`${conn.baseUrl}/health`)
            .then(async (r) => {
                const body = await r.text().catch(() => '(no body)');
                addLog(`GET /health → ${r.status} ${body.slice(0, 60)}`);
            })
            .catch((e) => {
                addLog(`GET /health FAILED: ${e?.message ?? e}`);
            });

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

    // User sheet state
    const [sheetTarget, setSheetTarget] = useState<{ userId?: string; userLogin?: string; messageId?: string } | null>(null);

    const handleUserClick = useCallback((msg: FeedEvent) => {
        setSheetTarget({
            userId: msg.userId ?? undefined,
            userLogin: msg.userNameRaw ?? msg.userName ?? undefined,
            messageId: msg.id,
        });
    }, []);

    const handleDeleteMsg = useCallback(async (messageId: string) => {
        try {
            await deleteMessage(conn, messageId);
        } catch (e: any) {
            console.error('Delete failed:', e);
        }
    }, [conn]);

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
                <button onClick={() => setShowDebug((v) => !v)} style={{
                    background: showDebug ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                    color: showDebug ? '#a78bfa' : '#888',
                    border: '1px solid #2a2a2f',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 12,
                    cursor: 'pointer',
                }}>Log</button>
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

            {showDebug && (
                <div style={{
                    padding: '10px 16px',
                    background: '#111113',
                    borderBottom: '1px solid #2a2a2f',
                    maxHeight: 200,
                    overflowY: 'auto',
                    fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                    fontSize: 11,
                    lineHeight: 1.6,
                    color: '#888',
                    WebkitOverflowScrolling: 'touch',
                }}>
                    {log.map((e, i) => (
                        <div key={i}><span style={{ color: '#555' }}>{e.ts}</span> {e.text}</div>
                    ))}
                    {log.length === 0 && <div>Нет событий</div>}
                </div>
            )}

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
                        <FeedRow
                            key={msg.id ?? i}
                            msg={msg}
                            onUserClick={handleUserClick}
                            onDeleteMsg={handleDeleteMsg}
                        />
                    ))
                )}
                <div ref={listEndRef}/>
            </div>

            {sheetTarget && (
                <UserSheet
                    conn={conn}
                    userId={sheetTarget.userId}
                    userLogin={sheetTarget.userLogin}
                    messageId={sheetTarget.messageId}
                    onClose={() => setSheetTarget(null)}
                    onDeleteMessage={handleDeleteMsg}
                />
            )}
        </div>
    );
}
