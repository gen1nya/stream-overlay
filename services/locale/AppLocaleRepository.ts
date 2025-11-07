export interface AppLocaleOption {
    code: string;
    name: string;
}

export class AppLocaleRepository {
    private readonly locales: AppLocaleOption[];

    private currentLocale: string;

    constructor(locales: AppLocaleOption[], defaultLocale: string) {
        this.locales = locales;
        const fallback = locales[0]?.code || defaultLocale;
        const initialLocale = locales.find((locale) => locale.code === defaultLocale);
        this.currentLocale = initialLocale ? initialLocale.code : fallback;
    }

    public getAvailableLocales(): AppLocaleOption[] {
        return this.locales;
    }

    public getCurrentLocale(): string {
        return this.currentLocale;
    }

    public setCurrentLocale(localeCode: string): string {
        const localeExists = this.locales.some((locale) => locale.code === localeCode);
        if (!localeExists) {
            throw new Error(`Unsupported locale: ${localeCode}`);
        }
        this.currentLocale = localeCode;
        return this.currentLocale;
    }
}
