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
    bannerId: number;
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
    userName: string;
    userId: string;
    pity: PityData;
}

// Pity для пользователя по конкретному баннеру
export interface UserBannerPityData {
    userName: string;
    userId: string;
    bannerId: number;
    pity: PityData;
}

// Шаблоны сообщений для баннера
export interface GachaBannerMessages {
    singlePull: string;        // Переменные: ${user}, ${item}, ${stars}, ${rarity}
    multiPullIntro: string;    // Переменные: ${user}, ${count}
    won5050: string;           // Сообщение при выигрыше 50/50
    lost5050: string;          // Сообщение при проигрыше 50/50
    capturingRadiance: string; // Сообщение при срабатывании Capturing Radiance
    softPity: string;          // Переменные: ${pullNumber}
    error: string;             // Переменные: ${user}, ${error}
}

// Конфигурация баннера для store
export interface GachaBannerConfig {
    id: number;
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

    // Шаблоны сообщений (опционально для обратной совместимости)
    messages?: GachaBannerMessages;
}

// Триггер с привязкой к баннеру
export interface GachaTrigger {
    rewardId: string;
    amount: number;
    bannerId: number;
}

// Схема для хранения в store (новый формат с множеством баннеров)
export interface GachaStoreSchema {
    enabled: boolean;
    banners: GachaBannerConfig[];
    items: Item[];
    triggers: GachaTrigger[];
}

// Старая схема для обратной совместимости (один баннер)
export interface LegacyGachaStoreSchema {
    enabled: boolean;
    banner: GachaBannerConfig;
    items: Item[];
    triggers: { rewardId: string; amount: number }[];
}