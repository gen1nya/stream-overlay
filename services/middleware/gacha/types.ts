export enum Rarity {
    THREE_STAR = 3,
    FOUR_STAR = 4,
    FIVE_STAR = 5
}

export interface Item {
    id: string;
    name: string;
    rarity: Rarity;
    isLimited: boolean;
    bannerId: number; // Всегда 0 для MVP
}

export interface PullResult {
    item: Item;
    pullNumber: number;
    wasGuaranteed: boolean;
    wasSoftPity: boolean;
    was5050: boolean;
    won5050: boolean | null;
    wasCapturingRadiance: boolean;
}

export interface PityData {
    pullsSince5Star: number;
    pullsSince4Star: number;
    pity4StarFailedRateUp: number;
    isGuaranteed5Star: boolean;
}

export interface UserPityData {
    userId: string;
    pity: PityData;
}

// Конфигурация баннера для store
export interface GachaBannerConfig {
    id: number; // Всегда 0 для MVP
    name: string;
    featured5StarId: string | null;
    featured4StarIds: string[];

    // Механика
    hardPity5Star: number;
    hardPity4Star: number;
    softPityStart: number;
    baseRate5Star: number;
    baseRate4Star: number;
    featuredRate4Star: number;
    hasCapturingRadiance: boolean;
}

// Схема для хранения в store
export interface GachaStoreSchema {
    enabled: boolean;
    banner: GachaBannerConfig;
    items: Item[];
    // list of channel rewards that allow to trigger gacha pull for specific amount
    // rewardId - Twitch reward ID
    // amount - number of pulls to trigger
    triggers: [ { rewardId: string, amount: number }];
}