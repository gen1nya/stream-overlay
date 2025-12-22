import { UserManager } from "./UserManager";
import { ItemInMemoryDatabase } from "./ItemInMemoryDatabase";
import { GachaBannerConfig, GachaStoreSchema, Item, PityData, PullResult, Rarity } from "./types";
import { getDefaultBannerConfig } from "./migration";

export class GachaSystem {
    private itemDb: ItemInMemoryDatabase;
    private userManager: UserManager;
    private bannerConfigs: Map<number, GachaBannerConfig> = new Map();

    constructor(initialConfig?: GachaStoreSchema) {
        console.log('[GachaEngine] Constructor called');
        console.log('[GachaEngine] Initial config provided:', !!initialConfig);
        console.log('[GachaEngine] Initial items count:', initialConfig?.items?.length || 0);
        console.log('[GachaEngine] Initial banners count:', initialConfig?.banners?.length || 0);

        this.itemDb = new ItemInMemoryDatabase(initialConfig?.items);
        this.userManager = new UserManager();

        if (initialConfig?.banners && initialConfig.banners.length > 0) {
            initialConfig.banners.forEach(banner => {
                this.bannerConfigs.set(banner.id, banner);
            });
            console.log('[GachaEngine] Loaded banners:', Array.from(this.bannerConfigs.keys()));
        } else {
            // Создаём дефолтный баннер
            const defaultBanner = getDefaultBannerConfig(0);
            this.bannerConfigs.set(0, defaultBanner);
            console.log('[GachaEngine] Using default banner config');
        }
    }

    // === Управление баннерами ===

    getBanner(bannerId: number): GachaBannerConfig | undefined {
        return this.bannerConfigs.get(bannerId);
    }

    getAllBanners(): GachaBannerConfig[] {
        return Array.from(this.bannerConfigs.values());
    }

    addBanner(config: GachaBannerConfig): void {
        console.log('[GachaEngine] addBanner called:', config.id, config.name);
        this.bannerConfigs.set(config.id, config);
    }

    updateBanner(config: GachaBannerConfig): void {
        console.log('[GachaEngine] updateBanner called:', config.id, config.name);
        this.bannerConfigs.set(config.id, config);
    }

    removeBanner(bannerId: number): void {
        console.log('[GachaEngine] removeBanner called:', bannerId);
        this.bannerConfigs.delete(bannerId);
    }

    /** @deprecated Используйте updateBanner */
    setBannerConfig(config: GachaBannerConfig): void {
        console.log('[GachaEngine] setBannerConfig called (deprecated)');
        this.bannerConfigs.set(config.id, config);
    }

    getItemDatabase(): ItemInMemoryDatabase {
        return this.itemDb;
    }

    // === Основная логика крутки ===

    pull(userId: string, userName: string, bannerId: number = 0): PullResult {
        console.log('[GachaEngine] pull() called');
        console.log('[GachaEngine]   - userId:', userId);
        console.log('[GachaEngine]   - userName:', userName);
        console.log('[GachaEngine]   - bannerId:', bannerId);

        const bannerConfig = this.bannerConfigs.get(bannerId);
        if (!bannerConfig) {
            throw new Error(`Banner ${bannerId} not found`);
        }

        const pityData = this.userManager.getUserPityStatus(userId, userName, bannerId);
        console.log('[GachaEngine] Pity data before increment:', JSON.stringify(pityData, null, 2));

        pityData.pullsSince5Star++;
        pityData.pullsSince4Star++;

        console.log('[GachaEngine] Pity data after increment:');
        console.log('[GachaEngine]   - pullsSince5Star:', pityData.pullsSince5Star);
        console.log('[GachaEngine]   - pullsSince4Star:', pityData.pullsSince4Star);

        this.userManager.updateUserPity(
            userId,
            bannerId,
            {
                pullsSince5Star: pityData.pullsSince5Star,
                pullsSince4Star: pityData.pullsSince4Star
            },
            userName
        );

        console.log('[GachaEngine] Determining pull result...');
        const result = this.determinePullResult(pityData, bannerConfig, bannerId);
        console.log('[GachaEngine] Pull result determined:');
        console.log('[GachaEngine]   - item:', result.item?.name, `(${result.item?.rarity}*)`);
        console.log('[GachaEngine]   - wasGuaranteed:', result.wasGuaranteed);
        console.log('[GachaEngine]   - wasSoftPity:', result.wasSoftPity);
        console.log('[GachaEngine]   - was5050:', result.was5050);
        console.log('[GachaEngine]   - won5050:', result.won5050);

        this.updatePityAfterPull(userId, bannerId, result, userName, bannerConfig);

        const pullResult = {
            item: result.item,
            pullNumber: pityData.pullsSince5Star,
            wasGuaranteed: result.wasGuaranteed,
            wasSoftPity: result.wasSoftPity,
            was5050: result.was5050,
            won5050: result.won5050,
            wasCapturingRadiance: result.wasCapturingRadiance
        };

        console.log('[GachaEngine] Returning pull result:', JSON.stringify(pullResult, null, 2));
        return pullResult;
    }

    multiPull(userId: string, count: number = 10, userName: string, bannerId: number = 0): PullResult[] {
        const results: PullResult[] = [];
        for (let i = 0; i < count; i++) {
            results.push(this.pull(userId, userName, bannerId));
        }
        return results;
    }

    private determinePullResult(
        pityData: PityData,
        bannerConfig: GachaBannerConfig,
        bannerId: number
    ): {
        item: Item;
        wasGuaranteed: boolean;
        wasSoftPity: boolean;
        was5050: boolean;
        won5050: boolean | null;
        wasCapturingRadiance: boolean;
    } {
        // Hard pity для 5*
        if (pityData.pullsSince5Star >= bannerConfig.hardPity5Star) {
            return this.get5StarItem(pityData, bannerConfig, bannerId, true);
        }

        // Hard pity для 4*
        if (pityData.pullsSince4Star >= bannerConfig.hardPity4Star) {
            return this.get4StarItem(pityData, bannerConfig, bannerId, true);
        }

        const current5StarRate = this.calculate5StarRate(pityData.pullsSince5Star, bannerConfig);
        const current4StarRate = bannerConfig.baseRate4Star;
        const roll = Math.random();

        if (roll < current5StarRate) {
            const wasSoftPity = pityData.pullsSince5Star >= bannerConfig.softPityStart;
            return this.get5StarItem(pityData, bannerConfig, bannerId, false, wasSoftPity);
        } else if (roll < current5StarRate + current4StarRate) {
            return this.get4StarItem(pityData, bannerConfig, bannerId, false);
        } else {
            return this.get3StarItem(bannerId);
        }
    }

    private calculate5StarRate(pullsSince5Star: number, bannerConfig: GachaBannerConfig): number {
        if (pullsSince5Star < bannerConfig.softPityStart) {
            return bannerConfig.baseRate5Star;
        }

        // Soft pity: экспоненциальный рост шансов
        const softPitySteps = pullsSince5Star - bannerConfig.softPityStart;
        const additionalRate = 0.06 * softPitySteps + (0.06 * softPitySteps * softPitySteps * 0.1);
        return Math.min(bannerConfig.baseRate5Star + additionalRate, 1.0);
    }

    private get5StarItem(
        pityData: PityData,
        bannerConfig: GachaBannerConfig,
        bannerId: number,
        wasGuaranteed: boolean,
        wasSoftPity: boolean = false
    ): {
        item: Item;
        wasGuaranteed: boolean;
        wasSoftPity: boolean;
        was5050: boolean;
        won5050: boolean | null;
        wasCapturingRadiance: boolean;
    } {
        let selectedItem: Item;
        let was5050 = false;
        let won5050: boolean | null = null;
        let wasCapturingRadiance = false;

        // Получаем стандартные 5* для этого баннера
        const standard5Stars = this.itemDb.getItemsByRarityAndBanner(Rarity.FIVE_STAR, bannerId, false);

        // Если нет featured персонажа, работаем как стандартный баннер
        if (!bannerConfig.featured5StarId) {
            if (standard5Stars.length === 0) {
                throw new Error(`No 5* items found for banner ${bannerId}`);
            }
            selectedItem = standard5Stars[Math.floor(Math.random() * standard5Stars.length)];
            return { item: selectedItem, wasGuaranteed, wasSoftPity, was5050, won5050, wasCapturingRadiance };
        }

        const featured5Star = this.itemDb.getItem(bannerConfig.featured5StarId);
        if (!featured5Star) {
            throw new Error(`Featured 5* character ${bannerConfig.featured5StarId} not found`);
        }

        if (pityData.isGuaranteed5Star) {
            // Гарантированный featured после проигрыша 50/50
            selectedItem = featured5Star;
            was5050 = false;
            won5050 = null;
        } else {
            // Бросаем 50/50
            was5050 = true;
            const roll = Math.random();

            if (roll < 0.5) {
                // Выиграли 50/50
                won5050 = true;
                selectedItem = featured5Star;
            } else {
                // Проиграли 50/50
                won5050 = false;

                // Проверяем Capturing Radiance (5% шанс все равно получить featured)
                if (bannerConfig.hasCapturingRadiance && Math.random() < 0.05) {
                    wasCapturingRadiance = true;
                    selectedItem = featured5Star;
                    won5050 = true;
                } else {
                    // Получаем случайного стандартного персонажа
                    if (standard5Stars.length === 0) {
                        // Если нет стандартных 5* для баннера, используем featured
                        selectedItem = featured5Star;
                    } else {
                        selectedItem = standard5Stars[Math.floor(Math.random() * standard5Stars.length)];
                    }
                }
            }
        }

        return { item: selectedItem, wasGuaranteed, wasSoftPity, was5050, won5050, wasCapturingRadiance };
    }

    private get4StarItem(
        pityData: PityData,
        bannerConfig: GachaBannerConfig,
        bannerId: number,
        wasGuaranteed: boolean
    ): {
        item: Item;
        wasGuaranteed: boolean;
        wasSoftPity: boolean;
        was5050: boolean;
        won5050: boolean | null;
        wasCapturingRadiance: boolean;
    } {
        let selectedItem: Item;

        // Получаем стандартные 4* для этого баннера
        const standard4Stars = this.itemDb.getItemsByRarityAndBanner(Rarity.FOUR_STAR, bannerId, false);

        // Получаем featured 4* персонажей
        const featured4Stars: Item[] = [];
        for (const id of bannerConfig.featured4StarIds) {
            const item = this.itemDb.getItem(id);
            if (item && item.rarity === Rarity.FOUR_STAR) {
                featured4Stars.push(item);
            }
        }

        // Если есть rate-up 4* и счетчик проигрышей >= 2, гарантируем rate-up
        if (featured4Stars.length > 0 && pityData.pity4StarFailedRateUp >= 2) {
            selectedItem = featured4Stars[Math.floor(Math.random() * featured4Stars.length)];
        } else if (featured4Stars.length > 0 && Math.random() < bannerConfig.featuredRate4Star) {
            // Шанс получить rate-up 4*
            selectedItem = featured4Stars[Math.floor(Math.random() * featured4Stars.length)];
        } else {
            // Получаем стандартного 4*
            if (standard4Stars.length === 0) {
                // Если нет стандартных, используем featured
                if (featured4Stars.length > 0) {
                    selectedItem = featured4Stars[Math.floor(Math.random() * featured4Stars.length)];
                } else {
                    throw new Error(`No 4* items found for banner ${bannerId}`);
                }
            } else {
                selectedItem = standard4Stars[Math.floor(Math.random() * standard4Stars.length)];
            }
        }

        return {
            item: selectedItem,
            wasGuaranteed,
            wasSoftPity: false,
            was5050: false,
            won5050: null,
            wasCapturingRadiance: false
        };
    }

    private get3StarItem(bannerId: number): {
        item: Item;
        wasGuaranteed: boolean;
        wasSoftPity: boolean;
        was5050: boolean;
        won5050: boolean | null;
        wasCapturingRadiance: boolean;
    } {
        const threeStars = this.itemDb.getItemsByRarityAndBanner(Rarity.THREE_STAR, bannerId);

        if (threeStars.length === 0) {
            throw new Error(`No 3* items found for banner ${bannerId}`);
        }

        const selectedItem = threeStars[Math.floor(Math.random() * threeStars.length)];

        return {
            item: selectedItem,
            wasGuaranteed: false,
            wasSoftPity: false,
            was5050: false,
            won5050: null,
            wasCapturingRadiance: false
        };
    }

    private updatePityAfterPull(
        userId: string,
        bannerId: number,
        result: ReturnType<typeof this.get5StarItem>,
        userName: string,
        bannerConfig: GachaBannerConfig
    ): void {
        const update: Partial<PityData> = {};

        if (result.item.rarity === Rarity.FIVE_STAR) {
            update.pullsSince5Star = 0;
            update.pullsSince4Star = 0;
            update.pity4StarFailedRateUp = 0;

            // Устанавливаем гарант если проиграли 50/50 (и не было Capturing Radiance)
            update.isGuaranteed5Star = result.was5050 && result.won5050 === false && !result.wasCapturingRadiance;
        } else if (result.item.rarity === Rarity.FOUR_STAR) {
            update.pullsSince4Star = 0;

            // Обновляем счетчик проигрышей rate-up для 4*
            const featured4StarIds = bannerConfig.featured4StarIds;
            const isFeatured = featured4StarIds.includes(result.item.id);
            const currentPity = this.userManager.getUserPityStatus(userId, userName, bannerId);

            if (isFeatured) {
                update.pity4StarFailedRateUp = 0;
            } else {
                update.pity4StarFailedRateUp = currentPity.pity4StarFailedRateUp + 1;
            }
        }

        this.userManager.updateUserPity(userId, bannerId, update, userName);
    }

    // === Загрузка и сохранение ===

    loadFromStore(config: GachaStoreSchema): void {
        console.log('[GachaEngine] loadFromStore called');
        console.log('[GachaEngine]   - banners:', config.banners?.length || 0);
        console.log('[GachaEngine]   - items:', config.items?.length || 0);

        this.bannerConfigs.clear();
        if (config.banners) {
            config.banners.forEach(banner => {
                this.bannerConfigs.set(banner.id, banner);
            });
        }

        this.itemDb.loadFromStore(config.items || []);
    }

    setCurrentUserId(userId: string | null) {
        console.log('[GachaEngine] setCurrentUserId called with:', userId);
        this.userManager.setCurrentUserId(userId);
    }
}

export default GachaSystem;
