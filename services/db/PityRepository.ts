import Database from 'better-sqlite3';
import {PityData} from "../middleware/gacha/types";

export class PityRepository {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    /** Получить pity данные пользователя */
    getUserPity(userId: string): PityData | null {
        const row = this.db
            .prepare(
                `
                SELECT 
                    pulls_since_5_star AS pullsSince5Star,
                    pulls_since_4_star AS pullsSince4Star,
                    pity_4_star_failed_rate_up AS pity4StarFailedRateUp,
                    is_guaranteed_5_star AS isGuaranteed5Star
                FROM user_pity
                WHERE user_id = @userId
                `
            )
            .get({ userId: String(userId) }) as any;

        if (!row) return null;

        return {
            pullsSince5Star: row.pullsSince5Star,
            pullsSince4Star: row.pullsSince4Star,
            pity4StarFailedRateUp: row.pity4StarFailedRateUp,
            isGuaranteed5Star: !!row.isGuaranteed5Star
        };
    }

    /** Создать начальные pity данные для пользователя */
    createUserPity(userId: string): PityData {
        this.db
            .prepare(
                `
                INSERT INTO user_pity (user_id)
                VALUES (@userId)
                `
            )
            .run({ userId: String(userId) });

        return {
            pullsSince5Star: 0,
            pullsSince4Star: 0,
            pity4StarFailedRateUp: 0,
            isGuaranteed5Star: false
        };
    }

    /** Обновить pity данные пользователя */
    updateUserPity(userId: string, update: Partial<PityData>): void {
        const sets: string[] = [];
        const params: any = { userId: String(userId) };

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
            WHERE user_id = @userId
        `;

        this.db.prepare(query).run(params);
    }

    /** Сбросить pity данные пользователя */
    resetUserPity(userId: string): void {
        this.db
            .prepare(
                `
                UPDATE user_pity
                SET 
                    pulls_since_5_star = 0,
                    pulls_since_4_star = 0,
                    pity_4_star_failed_rate_up = 0,
                    is_guaranteed_5_star = 0
                WHERE user_id = @userId
                `
            )
            .run({ userId: String(userId) });
    }

    /** Удалить pity данные пользователя */
    deleteUserPity(userId: string): void {
        this.db
            .prepare('DELETE FROM user_pity WHERE user_id = @userId')
            .run({ userId: String(userId) });
    }
}