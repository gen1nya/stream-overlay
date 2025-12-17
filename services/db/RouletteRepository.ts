import type Database from 'better-sqlite3';

// ============================================
// Roulette Play Types
// ============================================

export interface RoulettePlay {
    id?: number;
    userId: string;
    userName: string;
    result: 'survival' | 'death';
    wasMuted: boolean;  // false if protected (editor)
    createdAt: number;
}

export interface RouletteStats {
    userId: string;
    userName: string;
    totalPlays: number;
    survivals: number;
    deaths: number;
    currentStreak: number;    // positive = survival streak, negative = death streak
    maxSurvivalStreak: number;
    maxDeathStreak: number;
    lastPlayAt: number;
}

export interface CreatePlayData {
    userId: string;
    userName: string;
    result: 'survival' | 'death';
    wasMuted: boolean;
}

export interface GlobalRouletteStats {
    totalPlays: number;
    totalSurvivals: number;
    totalDeaths: number;
    uniquePlayers: number;
    luckiestPlayer?: {
        userId: string;
        userName: string;
        survivalRate: number;
        totalPlays: number;
    };
    unluckiestPlayer?: {
        userId: string;
        userName: string;
        deathRate: number;
        totalPlays: number;
    };
}

// ============================================
// Repository Implementation
// ============================================

export class RouletteRepository {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    // ============================================
    // Plays
    // ============================================

    recordPlay(data: CreatePlayData): number {
        const now = Date.now();

        // Insert play record
        const result = this.db.prepare(`
            INSERT INTO roulette_plays (
                user_id, user_name, result, was_muted, created_at
            )
            VALUES (?, ?, ?, ?, ?)
        `).run(
            data.userId,
            data.userName,
            data.result,
            data.wasMuted ? 1 : 0,
            now
        );

        // Update stats
        this._updateStats(data.userId, data.userName, data.result, now);

        return result.lastInsertRowid as number;
    }

    getPlays(options?: { userId?: string; limit?: number; offset?: number }): RoulettePlay[] {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;

        if (options?.userId) {
            return this.db.prepare(`
                SELECT
                    id, user_id as userId, user_name as userName,
                    result, was_muted as wasMuted, created_at as createdAt
                FROM roulette_plays
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `).all(options.userId, limit, offset) as RoulettePlay[];
        }

        return this.db.prepare(`
            SELECT
                id, user_id as userId, user_name as userName,
                result, was_muted as wasMuted, created_at as createdAt
            FROM roulette_plays
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `).all(limit, offset) as RoulettePlay[];
    }

    getPlayCount(): number {
        const row = this.db.prepare(`
            SELECT COUNT(*) as count FROM roulette_plays
        `).get() as { count: number };
        return row.count;
    }

    // ============================================
    // Stats
    // ============================================

    getStats(userId: string): RouletteStats | null {
        const row = this.db.prepare(`
            SELECT
                user_id as userId, user_name as userName,
                total_plays as totalPlays, survivals, deaths,
                current_streak as currentStreak,
                max_survival_streak as maxSurvivalStreak,
                max_death_streak as maxDeathStreak,
                last_play_at as lastPlayAt
            FROM roulette_stats
            WHERE user_id = ?
        `).get(userId) as RouletteStats | undefined;

        return row ?? null;
    }

    getAllStats(options?: { limit?: number; offset?: number; orderBy?: 'plays' | 'survival_rate' | 'death_rate' }): RouletteStats[] {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;

        let orderClause = 'total_plays DESC';
        if (options?.orderBy === 'survival_rate') {
            orderClause = 'CAST(survivals AS REAL) / total_plays DESC';
        } else if (options?.orderBy === 'death_rate') {
            orderClause = 'CAST(deaths AS REAL) / total_plays DESC';
        }

        return this.db.prepare(`
            SELECT
                user_id as userId, user_name as userName,
                total_plays as totalPlays, survivals, deaths,
                current_streak as currentStreak,
                max_survival_streak as maxSurvivalStreak,
                max_death_streak as maxDeathStreak,
                last_play_at as lastPlayAt
            FROM roulette_stats
            ORDER BY ${orderClause}
            LIMIT ? OFFSET ?
        `).all(limit, offset) as RouletteStats[];
    }

    getGlobalStats(): GlobalRouletteStats {
        const totals = this.db.prepare(`
            SELECT
                COUNT(*) as totalPlays,
                SUM(CASE WHEN result = 'survival' THEN 1 ELSE 0 END) as totalSurvivals,
                SUM(CASE WHEN result = 'death' THEN 1 ELSE 0 END) as totalDeaths
            FROM roulette_plays
        `).get() as { totalPlays: number; totalSurvivals: number; totalDeaths: number };

        const uniquePlayers = this.db.prepare(`
            SELECT COUNT(*) as count FROM roulette_stats
        `).get() as { count: number };

        // Find luckiest player (highest survival rate with minimum 5 plays)
        const luckiest = this.db.prepare(`
            SELECT
                user_id as userId, user_name as userName,
                CAST(survivals AS REAL) / total_plays as survivalRate,
                total_plays as totalPlays
            FROM roulette_stats
            WHERE total_plays >= 5
            ORDER BY survivalRate DESC
            LIMIT 1
        `).get() as { userId: string; userName: string; survivalRate: number; totalPlays: number } | undefined;

        // Find unluckiest player (highest death rate with minimum 5 plays)
        const unluckiest = this.db.prepare(`
            SELECT
                user_id as userId, user_name as userName,
                CAST(deaths AS REAL) / total_plays as deathRate,
                total_plays as totalPlays
            FROM roulette_stats
            WHERE total_plays >= 5
            ORDER BY deathRate DESC
            LIMIT 1
        `).get() as { userId: string; userName: string; deathRate: number; totalPlays: number } | undefined;

        return {
            totalPlays: totals.totalPlays ?? 0,
            totalSurvivals: totals.totalSurvivals ?? 0,
            totalDeaths: totals.totalDeaths ?? 0,
            uniquePlayers: uniquePlayers.count ?? 0,
            luckiestPlayer: luckiest,
            unluckiestPlayer: unluckiest
        };
    }

    getLeaderboard(type: 'survivors' | 'deaths' | 'plays', limit: number = 10): RouletteStats[] {
        let orderClause: string;

        switch (type) {
            case 'survivors':
                orderClause = 'survivals DESC, total_plays ASC';
                break;
            case 'deaths':
                orderClause = 'deaths DESC, total_plays ASC';
                break;
            case 'plays':
            default:
                orderClause = 'total_plays DESC';
                break;
        }

        return this.db.prepare(`
            SELECT
                user_id as userId, user_name as userName,
                total_plays as totalPlays, survivals, deaths,
                current_streak as currentStreak,
                max_survival_streak as maxSurvivalStreak,
                max_death_streak as maxDeathStreak,
                last_play_at as lastPlayAt
            FROM roulette_stats
            ORDER BY ${orderClause}
            LIMIT ?
        `).all(limit) as RouletteStats[];
    }

    // ============================================
    // Private Helpers
    // ============================================

    private _updateStats(userId: string, userName: string, result: 'survival' | 'death', now: number): void {
        // Get existing stats
        const existing = this.getStats(userId);

        if (!existing) {
            // Create new stats record
            const currentStreak = result === 'survival' ? 1 : -1;
            const maxSurvivalStreak = result === 'survival' ? 1 : 0;
            const maxDeathStreak = result === 'death' ? 1 : 0;

            this.db.prepare(`
                INSERT INTO roulette_stats (
                    user_id, user_name, total_plays, survivals, deaths,
                    current_streak, max_survival_streak, max_death_streak, last_play_at
                )
                VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
            `).run(
                userId,
                userName,
                result === 'survival' ? 1 : 0,
                result === 'death' ? 1 : 0,
                currentStreak,
                maxSurvivalStreak,
                maxDeathStreak,
                now
            );
        } else {
            // Update existing stats
            let newStreak: number;
            if (result === 'survival') {
                newStreak = existing.currentStreak >= 0 ? existing.currentStreak + 1 : 1;
            } else {
                newStreak = existing.currentStreak <= 0 ? existing.currentStreak - 1 : -1;
            }

            const maxSurvivalStreak = Math.max(
                existing.maxSurvivalStreak,
                newStreak > 0 ? newStreak : 0
            );
            const maxDeathStreak = Math.max(
                existing.maxDeathStreak,
                newStreak < 0 ? Math.abs(newStreak) : 0
            );

            this.db.prepare(`
                UPDATE roulette_stats
                SET
                    user_name = ?,
                    total_plays = total_plays + 1,
                    survivals = survivals + ?,
                    deaths = deaths + ?,
                    current_streak = ?,
                    max_survival_streak = ?,
                    max_death_streak = ?,
                    last_play_at = ?
                WHERE user_id = ?
            `).run(
                userName,
                result === 'survival' ? 1 : 0,
                result === 'death' ? 1 : 0,
                newStreak,
                maxSurvivalStreak,
                maxDeathStreak,
                now,
                userId
            );
        }
    }

    // ============================================
    // Cleanup
    // ============================================

    clearAllData(): void {
        this.db.prepare(`DELETE FROM roulette_plays`).run();
        this.db.prepare(`DELETE FROM roulette_stats`).run();
    }
}
