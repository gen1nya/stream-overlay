import { PityData, UserPityData } from "./types";
import { PityRepository } from "../../db/PityRepository";
import { DbRepository } from "../../db/DbRepository";

export class UserManager {
    private pityRepo: PityRepository;

    constructor() {
        this.pityRepo = DbRepository.getInstance("default").pity;
    }

    getUserData(userId: string): UserPityData {
        let pity = this.pityRepo.getUserPity(userId);
        if (!pity) {
            pity = this.pityRepo.createUserPity(userId);
        }
        return { userId, pity };
    }

    updateUserPity(userId: string, update: Partial<PityData>): void {
        // Убедимся, что запись существует
        this.getUserData(userId);
        this.pityRepo.updateUserPity(userId, update);
    }

    getUserPityStatus(userId: string): PityData {
        const userData = this.getUserData(userId);
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
}