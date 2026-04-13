import React, { useEffect, useState, useCallback } from 'react';
import type { Connection } from './config';
import {
    getUserById,
    getUserByLogin,
    timeoutUser,
    banUser,
    unbanUser,
    setUserRoles,
    sendShoutout,
    type UserProfile,
} from './api';

const TIMEOUT_PRESETS = [
    { label: '1м', seconds: 60 },
    { label: '5м', seconds: 300 },
    { label: '10м', seconds: 600 },
    { label: '30м', seconds: 1800 },
    { label: '1ч', seconds: 3600 },
    { label: '24ч', seconds: 86400 },
];

interface Props {
    conn: Connection;
    userId?: string | null;
    userLogin?: string | null;
    // If set, shows a "delete message" action.
    messageId?: string | null;
    onClose: () => void;
    onDeleteMessage?: (messageId: string) => void;
}

type ActionState = 'idle' | 'loading' | 'success' | 'error';

export function UserSheet({ conn, userId, userLogin, messageId, onClose, onDeleteMessage }: Props) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionState, setActionState] = useState<ActionState>('idle');
    const [actionLabel, setActionLabel] = useState('');
    const [showTimeouts, setShowTimeouts] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const p = userId
                    ? await getUserById(conn, userId)
                    : await getUserByLogin(conn, userLogin!);
                if (!cancelled) setProfile(p);
            } catch (e: any) {
                if (!cancelled) setError(e?.message ?? 'Ошибка');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [conn, userId, userLogin]);

    const runAction = useCallback(async (label: string, fn: () => Promise<void>) => {
        setActionState('loading');
        setActionLabel(label);
        try {
            await fn();
            setActionState('success');
            // Re-fetch profile to reflect changes
            try {
                const p = userId
                    ? await getUserById(conn, userId)
                    : await getUserByLogin(conn, userLogin!);
                setProfile(p);
            } catch { /* ignore refresh failure */ }
            setTimeout(() => setActionState('idle'), 1200);
        } catch (e: any) {
            setActionState('error');
            setActionLabel(e?.message ?? 'Ошибка');
            setTimeout(() => setActionState('idle'), 2000);
        }
    }, [conn, userId, userLogin]);

    const handleTimeout = (seconds: number) => {
        if (!profile) return;
        runAction(`Таймаут ${seconds}с`, () => timeoutUser(conn, profile.id, seconds));
        setShowTimeouts(false);
    };

    const handleBan = () => {
        if (!profile || !window.confirm(`Забанить ${profile.displayName} навсегда?`)) return;
        runAction('Бан', () => banUser(conn, profile.id));
    };

    const handleUnban = () => {
        if (!profile) return;
        runAction('Разбан', () => unbanUser(conn, profile.id));
    };

    const handleShoutout = () => {
        if (!profile) return;
        runAction('Шаутаут', () => sendShoutout(conn, profile.id));
    };

    const handleToggleMod = () => {
        if (!profile) return;
        const next = !profile.isModerator;
        runAction(next ? 'Назначить мода' : 'Снять мода', () =>
            setUserRoles(conn, profile.id, { isMod: next }));
    };

    const handleToggleVip = () => {
        if (!profile) return;
        const next = !profile.isVip;
        runAction(next ? 'Дать VIP' : 'Снять VIP', () =>
            setUserRoles(conn, profile.id, { isVip: next }));
    };

    // Format follow date
    const followDate = profile?.followedAt
        ? new Date(profile.followedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    const accountAge = profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    return (
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                zIndex: 100, touchAction: 'none',
            }}/>

            {/* Sheet */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: '#1a1a1e', borderRadius: '16px 16px 0 0',
                zIndex: 101, maxHeight: '80vh', overflowY: 'auto',
                paddingBottom: 'env(safe-area-inset-bottom, 16px)',
                WebkitOverflowScrolling: 'touch',
            }}>
                {/* Drag handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: '#444' }}/>
                </div>

                {loading ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>Загрузка...</div>
                ) : error ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#fca5a5' }}>{error}</div>
                ) : profile ? (
                    <div style={{ padding: '0 20px 20px' }}>
                        {/* Profile header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                            {profile.profileImageUrl && (
                                <img src={profile.profileImageUrl} alt=""
                                     style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }}/>
                            )}
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>
                                    {profile.displayName}
                                </div>
                                <div style={{ fontSize: 13, color: '#888' }}>
                                    {profile.login} · аккаунт с {accountAge}
                                </div>
                            </div>
                        </div>

                        {/* Status badges */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                            {profile.isModerator && <Badge color="#10b981">Модератор</Badge>}
                            {profile.isVip && <Badge color="#a78bfa">VIP</Badge>}
                            {profile.isFollower && <Badge color="#60a5fa">Фолловер{followDate ? ` с ${followDate}` : ''}</Badge>}
                            {profile.isBanned && <Badge color="#ef4444">Забанен{profile.banExpiresAt ? ` до ${new Date(profile.banExpiresAt).toLocaleString('ru-RU')}` : ' навсегда'}</Badge>}
                        </div>

                        {/* Action feedback */}
                        {actionState !== 'idle' && (
                            <div style={{
                                padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13,
                                background: actionState === 'success' ? 'rgba(16,185,129,0.1)' : actionState === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(124,58,237,0.1)',
                                color: actionState === 'success' ? '#6ee7b7' : actionState === 'error' ? '#fca5a5' : '#c4b5fd',
                                border: `1px solid ${actionState === 'success' ? 'rgba(16,185,129,0.3)' : actionState === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(124,58,237,0.3)'}`,
                            }}>
                                {actionState === 'loading' ? `${actionLabel}...` : actionState === 'success' ? `${actionLabel} ✓` : actionLabel}
                            </div>
                        )}

                        {/* Main actions */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                            <SheetBtn onClick={() => setShowTimeouts(!showTimeouts)} color="#f59e0b">⏱ Таймаут</SheetBtn>
                            <SheetBtn onClick={handleBan} color="#ef4444">🔨 Бан</SheetBtn>
                            {profile.isBanned && <SheetBtn onClick={handleUnban} color="#10b981">✅ Разбан</SheetBtn>}
                            <SheetBtn onClick={handleShoutout} color="#60a5fa">📢 Шаутаут</SheetBtn>
                            {messageId && onDeleteMessage && (
                                <SheetBtn onClick={() => { onDeleteMessage(messageId); onClose(); }} color="#888">🗑 Удалить</SheetBtn>
                            )}
                        </div>

                        {/* Timeout presets */}
                        {showTimeouts && (
                            <div style={{
                                display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12,
                                padding: '12px', background: '#141418', borderRadius: 8,
                                border: '1px solid #2a2a2f',
                            }}>
                                {TIMEOUT_PRESETS.map((p) => (
                                    <SheetBtn key={p.seconds} onClick={() => handleTimeout(p.seconds)}
                                              color="#f59e0b" small>{p.label}</SheetBtn>
                                ))}
                            </div>
                        )}

                        {/* Role toggles */}
                        <div style={{ borderTop: '1px solid #2a2a2f', paddingTop: 12 }}>
                            <RoleRow label="Модератор" active={profile.isModerator} onToggle={handleToggleMod}/>
                            <RoleRow label="VIP" active={profile.isVip} onToggle={handleToggleVip}/>
                        </div>
                    </div>
                ) : null}
            </div>
        </>
    );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
    return (
        <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 12,
            fontSize: 12, fontWeight: 600, color,
            background: `${color}22`, border: `1px solid ${color}44`,
        }}>{children}</span>
    );
}

function SheetBtn({ onClick, color, small, children }: {
    onClick: () => void; color: string; small?: boolean; children: React.ReactNode;
}) {
    return (
        <button onClick={onClick} style={{
            padding: small ? '8px 12px' : '12px 14px',
            borderRadius: 8, border: `1px solid ${color}44`,
            background: `${color}15`, color,
            fontSize: small ? 13 : 14, fontWeight: 500,
            cursor: 'pointer', textAlign: 'center',
        }}>{children}</button>
    );
}

function RoleRow({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0',
        }}>
            <span style={{ fontSize: 14, color: '#e0e0e0' }}>{label}</span>
            <button onClick={onToggle} style={{
                padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', border: 'none',
                background: active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                color: active ? '#6ee7b7' : '#888',
            }}>
                {active ? 'Вкл' : 'Выкл'}
            </button>
        </div>
    );
}
