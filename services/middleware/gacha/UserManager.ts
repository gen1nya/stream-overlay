import { PityData, UserPityData, UserBannerPityData } from "./types";
import { PityRepository } from "../../db/PityRepository";
import { DbRepository } from "../../db/DbRepository";
import { ipcMain } from "electron";

export class UserManager {
    private pityRepo: PityRepository;
    private currentDbUserId: string = "default";

    constructor() {
        console.log('[UserManager] Constructor called');
        this.pityRepo = DbRepository.getInstance("default").pity;
        console.log('[UserManager] Initial pity repo for user: default');
        this.registerIPCHandlers();
    }

    getUserData(userId: string, userName: string, bannerId: number = 0): UserBannerPityData {
        console.log('[UserManager] getUserData called');
        console.log('[UserManager]   - userId:', userId);
        console.log('[UserManager]   - userName:', userName);
        console.log('[UserManager]   - bannerId:', bannerId);

        let pity = this.pityRepo.getUserPity(userId, bannerId);
        console.log('[UserManager] Existing pity from DB:', JSON.stringify(pity, null, 2));

        if (!pity) {
            console.log('[UserManager] No pity found, creating new record');
            pity = this.pityRepo.createUserPity(userId, userName, bannerId);
            console.log('[UserManager] Created new pity:', JSON.stringify(pity, null, 2));
        }
        return { userId, pity, userName, bannerId };
    }

    updateUserPity(userId: string, bannerId: number, update: Partial<PityData>, userName: string): void {
        console.log('[UserManager] updateUserPity called');
        console.log('[UserManager]   - userId:', userId);
        console.log('[UserManager]   - bannerId:', bannerId);
        console.log('[UserManager]   - userName:', userName);
        console.log('[UserManager]   - update:', JSON.stringify(update, null, 2));

        // Убедимся, что запись существует
        this.getUserData(userId, userName, bannerId);
        this.pityRepo.updateUserPity(userId, bannerId, update, userName);
        console.log('[UserManager] Pity updated successfully');
    }

    getUserPityStatus(userId: string, userName: string, bannerId: number = 0): PityData {
        console.log('[UserManager] getUserPityStatus called');
        console.log('[UserManager]   - userId:', userId);
        console.log('[UserManager]   - userName:', userName);
        console.log('[UserManager]   - bannerId:', bannerId);

        const userData = this.getUserData(userId, userName, bannerId);
        console.log('[UserManager] Returning pity status:', JSON.stringify(userData.pity, null, 2));
        return userData.pity;
    }

    // Для сброса pity (например, при смене баннера)
    resetUserPity(userId: string, bannerId: number = 0): void {
        console.log('[UserManager] resetUserPity called for userId:', userId, 'bannerId:', bannerId);
        this.pityRepo.resetUserPity(userId, bannerId);
    }

    // Переключение БД при смене авторизованного пользователя (стример/модератор)
    setCurrentUserId(userId: string | null): void {
        const newUserId = userId || "default";
        console.log('[UserManager] setCurrentUserId called');
        console.log('[UserManager]   - previous DB userId:', this.currentDbUserId);
        console.log('[UserManager]   - new DB userId:', newUserId);

        this.currentDbUserId = newUserId;
        this.pityRepo = DbRepository.getInstance(newUserId).pity;
        console.log('[UserManager] Switched to DB:', newUserId);
    }

    registerIPCHandlers(): void {
        // Новые обработчики с поддержкой bannerId
        ipcMain.handle('gacha:get-users', (_event, { bannerId, offset, limit }) => {
            const total = this.pityRepo.countUsersByBanner(bannerId);
            const users = this.pityRepo.getUsersByBanner(bannerId, offset, limit);
            return { total, users };
        });

        ipcMain.handle('gacha:search-users', (_event, { bannerId, query, offset, limit }) => {
            const users = this.pityRepo.searchUsersByBanner(bannerId, query, offset, limit);
            return { total: users.length, users };
        });

        ipcMain.handle('gacha:delete-user-pity', (_event, { userId, bannerId }) => {
            this.pityRepo.deleteUserPity(userId, bannerId);
        });

        ipcMain.handle('gacha:update-user-pity', (_event, {
            userId,
            bannerId,
            userName,
            pullsSince5Star,
            pullsSince4Star,
            pity4StarFailedRateUp,
            isGuaranteed5Star
        }) => {
            this.updateUserPity(
                userId,
                bannerId,
                {
                    pullsSince5Star,
                    pullsSince4Star,
                    pity4StarFailedRateUp,
                    isGuaranteed5Star
                },
                userName
            );
        });

        ipcMain.handle('gacha:delete-banner-pity', (_event, { bannerId }) => {
            this.pityRepo.deleteByBanner(bannerId);
        });

        // Старые обработчики для обратной совместимости (с bannerId = 0)
        ipcMain.handle('gatcha:get-users', (_event, { offset, limit }) => {
            const total = this.pityRepo.countUsersByBanner(0);
            const users = this.pityRepo.getUsersByBanner(0, offset, limit);
            return { total, users };
        });

        ipcMain.handle('gatcha:search-users', (_event, { query, offset, limit }) => {
            const users = this.pityRepo.searchUsersByBanner(0, query, offset, limit);
            return { total: users.length, users };
        });

        ipcMain.handle('gatcha:delete-user', (_event, { userId }) => {
            this.pityRepo.deleteUserPity(userId, 0);
        });

        ipcMain.handle('gatcha:update-user', (_event, {
            userId,
            userName,
            pullsSince5Star,
            pullsSince4Star,
            pity4StarFailedRateUp,
            isGuaranteed5Star
        }) => {
            this.updateUserPity(
                userId,
                0,
                {
                    pullsSince5Star,
                    pullsSince4Star,
                    pity4StarFailedRateUp,
                    isGuaranteed5Star
                },
                userName
            );
        });
    }
}
