import Database from 'better-sqlite3';
import { PityData, UserPityData, UserBannerPityData } from "../middleware/gacha/types";

export class PityRepository {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    /** Получить pity данные пользователя для конкретного баннера */
    getUserPity(userId: string, bannerId: number = 0): PityData | null {
        const row = this.db
            .prepare(
                `
                SELECT
                    pulls_since_5_star AS pullsSince5Star,
                    pulls_since_4_star AS pullsSince4Star,
                    pity_4_star_failed_rate_up AS pity4StarFailedRateUp,
                    is_guaranteed_5_star AS isGuaranteed5Star
                FROM user_pity
                WHERE user_id = @userId AND banner_id = @bannerId
                `
            )
            .get({ userId: String(userId), bannerId }) as any;

        if (!row) return null;

        return {
            pullsSince5Star: row.pullsSince5Star,
            pullsSince4Star: row.pullsSince4Star,
            pity4StarFailedRateUp: row.pity4StarFailedRateUp,
            isGuaranteed5Star: !!row.isGuaranteed5Star
        };
    }

    /** Создать начальные pity данные для пользователя и баннера */
    createUserPity(userId: string, userName: string, bannerId: number = 0): PityData {
        this.db
            .prepare(
                `
            INSERT INTO user_pity (user_id, user_name, banner_id)
            VALUES (@userId, @userName, @bannerId)
            `
            )
            .run({ userId: String(userId), userName: String(userName), bannerId });

        return {
            pullsSince5Star: 0,
            pullsSince4Star: 0,
            pity4StarFailedRateUp: 0,
            isGuaranteed5Star: false
        };
    }

    /** Обновить pity данные пользователя для конкретного баннера */
    updateUserPity(
        userId: string,
        bannerId: number,
        update: Partial<PityData>,
        userName: string
    ): void {
        const sets: string[] = [];
        const params: any = { userId: String(userId), bannerId };

        if (update.pullsSince5Star !== undefined) {
            sets.push('pulls_since_5_star = @pullsSince5Star');
            params.pullsSince5Star = update.pullsSince5Star;
        }
        if (update.pullsSince4Star !== undefined) {
            sets.push('pulls_since_4_star = @pullsSince4Star');
            params.pullsSince4Star = update.pullsSince4Star;
        }
        if (update.pity4StarFailedRateUp !== undefined) {
            sets.push('pity_4_star_failed_rate_up = @pity4StarFailedRateUp');
            params.pity4StarFailedRateUp = update.pity4StarFailedRateUp;
        }
        if (update.isGuaranteed5Star !== undefined) {
            sets.push('is_guaranteed_5_star = @isGuaranteed5Star');
            params.isGuaranteed5Star = update.isGuaranteed5Star ? 1 : 0;
        }
        if (sets.length === 0) return;

        const query = `
            UPDATE user_pity
            SET ${sets.join(', ')}
            WHERE user_id = @userId AND banner_id = @bannerId
        `;

        this.db.prepare(query).run(params);
    }

    /** Сбросить pity данные пользователя для конкретного баннера */
    resetUserPity(userId: string, bannerId: number = 0): void {
        this.db
            .prepare(
                `
                UPDATE user_pity
                SET
                    pulls_since_5_star = 0,
                    pulls_since_4_star = 0,
                    pity_4_star_failed_rate_up = 0,
                    is_guaranteed_5_star = 0
                WHERE user_id = @userId AND banner_id = @bannerId
                `
            )
            .run({ userId: String(userId), bannerId });
    }

    /** Удалить pity данные пользователя для конкретного баннера */
    deleteUserPity(userId: string, bannerId: number): void {
        this.db
            .prepare('DELETE FROM user_pity WHERE user_id = @userId AND banner_id = @bannerId')
            .run({ userId: String(userId), bannerId });
    }

    /** Удалить все pity данные для баннера (при удалении баннера) */
    deleteByBanner(bannerId: number): void {
        this.db
            .prepare('DELETE FROM user_pity WHERE banner_id = @bannerId')
            .run({ bannerId });
    }

    /** Количество пользователей для конкретного баннера */
    countUsersByBanner(bannerId: number): number {
        return this.db
            .prepare(`SELECT COUNT(*) FROM user_pity WHERE banner_id = @bannerId`)
            .pluck()
            .get({ bannerId }) as number;
    }

    /** Получить пользователей для конкретного баннера */
    getUsersByBanner(bannerId: number, offset: number, limit: number): UserBannerPityData[] {
        const rows = this.db
            .prepare(
                `
            SELECT
                user_id AS userId,
                user_name AS userName,
                banner_id AS bannerId,
                pulls_since_5_star AS pullsSince5Star,
                pulls_since_4_star AS pullsSince4Star,
                pity_4_star_failed_rate_up AS pity4StarFailedRateUp,
                is_guaranteed_5_star AS isGuaranteed5Star
            FROM user_pity
            WHERE banner_id = @bannerId
            ORDER BY user_name
            LIMIT @limit OFFSET @offset
            `
            )
            .all({ bannerId, offset, limit }) as any[];

        return rows.map(row => ({
            userName: row.userName,
            userId: row.userId,
            bannerId: row.bannerId,
            pity: {
                pullsSince5Star: row.pullsSince5Star,
                pullsSince4Star: row.pullsSince4Star,
                pity4StarFailedRateUp: row.pity4StarFailedRateUp,
                isGuaranteed5Star: !!row.isGuaranteed5Star
            }
        }));
    }

    /** Поиск пользователей по имени для конкретного баннера */
    searchUsersByBanner(bannerId: number, query: string, offset: number, limit: number = 20): UserBannerPityData[] {
        const rows = this.db
            .prepare(
                `
            SELECT
                user_id AS userId,
                user_name AS userName,
                banner_id AS bannerId,
                pulls_since_5_star AS pullsSince5Star,
                pulls_since_4_star AS pullsSince4Star,
                pity_4_star_failed_rate_up AS pity4StarFailedRateUp,
                is_guaranteed_5_star AS isGuaranteed5Star
            FROM user_pity
            WHERE banner_id = @bannerId AND user_name LIKE @query
            ORDER BY user_name
            LIMIT @limit OFFSET @offset
            `
            )
            .all({
                bannerId,
                query: `%${query}%`,
                offset,
                limit
            }) as any[];

        return rows.map(row => ({
            userId: row.userId,
            userName: row.userName,
            bannerId: row.bannerId,
            pity: {
                pullsSince5Star: row.pullsSince5Star,
                pullsSince4Star: row.pullsSince4Star,
                pity4StarFailedRateUp: row.pity4StarFailedRateUp,
                isGuaranteed5Star: !!row.isGuaranteed5Star
            }
        }));
    }

    // === Методы для обратной совместимости (старый API без bannerId) ===

    /** @deprecated Используйте countUsersByBanner */
    countUsers(): number {
        return this.db.prepare(`SELECT COUNT(*) FROM user_pity`).pluck().get() as number;
    }

    /** @deprecated Используйте getUsersByBanner */
    getUsers(offset: number, limit: number): UserPityData[] {
        const rows = this.db
            .prepare(
                `
            SELECT
                user_id AS userId,
                user_name AS userName,
                pulls_since_5_star AS pullsSince5Star,
                pulls_since_4_star AS pullsSince4Star,
                pity_4_star_failed_rate_up AS pity4StarFailedRateUp,
                is_guaranteed_5_star AS isGuaranteed5Star
            FROM user_pity
            WHERE banner_id = 0
            ORDER BY user_id
            LIMIT @limit OFFSET @offset
            `
            )
            .all({ offset, limit }) as any[];

        return rows.map(row => ({
            userName: row.userName,
            userId: row.userId,
            pity: {
                pullsSince5Star: row.pullsSince5Star,
                pullsSince4Star: row.pullsSince4Star,
                pity4StarFailedRateUp: row.pity4StarFailedRateUp,
                isGuaranteed5Star: !!row.isGuaranteed5Star
            }
        }));
    }

    /** @deprecated Используйте searchUsersByBanner */
    searchUsers(query: string, offset: number, limit: number = 20): UserPityData[] {
        const rows = this.db
            .prepare(
                `
            SELECT
                user_id AS userId,
                user_name AS userName,
                pulls_since_5_star AS pullsSince5Star,
                pulls_since_4_star AS pullsSince4Star,
                pity_4_star_failed_rate_up AS pity4StarFailedRateUp,
                is_guaranteed_5_star AS isGuaranteed5Star
            FROM user_pity
            WHERE banner_id = 0 AND user_name LIKE @query
            ORDER BY user_name
            LIMIT @limit OFFSET @offset
            `
            )
            .all({
                query: `%${query}%`,
                offset,
                limit
            }) as any[];

        return rows.map(row => ({
            userId: row.userId,
            userName: row.userName,
            pity: {
                pullsSince5Star: row.pullsSince5Star,
                pullsSince4Star: row.pullsSince4Star,
                pity4StarFailedRateUp: row.pity4StarFailedRateUp,
                isGuaranteed5Star: !!row.isGuaranteed5Star
            }
        }));
    }
}
