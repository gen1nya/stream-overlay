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

    /**
     * Получить топ разыгрываемых предметов (subjects)
     * Возвращает subjects с количеством розыгрышей
     */
    getTopSubjects(limit: number = 5): { subject: string; count: number }[] {
        const rows = this.db
            .prepare(
                `
                SELECT
                    child_user AS subject,
                    COUNT(*) AS count
                FROM lottery_draws
                WHERE status = 'completed' AND winner_id IS NOT NULL
                GROUP BY child_user
                ORDER BY count DESC
                LIMIT @limit
                `
            )
            .all({ limit }) as any[];

        return rows.map(row => ({
            subject: row.subject,
            count: row.count
        }));
    }

    /**
     * Получить предметы, выигранные конкретным пользователем
     */
    getUserWonSubjects(userId: string, limit: number = 10): string[] {
        const rows = this.db
            .prepare(
                `
                SELECT child_user AS subject
                FROM lottery_draws
                WHERE status = 'completed' AND winner_id = @userId
                ORDER BY ended_at DESC
                LIMIT @limit
                `
            )
            .all({ userId, limit }) as any[];

        return rows.map(row => row.subject);
    }

    // ==================== MONTHLY STATS (Статистика за месяц) ====================

    /**
     * Получить топ победителей за текущий месяц
     */
    getTopWinnersThisMonth(limit: number = 5): { oderId: string; userName: string; wins: number }[] {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const rows = this.db
            .prepare(
                `
                SELECT
                    winner_id AS oderId,
                    winner_name AS userName,
                    COUNT(*) AS wins
                FROM lottery_draws
                WHERE status = 'completed'
                    AND winner_id IS NOT NULL
                    AND CAST(strftime('%Y', started_at / 1000, 'unixepoch') AS INTEGER) = @year
                    AND CAST(strftime('%m', started_at / 1000, 'unixepoch') AS INTEGER) = @month
                GROUP BY winner_id
                ORDER BY wins DESC
                LIMIT @limit
                `
            )
            .all({ year, month, limit }) as any[];

        return rows.map(row => ({
            oderId: row.oderId,
            userName: row.userName,
            wins: row.wins
        }));
    }

    /**
     * Получить топ предметов за текущий месяц
     */
    getTopSubjectsThisMonth(limit: number = 5): { subject: string; count: number }[] {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const rows = this.db
            .prepare(
                `
                SELECT
                    child_user AS subject,
                    COUNT(*) AS count
                FROM lottery_draws
                WHERE status = 'completed'
                    AND winner_id IS NOT NULL
                    AND CAST(strftime('%Y', started_at / 1000, 'unixepoch') AS INTEGER) = @year
                    AND CAST(strftime('%m', started_at / 1000, 'unixepoch') AS INTEGER) = @month
                GROUP BY child_user
                ORDER BY count DESC
                LIMIT @limit
                `
            )
            .all({ year, month, limit }) as any[];

        return rows.map(row => ({
            subject: row.subject,
            count: row.count
        }));
    }

    /**
     * Получить количество побед пользователя за текущий месяц
     */
    getUserWinsThisMonth(userId: string): number {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        return this.db
            .prepare(
                `
                SELECT COUNT(*) AS wins
                FROM lottery_draws
                WHERE status = 'completed'
                    AND winner_id = @userId
                    AND CAST(strftime('%Y', started_at / 1000, 'unixepoch') AS INTEGER) = @year
                    AND CAST(strftime('%m', started_at / 1000, 'unixepoch') AS INTEGER) = @month
                `
            )
            .pluck()
            .get({ userId, year, month }) as number;
    }

    /**
     * Получить предметы, выигранные пользователем за текущий месяц
     */
    getUserWonSubjectsThisMonth(userId: string, limit: number = 10): string[] {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const rows = this.db
            .prepare(
                `
                SELECT child_user AS subject
                FROM lottery_draws
                WHERE status = 'completed'
                    AND winner_id = @userId
                    AND CAST(strftime('%Y', started_at / 1000, 'unixepoch') AS INTEGER) = @year
                    AND CAST(strftime('%m', started_at / 1000, 'unixepoch') AS INTEGER) = @month
                ORDER BY ended_at DESC
                LIMIT @limit
                `
            )
            .all({ userId, year, month, limit }) as any[];

        return rows.map(row => row.subject);
    }

    // ==================== ADMIN (Управление данными) ====================

    /**
     * Получить список месяцев, в которых есть розыгрыши
     * Возвращает массив { year, month, count }
     */
    getAvailableMonths(): { year: number; month: number; count: number }[] {
        const rows = this.db
            .prepare(
                `
                SELECT
                    CAST(strftime('%Y', started_at / 1000, 'unixepoch') AS INTEGER) AS year,
                    CAST(strftime('%m', started_at / 1000, 'unixepoch') AS INTEGER) AS month,
                    COUNT(*) AS count
                FROM lottery_draws
                WHERE status != 'pending'
                GROUP BY year, month
                ORDER BY year DESC, month DESC
                `
            )
            .all() as any[];

        return rows.map(row => ({
            year: row.year,
            month: row.month,
            count: row.count
        }));
    }

    /**
     * Получить розыгрыши за конкретный месяц
     */
    getDrawsByMonth(year: number, month: number): LotteryDraw[] {
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
                    AND CAST(strftime('%Y', started_at / 1000, 'unixepoch') AS INTEGER) = @year
                    AND CAST(strftime('%m', started_at / 1000, 'unixepoch') AS INTEGER) = @month
                ORDER BY started_at DESC
                `
            )
            .all({ year, month }) as any[];

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

    /**
     * Получить агрегированную статистику по месяцам
     */
    getMonthlyStats(): {
        year: number;
        month: number;
        totalDraws: number;
        completedDraws: number;
        cancelledDraws: number;
        totalParticipants: number;
        uniqueWinners: number;
    }[] {
        const rows = this.db
            .prepare(
                `
                SELECT
                    CAST(strftime('%Y', started_at / 1000, 'unixepoch') AS INTEGER) AS year,
                    CAST(strftime('%m', started_at / 1000, 'unixepoch') AS INTEGER) AS month,
                    COUNT(*) AS totalDraws,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedDraws,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledDraws,
                    SUM(participant_count) AS totalParticipants,
                    COUNT(DISTINCT winner_id) AS uniqueWinners
                FROM lottery_draws
                WHERE status != 'pending'
                GROUP BY year, month
                ORDER BY year DESC, month DESC
                `
            )
            .all() as any[];

        return rows.map(row => ({
            year: row.year,
            month: row.month,
            totalDraws: row.totalDraws,
            completedDraws: row.completedDraws,
            cancelledDraws: row.cancelledDraws,
            totalParticipants: row.totalParticipants || 0,
            uniqueWinners: row.uniqueWinners
        }));
    }

    /**
     * Очистить все данные лотереи
     * Удаляет: розыгрыши, использованные предметы, статистику
     */
    clearAllData(): { draws: number; usedSubjects: number; stats: number } {
        const drawsDeleted = this.db
            .prepare('DELETE FROM lottery_draws')
            .run().changes;

        const usedSubjectsDeleted = this.db
            .prepare('DELETE FROM lottery_used_subjects')
            .run().changes;

        const statsDeleted = this.db
            .prepare('DELETE FROM lottery_stats')
            .run().changes;

        return {
            draws: drawsDeleted,
            usedSubjects: usedSubjectsDeleted,
            stats: statsDeleted
        };
    }

    /**
     * Очистить данные за конкретный месяц
     * Корректирует статистику пользователей (уменьшает количество побед)
     */
    clearMonth(year: number, month: number): number {
        // 1. Получаем победителей за этот месяц для корректировки статистики
        const winners = this.db
            .prepare(
                `
                SELECT winner_id AS oderId, COUNT(*) AS wins
                FROM lottery_draws
                WHERE status = 'completed'
                    AND winner_id IS NOT NULL
                    AND CAST(strftime('%Y', started_at / 1000, 'unixepoch') AS INTEGER) = @year
                    AND CAST(strftime('%m', started_at / 1000, 'unixepoch') AS INTEGER) = @month
                GROUP BY winner_id
                `
            )
            .all({ year, month }) as { oderId: string; wins: number }[];

        // 2. Уменьшаем счётчики побед
        const updateStmt = this.db.prepare(
            `UPDATE lottery_stats SET total_wins = MAX(0, total_wins - @wins) WHERE user_id = @oderId`
        );
        for (const winner of winners) {
            updateStmt.run({ oderId: winner.oderId, wins: winner.wins });
        }

        // 3. Удаляем розыгрыши
        const result = this.db
            .prepare(
                `
                DELETE FROM lottery_draws
                WHERE CAST(strftime('%Y', started_at / 1000, 'unixepoch') AS INTEGER) = @year
                    AND CAST(strftime('%m', started_at / 1000, 'unixepoch') AS INTEGER) = @month
                `
            )
            .run({ year, month });

        // 4. Удаляем пользователей с нулевой статистикой (опционально, для чистоты)
        this.db.prepare(
            `DELETE FROM lottery_stats WHERE total_wins = 0 AND total_entries = 0 AND total_initiated = 0`
        ).run();

        return result.changes;
    }

    /**
     * Экспорт всех данных в формате для CSV
     */
    exportAllDraws(): {
        id: number;
        subject: string;
        initiatorName: string;
        startedAt: string;
        endedAt: string;
        winnerName: string | null;
        participantCount: number;
        status: string;
    }[] {
        const rows = this.db
            .prepare(
                `
                SELECT
                    id,
                    child_user AS subject,
                    initiator_name AS initiatorName,
                    datetime(started_at / 1000, 'unixepoch', 'localtime') AS startedAt,
                    datetime(ended_at / 1000, 'unixepoch', 'localtime') AS endedAt,
                    winner_name AS winnerName,
                    participant_count AS participantCount,
                    status
                FROM lottery_draws
                WHERE status != 'pending'
                ORDER BY started_at DESC
                `
            )
            .all() as any[];

        return rows;
    }
}
