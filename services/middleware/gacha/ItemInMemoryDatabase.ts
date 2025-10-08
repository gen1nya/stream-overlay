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

    loadFromStore(items: Item[]): void {
        this.items.clear();
        items.forEach(item => this.items.set(item.id, item));
    }

}