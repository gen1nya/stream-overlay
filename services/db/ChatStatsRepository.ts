import type Database from 'better-sqlite3';

// ============================================
// Chat Stats Types
// ============================================

export interface StreamSession {
    id: number;
    startedAt: number;
    endedAt: number | null;
    totalMessages: number;
    uniqueChatters: number;
    peakMessagesPerMinute: number;
    status: 'active' | 'ended';
}

export interface StreamUserStats {
    sessionId: number;
    userId: string;
    userName: string;
    messageCount: number;
    firstMessageAt: number;
    lastMessageAt: number;
}

// ============================================
// Repository Implementation
// ============================================

export class ChatStatsRepository {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    // ============================================
    // Session Management
    // ============================================

    createSession(startedAt: number): number {
        // Close any stale active sessions
        this.db.prepare(`
            UPDATE stream_sessions SET status = 'ended', ended_at = ?
            WHERE status = 'active'
        `).run(startedAt);

        const result = this.db.prepare(`
            INSERT INTO stream_sessions (started_at, status)
            VALUES (?, 'active')
        `).run(startedAt);

        return result.lastInsertRowid as number;
    }

    endSession(sessionId: number, endedAt: number): void {
        this.db.prepare(`
            UPDATE stream_sessions
            SET ended_at = ?, status = 'ended'
            WHERE id = ?
        `).run(endedAt, sessionId);
    }

    upsertSessionStats(sessionId: number, totalMessages: number, uniqueChatters: number, peakMpm: number): void {
        this.db.prepare(`
            UPDATE stream_sessions
            SET total_messages = ?, unique_chatters = ?, peak_messages_per_minute = ?
            WHERE id = ?
        `).run(totalMessages, uniqueChatters, peakMpm, sessionId);
    }

    // ============================================
    // User Stats
    // ============================================

    upsertUserStats(sessionId: number, entries: Array<{ userId: string; userName: string; messageCount: number; firstMessageAt: number; lastMessageAt: number }>): void {
        const upsert = this.db.prepare(`
            INSERT INTO stream_chat_stats (session_id, user_id, user_name, message_count, first_message_at, last_message_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id, user_id) DO UPDATE SET
                user_name = excluded.user_name,
                message_count = excluded.message_count,
                first_message_at = excluded.first_message_at,
                last_message_at = excluded.last_message_at
        `);

        const transaction = this.db.transaction((items: typeof entries) => {
            for (const entry of items) {
                upsert.run(sessionId, entry.userId, entry.userName, entry.messageCount, entry.firstMessageAt, entry.lastMessageAt);
            }
        });

        transaction(entries);
    }

    // ============================================
    // Queries
    // ============================================

    getSession(sessionId: number): StreamSession | null {
        const row = this.db.prepare(`
            SELECT
                id, started_at as startedAt, ended_at as endedAt,
                total_messages as totalMessages, unique_chatters as uniqueChatters,
                peak_messages_per_minute as peakMessagesPerMinute, status
            FROM stream_sessions
            WHERE id = ?
        `).get(sessionId) as StreamSession | undefined;

        return row ?? null;
    }

    getRecentSessions(limit: number = 20, offset: number = 0): StreamSession[] {
        return this.db.prepare(`
            SELECT
                id, started_at as startedAt, ended_at as endedAt,
                total_messages as totalMessages, unique_chatters as uniqueChatters,
                peak_messages_per_minute as peakMessagesPerMinute, status
            FROM stream_sessions
            ORDER BY started_at DESC
            LIMIT ? OFFSET ?
        `).all(limit, offset) as StreamSession[];
    }

    getTopChatters(sessionId: number, limit: number = 10): StreamUserStats[] {
        return this.db.prepare(`
            SELECT
                session_id as sessionId, user_id as userId, user_name as userName,
                message_count as messageCount, first_message_at as firstMessageAt,
                last_message_at as lastMessageAt
            FROM stream_chat_stats
            WHERE session_id = ?
            ORDER BY message_count DESC
            LIMIT ?
        `).all(sessionId, limit) as StreamUserStats[];
    }

    getSessionUserStats(sessionId: number, options?: { limit?: number; offset?: number }): StreamUserStats[] {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;

        return this.db.prepare(`
            SELECT
                session_id as sessionId, user_id as userId, user_name as userName,
                message_count as messageCount, first_message_at as firstMessageAt,
                last_message_at as lastMessageAt
            FROM stream_chat_stats
            WHERE session_id = ?
            ORDER BY message_count DESC
            LIMIT ? OFFSET ?
        `).all(sessionId, limit, offset) as StreamUserStats[];
    }
}
