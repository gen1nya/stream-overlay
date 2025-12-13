import Database from 'better-sqlite3';
import { LotteryDraw, LotteryStats } from '../middleware/lottery/types';

/**
 * Репозиторий для работы с данными лотереи
 */
export class LotteryRepository {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    // ==================== DRAWS (История розыгрышей) ====================

    /**
     * Создать новый розыгрыш (при старте)
     * @returns ID созданного розыгрыша
     */
    createDraw(
        subject: string,
        initiatorId: string,
        initiatorName: string
    ): number {
        const now = Date.now();
        const result = this.db
            .prepare(
                `
                INSERT INTO lottery_draws (
                    child_user, initiator_id, initiator_name,
                    started_at, ended_at, participant_count, status
                )
                VALUES (@subject, @initiatorId, @initiatorName, @startedAt, 0, 0, 'pending')
                `
            )
            .run({
                subject,
                initiatorId,
                initiatorName,
                startedAt: now
            });

        return result.lastInsertRowid as number;
    }

    /**
     * Завершить розыгрыш с победителем
     */
    completeDraw(
        drawId: number,
        winnerId: string | null,
        winnerName: string | null,
        participantCount: number
    ): void {
        this.db
            .prepare(
                `
                UPDATE lottery_draws
                SET
                    ended_at = @endedAt,
                    winner_id = @winnerId,
                    winner_name = @winnerName,
                    participant_count = @participantCount,
                    status = 'completed'
                WHERE id = @drawId
                `
            )
            .run({
                drawId,
                endedAt: Date.now(),
                winnerId,
                winnerName,
                participantCount
            });
    }

    /**
     * Отменить розыгрыш
     */
    cancelDraw(drawId: number): void {
        this.db
            .prepare(
                `
                UPDATE lottery_draws
                SET
                    ended_at = @endedAt,
                    status = 'cancelled'
                WHERE id = @drawId
                `
            )
            .run({
                drawId,
                endedAt: Date.now()
            });
    }

    /**
     * Получить розыгрыш по ID
     */
    getDraw(drawId: number): LotteryDraw | null {
        const row = this.db
            .prepare(
                `
                SELECT
                    id,
                    child_user AS subject,
                    initiator_id AS initiatorId,
                    initiator_name AS initiatorName,
                    started_at AS startedAt,
                    ended_at AS endedAt,
                    winner_id AS winnerId,
                    winner_name AS winnerName,
                    participant_count AS participantCount,
                    status
                FROM lottery_draws
                WHERE id = @drawId
                `
            )
            .get({ drawId }) as any;

        if (!row) return null;

        return {
            id: row.id,
            subject: row.subject,
            initiatorId: row.initiatorId,
            initiatorName: row.initiatorName,
            startedAt: row.startedAt,
            endedAt: row.endedAt,
            winnerId: row.winnerId,
            winnerName: row.winnerName,
            participantCount: row.participantCount,
            status: row.status
        };
    }

    /**
     * Получить историю розыгрышей
     */
    getDrawHistory(limit: number = 50, offset: number = 0): LotteryDraw[] {
        const rows = this.db
            .prepare(
                `
                SELECT
                    id,
                    child_user AS subject,
                    initiator_id AS initiatorId,
                    initiator_name AS initiatorName,
                    started_at AS startedAt,
                    ended_at AS endedAt,
                    winner_id AS winnerId,
                    winner_name AS winnerName,
                    participant_count AS participantCount,
                    status
                FROM lottery_draws
                WHERE status != 'pending'
                ORDER BY started_at DESC
                LIMIT @limit OFFSET @offset
                `
            )
            .all({ limit, offset }) as any[];

        return rows.map(row => ({
            id: row.id,
            subject: row.subject,
            initiatorId: row.initiatorId,
            initiatorName: row.initiatorName,
            startedAt: row.startedAt,
            endedAt: row.endedAt,
            winnerId: row.winnerId,
            winnerName: row.winnerName,
            participantCount: row.participantCount,
            status: row.status
        }));
    }

    // ==================== USED SUBJECTS (Уникальность subject) ====================

    /**
     * Проверить, был ли subject уже использован
     */
    isSubjectUsed(subject: string): boolean {
        const row = this.db
            .prepare(
                `
                SELECT 1 FROM lottery_used_subjects
                WHERE child_user = @subject
                `
            )
            .get({ subject: subject.toLowerCase() });

        return !!row;
    }

    /**
     * Отметить subject как использованный
     */
    markSubjectUsed(subject: string, drawId: number): void {
        this.db
            .prepare(
                `
                INSERT OR IGNORE INTO lottery_used_subjects (child_user, draw_id, used_at)
                VALUES (@subject, @drawId, @usedAt)
                `
            )
            .run({
                subject: subject.toLowerCase(),
                drawId,
                usedAt: Date.now()
            });
    }

    /**
     * Получить список использованных subject
     */
    getUsedSubjects(limit: number = 100): string[] {
        const rows = this.db
            .prepare(
                `
                SELECT child_user AS subject FROM lottery_used_subjects
                ORDER BY used_at DESC
                LIMIT @limit
                `
            )
            .all({ limit }) as any[];

        return rows.map(row => row.subject);
    }

    /**
     * Удалить subject из использованных (разблокировать)
     */
    removeUsedSubject(subject: string): void {
        this.db
            .prepare(
                `
                DELETE FROM lottery_used_subjects
                WHERE child_user = @subject
                `
            )
            .run({ subject: subject.toLowerCase() });
    }

    // ==================== STATS (Статистика пользователей) ====================

    /**
     * Получить статистику пользователя
     */
    getStats(userId: string): LotteryStats | null {
        const row = this.db
            .prepare(
                `
                SELECT
                    user_id AS oderId,
                    user_name AS userName,
                    total_entries AS totalEntries,
                    total_wins AS totalWins,
                    total_initiated AS totalInitiated,
                    last_win_at AS lastWinAt,
                    updated_at AS updatedAt
                FROM lottery_stats
                WHERE user_id = @userId
                `
            )
            .get({ userId }) as any;

        if (!row) return null;

        return {
            userId: row.userId,
            userName: row.userName,
            totalEntries: row.totalEntries,
            totalWins: row.totalWins,
            totalInitiated: row.totalInitiated,
            lastWinAt: row.lastWinAt,
            updatedAt: row.updatedAt
        };
    }

    /**
     * Обновить статистику пользователя
     */
    updateStats(
        userId: string,
        userName: string,
        type: 'entry' | 'win' | 'initiated'
    ): void {
        const now = Date.now();

        // Сначала пробуем вставить
        const insertResult = this.db
            .prepare(
                `
                INSERT OR IGNORE INTO lottery_stats (
                    user_id, user_name, total_entries, total_wins, total_initiated, updated_at
                )
                VALUES (@userId, @userName, 0, 0, 0, @updatedAt)
                `
            )
            .run({ userId, userName, updatedAt: now });

        // Затем обновляем нужное поле
        let updateQuery: string;
        const params: any = { userId, userName, updatedAt: now };

        switch (type) {
            case 'entry':
                updateQuery = `
                    UPDATE lottery_stats
                    SET total_entries = total_entries + 1, user_name = @userName, updated_at = @updatedAt
                    WHERE user_id = @userId
                `;
                break;
            case 'win':
                updateQuery = `
                    UPDATE lottery_stats
                    SET total_wins = total_wins + 1, last_win_at = @updatedAt, user_name = @userName, updated_at = @updatedAt
                    WHERE user_id = @userId
                `;
                break;
            case 'initiated':
                updateQuery = `
                    UPDATE lottery_stats
                    SET total_initiated = total_initiated + 1, user_name = @userName, updated_at = @updatedAt
                    WHERE user_id = @userId
                `;
                break;
        }

        this.db.prepare(updateQuery).run(params);
    }

    /**
     * Получить топ победителей
     */
    getTopWinners(limit: number = 10): LotteryStats[] {
        const rows = this.db
            .prepare(
                `
                SELECT
                    user_id AS oderId,
                    user_name AS userName,
                    total_entries AS totalEntries,
                    total_wins AS totalWins,
                    total_initiated AS totalInitiated,
                    last_win_at AS lastWinAt,
                    updated_at AS updatedAt
                FROM lottery_stats
                WHERE total_wins > 0
                ORDER BY total_wins DESC
                LIMIT @limit
                `
            )
            .all({ limit }) as any[];

        return rows.map(row => ({
            userId: row.userId,
            userName: row.userName,
            totalEntries: row.totalEntries,
            totalWins: row.totalWins,
            totalInitiated: row.totalInitiated,
            lastWinAt: row.lastWinAt,
            updatedAt: row.updatedAt
        }));
    }

    /**
     * Подсчёт общего количества пользователей в статистике
     */
    countStatsUsers(): number {
        return this.db
            .prepare('SELECT COUNT(*) FROM lottery_stats')
            .pluck()
            .get() as number;
    }

    /**
     * Подсчёт общего количества розыгрышей
     */
    countDraws(): number {
        return this.db
            .prepare("SELECT COUNT(*) FROM lottery_draws WHERE status = 'completed'")
            .pluck()
            .get() as number;
    }
}
