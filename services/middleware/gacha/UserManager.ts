import { PityData, UserPityData } from "./types";
import { PityRepository } from "../../db/PityRepository";
import { DbRepository } from "../../db/DbRepository";
import {ipcMain} from "electron";

export class UserManager {
    private pityRepo: PityRepository;
    private currentDbUserId: string = "default";

    constructor() {
        console.log('👤 [UserManager] Constructor called');
        this.pityRepo = DbRepository.getInstance("default").pity;
        console.log('👤 [UserManager] Initial pity repo for user: default');
        this.registerIPCHandlers()
    }

    getUserData(userId: string, userName: string): UserPityData {
        console.log('👤 [UserManager] getUserData called');
        console.log('👤 [UserManager]   - userId:', userId);
        console.log('👤 [UserManager]   - userName:', userName);
        console.log('👤 [UserManager]   - current DB userId:', this.currentDbUserId);

        let pity = this.pityRepo.getUserPity(userId);
        console.log('👤 [UserManager] Existing pity from DB:', JSON.stringify(pity, null, 2));

        if (!pity) {
            console.log('👤 [UserManager] No pity found, creating new record');
            pity = this.pityRepo.createUserPity(userId, userName);
            console.log('👤 [UserManager] Created new pity:', JSON.stringify(pity, null, 2));
        }
        return { userId, pity, userName };
    }

    updateUserPity(userId: string, update: Partial<PityData>, userName: string): void {
        console.log('👤 [UserManager] updateUserPity called');
        console.log('👤 [UserManager]   - userId:', userId);
        console.log('👤 [UserManager]   - userName:', userName);
        console.log('👤 [UserManager]   - update:', JSON.stringify(update, null, 2));
        console.log('👤 [UserManager]   - current DB userId:', this.currentDbUserId);

        // Убедимся, что запись существует
        this.getUserData(userId, userName);
        this.pityRepo.updateUserPity(userId, update, userName);
        console.log('👤 [UserManager] Pity updated successfully');
    }

    getUserPityStatus(userId: string, userName: string): PityData {
        console.log('👤 [UserManager] getUserPityStatus called');
        console.log('👤 [UserManager]   - userId:', userId);
        console.log('👤 [UserManager]   - userName:', userName);

        const userData = this.getUserData(userId, userName);
        console.log('👤 [UserManager] Returning pity status:', JSON.stringify(userData.pity, null, 2));
        return userData.pity;
    }

    // Для сброса pity (например, при смене баннера)
    resetUserPity(userId: string): void {
        console.log('👤 [UserManager] resetUserPity called for userId:', userId);
        this.pityRepo.resetUserPity(userId);
    }

    // Переключение БД при смене авторизованного пользователя (стример/модератор)
    setCurrentUserId(userId: string | null): void {
        const newUserId = userId || "default";
        console.log('👤 [UserManager] setCurrentUserId called');
        console.log('👤 [UserManager]   - previous DB userId:', this.currentDbUserId);
        console.log('👤 [UserManager]   - new DB userId:', newUserId);

        this.currentDbUserId = newUserId;
        this.pityRepo = DbRepository.getInstance(newUserId).pity;
        console.log('👤 [UserManager] Switched to DB:', newUserId);
    }

    registerIPCHandlers(): void {
        ipcMain.handle('gatcha:get-users', (event, { offset, limit }) => {
            const total = this.pityRepo.countUsers();
            const users = this.pityRepo.getUsers(offset, limit);
            return { total, users };
        });
        ipcMain.handle('gatcha:search-users', (event, { query, offset, limit }) => {
            const total = this.pityRepo.countUsers();
            const users =  this.pityRepo.searchUsers(query, offset, limit);
            return { total, users };
        });
        ipcMain.handle('gatcha:delete-user', (event, { userId }) => {
            this.pityRepo.deleteUserPity(userId);
        });
        ipcMain.handle('gatcha:update-user', (event, {
            userId,
            userName,
            pullsSince5Star,
            pullsSince4Star,
            pity4StarFailedRateUp,
            isGuaranteed5Star
        }) => {
            this.updateUserPity(
                userId,
                {
                    pullsSince5Star: pullsSince5Star,
                    pullsSince4Star: pullsSince4Star,
                    pity4StarFailedRateUp: pity4StarFailedRateUp,
                    isGuaranteed5Star: isGuaranteed5Star
                },
                userName
            );
        });
    }
}