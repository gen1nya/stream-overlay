import Store from "electron-store";
import {StoreSchema} from "../store/StoreSchema";

export interface AppLocaleOption {
    code: string;
    name: string;
}

export class AppLocaleRepository {
    private readonly locales: AppLocaleOption[];

    private currentLocale: string;

    constructor(locales: AppLocaleOption[], defaultLocale: string, private readonly store: Store<StoreSchema>) {
        this.locales = locales;
        const fallback = locales[0]?.code || defaultLocale;
        const storedLocale = this.store.get("locale") as string | undefined;
        const initialLocale = this.getValidatedLocale(storedLocale) || this.getValidatedLocale(defaultLocale) || fallback;
        this.currentLocale = initialLocale;
        if (storedLocale !== this.currentLocale) {
            this.store.set("locale", this.currentLocale);
        }
    }

    public getAvailableLocales(): AppLocaleOption[] {
        return this.locales;
    }

    public getCurrentLocale(): string {
        return this.currentLocale;
    }

    public setCurrentLocale(localeCode: string): string {
        const validLocale = this.getValidatedLocale(localeCode);
        if (!validLocale) {
            throw new Error(`Unsupported locale: ${localeCode}`);
        }
        this.currentLocale = validLocale;
        this.store.set("locale", this.currentLocale);
        return this.currentLocale;
    }

    private getValidatedLocale(localeCode?: string): string | undefined {
        if (!localeCode) {
            return undefined;
        }
        const localeExists = this.locales.some((locale) => locale.code === localeCode);
        return localeExists ? localeCode : undefined;
    }
}