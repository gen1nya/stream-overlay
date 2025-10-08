import {UserManager} from "./UserManager";
import {ItemInMemoryDatabase} from "./ItemInMemoryDatabase";
import {GachaBannerConfig, GachaStoreSchema, Item, PityData, PullResult, Rarity} from "./types";

export class GachaSystem {
    private itemDb: ItemInMemoryDatabase;
    private userManager: UserManager;
    private bannerConfig: GachaBannerConfig;

    constructor(initialConfig?: GachaStoreSchema) {
        this.itemDb = new ItemInMemoryDatabase(initialConfig?.items);
        this.userManager = new UserManager();

        if (initialConfig?.banner) {
            this.bannerConfig = initialConfig.banner;
        } else {
            this.bannerConfig = this.createDefaultBannerConfig();
        }
    }

    private createDefaultBannerConfig(): GachaBannerConfig {
        return {
            id: 0,
            name: 'История Деда',
            featured5StarId: 'ded',
            featured4StarIds: ['chunibyo', 'lucker', 'wolf_boy'],
            hardPity5Star: 90,
            hardPity4Star: 10,
            softPityStart: 74,
            baseRate5Star: 0.006,
            baseRate4Star: 0.051,
            featuredRate4Star: 0.5,
            hasCapturingRadiance: true
        };
    }

    setBannerConfig(config: GachaBannerConfig): void {
        this.bannerConfig = config;
    }

    getItemDatabase(): ItemInMemoryDatabase {
        return this.itemDb;
    }

    pull(userId: string, userName: string): PullResult {
        const pityData = this.userManager.getUserPityStatus(userId, userName);

        pityData.pullsSince5Star++;
        pityData.pullsSince4Star++;

        this.userManager.updateUserPity(
            userId,
            {
                pullsSince5Star: pityData.pullsSince5Star,
                pullsSince4Star: pityData.pullsSince4Star
            },
            userName
        );

        const result = this.determinePullResult(pityData);
        this.updatePityAfterPull(userId, result, userName);

        return {
            item: result.item,
            pullNumber: pityData.pullsSince5Star,
            wasGuaranteed: result.wasGuaranteed,
            wasSoftPity: result.wasSoftPity,
            was5050: result.was5050,
            won5050: result.won5050,
            wasCapturingRadiance: result.wasCapturingRadiance
        };
    }

    multiPull(userId: string, count: number = 10, userName: string): PullResult[] {
        const results: PullResult[] = [];
        for (let i = 0; i < count; i++) {
            results.push(this.pull(userId, userName));
        }
        return results;
    }

    private determinePullResult(pityData: PityData): {
        item: Item;
        wasGuaranteed: boolean;
        wasSoftPity: boolean;
        was5050: boolean;
        won5050: boolean | null;
        wasCapturingRadiance: boolean;
    } {
        // Hard pity для 5*
        if (pityData.pullsSince5Star >= this.bannerConfig.hardPity5Star) {
            return this.get5StarItem(pityData, true);
        }

        // Hard pity для 4*
        if (pityData.pullsSince4Star >= this.bannerConfig.hardPity4Star) {
            return this.get4StarItem(pityData, true);
        }

        const current5StarRate = this.calculate5StarRate(pityData.pullsSince5Star);
        const current4StarRate = this.bannerConfig.baseRate4Star;
        const roll = Math.random();

        if (roll < current5StarRate) {
            const wasSoftPity = pityData.pullsSince5Star >= this.bannerConfig.softPityStart;
            return this.get5StarItem(pityData, false, wasSoftPity);
        } else if (roll < current5StarRate + current4StarRate) {
            return this.get4StarItem(pityData, false);
        } else {
            return this.get3StarItem();
        }
    }

    private calculate5StarRate(pullsSince5Star: number): number {
        if (pullsSince5Star < this.bannerConfig.softPityStart) {
            return this.bannerConfig.baseRate5Star;
        }

        // Soft pity: экспоненциальный рост шансов
        const softPitySteps = pullsSince5Star - this.bannerConfig.softPityStart;
        const additionalRate = 0.06 * softPitySteps + (0.06 * softPitySteps * softPitySteps * 0.1);
        return Math.min(this.bannerConfig.baseRate5Star + additionalRate, 1.0);
    }

    private get5StarItem(
        pityData: PityData,
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

        const standard5Stars = this.itemDb.getItemsByRarity(Rarity.FIVE_STAR, false);

        // Если нет featured персонажа, работаем как стандартный баннер
        if (!this.bannerConfig.featured5StarId) {
            selectedItem = standard5Stars[Math.floor(Math.random() * standard5Stars.length)];
            return { item: selectedItem, wasGuaranteed, wasSoftPity, was5050, won5050, wasCapturingRadiance };
        }

        const featured5Star = this.itemDb.getItem(this.bannerConfig.featured5StarId);
        if (!featured5Star) {
            throw new Error(`Featured 5* character ${this.bannerConfig.featured5StarId} not found`);
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
                if (this.bannerConfig.hasCapturingRadiance && Math.random() < 0.05) {
                    wasCapturingRadiance = true;
                    selectedItem = featured5Star;
                    won5050 = true;
                } else {
                    // Получаем случайного стандартного персонажа
                    selectedItem = standard5Stars[Math.floor(Math.random() * standard5Stars.length)];
                }
            }
        }

        return { item: selectedItem, wasGuaranteed, wasSoftPity, was5050, won5050, wasCapturingRadiance };
    }

    private get4StarItem(
        pityData: PityData,
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
        const standard4Stars = this.itemDb.getItemsByRarity(Rarity.FOUR_STAR, false);

        // Получаем featured 4* персонажей
        const featured4Stars: Item[] = [];
        for (const id of this.bannerConfig.featured4StarIds) {
            const item = this.itemDb.getItem(id);
            if (item && item.rarity === Rarity.FOUR_STAR) {
                featured4Stars.push(item);
            }
        }

        // Если есть rate-up 4* и счетчик проигрышей >= 2, гарантируем rate-up
        if (featured4Stars.length > 0 && pityData.pity4StarFailedRateUp >= 2) {
            selectedItem = featured4Stars[Math.floor(Math.random() * featured4Stars.length)];
        } else if (featured4Stars.length > 0 && Math.random() < this.bannerConfig.featuredRate4Star) {
            // Шанс получить rate-up 4*
            selectedItem = featured4Stars[Math.floor(Math.random() * featured4Stars.length)];
        } else {
            // Получаем стандартного 4*
            selectedItem = standard4Stars[Math.floor(Math.random() * standard4Stars.length)];
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

    private get3StarItem(): {
        item: Item;
        wasGuaranteed: boolean;
        wasSoftPity: boolean;
        was5050: boolean;
        won5050: boolean | null;
        wasCapturingRadiance: boolean;
    } {
        const threeStars = this.itemDb.getItemsByRarity(Rarity.THREE_STAR);
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
        result: ReturnType<typeof this.get5StarItem>,
        userName: string,
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
            const featured4StarIds = this.bannerConfig.featured4StarIds;
            const isFeatured = featured4StarIds.includes(result.item.id);
            const currentPity = this.userManager.getUserPityStatus(userId, userName);

            if (isFeatured) {
                update.pity4StarFailedRateUp = 0;
            } else {
                update.pity4StarFailedRateUp = currentPity.pity4StarFailedRateUp + 1;
            }
        }

        this.userManager.updateUserPity(userId, update, userName);
    }

    setCurrentUserId(userId: string | null) {
        this.userManager.setCurrentUserId(userId);
    }
}

export default GachaSystem;