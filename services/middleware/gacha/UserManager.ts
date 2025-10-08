import { PityData, UserPityData } from "./types";
import { PityRepository } from "../../db/PityRepository";
import { DbRepository } from "../../db/DbRepository";
import {ipcMain} from "electron";

export class UserManager {
    private pityRepo: PityRepository;

    constructor() {
        this.pityRepo = DbRepository.getInstance("default").pity;
        this.registerIPCHandlers()
    }

    getUserData(userId: string, userName: string): UserPityData {
        let pity = this.pityRepo.getUserPity(userId);
        if (!pity) {
            pity = this.pityRepo.createUserPity(userId, userName);
        }
        return { userId, pity, userName };
    }

    updateUserPity(userId: string, update: Partial<PityData>, userName: string): void {
        // Убедимся, что запись существует
        this.getUserData(userId, userName);
        this.pityRepo.updateUserPity(userId, update, userName);
    }

    getUserPityStatus(userId: string, userName: string): PityData {
        const userData = this.getUserData(userId, userName);
        return userData.pity;
    }

    // Для сброса pity (например, при смене баннера)
    resetUserPity(userId: string): void {
        this.pityRepo.resetUserPity(userId);
    }

    // Переключение БД при смене авторизованного пользователя (стример/модератор)
    setCurrentUserId(userId: string | null): void {
        this.pityRepo = DbRepository.getInstance(userId || "default").pity;
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