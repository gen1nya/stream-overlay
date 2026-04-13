import type { Connection } from './config';

// Thin HTTP client for the gateway moderation API. Every call takes
// the stored Connection so it can derive baseUrl + Bearer token.

async function request(conn: Connection, method: string, path: string, body?: unknown): Promise<Response> {
    const res = await fetch(`${conn.baseUrl}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${conn.token}`,
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res;
}

export interface UserProfile {
    id: string;
    login: string;
    displayName: string;
    profileImageUrl: string | null;
    createdAt: string;
    isModerator: boolean;
    isVip: boolean;
    isFollower: boolean;
    followedAt: string | null;
    isBanned: boolean;
    banExpiresAt: string | null;
}

export async function getUserById(conn: Connection, userId: string): Promise<UserProfile> {
    const res = await request(conn, 'GET', `/api/users/${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error(`getUserById ${res.status}`);
    return res.json();
}

export async function getUserByLogin(conn: Connection, login: string): Promise<UserProfile> {
    const res = await request(conn, 'GET', `/api/users/by-login/${encodeURIComponent(login)}`);
    if (!res.ok) throw new Error(`getUserByLogin ${res.status}`);
    return res.json();
}

export async function timeoutUser(conn: Connection, userId: string, duration: number | null, reason?: string): Promise<void> {
    const res = await request(conn, 'POST', `/api/users/${encodeURIComponent(userId)}/timeout`, { duration, reason: reason ?? '' });
    if (!res.ok) throw new Error(`timeoutUser ${res.status}`);
}

export async function banUser(conn: Connection, userId: string, reason?: string): Promise<void> {
    // Permanent ban = timeout with null duration
    const res = await request(conn, 'POST', `/api/users/${encodeURIComponent(userId)}/timeout`, { duration: null, reason: reason ?? '' });
    if (!res.ok) throw new Error(`banUser ${res.status}`);
}

export async function unbanUser(conn: Connection, userId: string): Promise<void> {
    const res = await request(conn, 'POST', `/api/users/${encodeURIComponent(userId)}/unban`);
    if (!res.ok) throw new Error(`unbanUser ${res.status}`);
}

export async function setUserRoles(conn: Connection, userId: string, target: { isMod?: boolean; isVip?: boolean }): Promise<void> {
    const res = await request(conn, 'POST', `/api/users/${encodeURIComponent(userId)}/roles`, target);
    if (!res.ok) throw new Error(`setUserRoles ${res.status}`);
}

export async function deleteMessage(conn: Connection, messageId: string): Promise<void> {
    const res = await request(conn, 'DELETE', `/api/messages/${encodeURIComponent(messageId)}`);
    if (!res.ok) throw new Error(`deleteMessage ${res.status}`);
}

export async function sendShoutout(conn: Connection, userId: string): Promise<void> {
    const res = await request(conn, 'POST', `/api/users/${encodeURIComponent(userId)}/shoutout`);
    if (!res.ok) throw new Error(`sendShoutout ${res.status}`);
}
