import { GachaStoreSchema, LegacyGachaStoreSchema, GachaTrigger, Item } from './types';

/**
 * Проверяет, является ли конфигурация старым форматом (с одним баннером)
 */
export function isLegacyGachaConfig(config: any): config is LegacyGachaStoreSchema {
    return config && 'banner' in config && !('banners' in config);
}

/**
 * Мигрирует старый формат конфигурации гачи в новый (с множеством баннеров)
 */
export function migrateGachaConfig(oldConfig: any): GachaStoreSchema {
    // Если уже новый формат - возвращаем как есть
    if (oldConfig?.banners && Array.isArray(oldConfig.banners)) {
        return oldConfig as GachaStoreSchema;
    }

    // Если нет конфигурации - возвращаем дефолтную
    if (!oldConfig) {
        return getDefaultGachaConfig();
    }

    // Миграция старого формата
    const legacyConfig = oldConfig as LegacyGachaStoreSchema;

    // Мигрируем items с bannerId = 0
    const migratedItems: Item[] = (legacyConfig.items || []).map(item => ({
        ...item,
        bannerId: item.bannerId ?? 0
    }));

    // Мигрируем triggers с bannerId = 0
    const migratedTriggers: GachaTrigger[] = (legacyConfig.triggers || []).map(trigger => ({
        rewardId: trigger.rewardId,
        amount: trigger.amount,
        bannerId: 0
    }));

    // Мигрируем баннер в массив
    const banners = legacyConfig.banner
        ? [{ ...legacyConfig.banner, id: legacyConfig.banner.id ?? 0 }]
        : [getDefaultBannerConfig(0)];

    return {
        enabled: legacyConfig.enabled ?? false,
        banners,
        items: migratedItems,
        triggers: migratedTriggers
    };
}

/**
 * Возвращает дефолтную конфигурацию баннера
 */
export function getDefaultBannerConfig(id: number) {
    return {
        id,
        name: `Banner ${id + 1}`,
        featured5StarId: null,
        featured4StarIds: [],
        hardPity5Star: 90,
        hardPity4Star: 10,
        softPityStart: 74,
        baseRate5Star: 0.006,
        baseRate4Star: 0.051,
        featuredRate4Star: 0.5,
        hasCapturingRadiance: true
    };
}

/**
 * Возвращает дефолтную конфигурацию гачи
 */
export function getDefaultGachaConfig(): GachaStoreSchema {
    return {
        enabled: false,
        banners: [getDefaultBannerConfig(0)],
        items: [],
        triggers: []
    };
}
