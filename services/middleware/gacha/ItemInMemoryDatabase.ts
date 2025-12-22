import {Item, Rarity} from "./types";

export class ItemInMemoryDatabase {
    private items: Map<string, Item> = new Map();

    constructor(initialItems?: Item[]) {
        if (initialItems && initialItems.length > 0) {
            initialItems.forEach(item => this.items.set(item.id, item));
        }
    }

    getItem(id: string): Item | undefined {
        return this.items.get(id);
    }

    getItemsByRarity(rarity: Rarity, isLimited?: boolean): Item[] {
        return Array.from(this.items.values()).filter(item => {
            if (item.rarity !== rarity) return false;
            if (isLimited !== undefined && item.isLimited !== isLimited) return false;
            return true;
        });
    }

    /** Получить все предметы для конкретного баннера */
    getItemsByBanner(bannerId: number): Item[] {
        return Array.from(this.items.values())
            .filter(item => item.bannerId === bannerId);
    }

    /** Получить предметы по редкости и баннеру */
    getItemsByRarityAndBanner(rarity: Rarity, bannerId: number, isLimited?: boolean): Item[] {
        return Array.from(this.items.values()).filter(item => {
            if (item.rarity !== rarity) return false;
            if (item.bannerId !== bannerId) return false;
            if (isLimited !== undefined && item.isLimited !== isLimited) return false;
            return true;
        });
    }

    /** Получить стандартные (не лимитированные) предметы по редкости и баннеру */
    getStandardItemsByBanner(rarity: Rarity, bannerId: number): Item[] {
        return this.getItemsByRarityAndBanner(rarity, bannerId, false);
    }

    loadFromStore(items: Item[]): void {
        this.items.clear();
        items.forEach(item => this.items.set(item.id, item));
    }
}