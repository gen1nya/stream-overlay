import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru';
import en from './locales/en';
import { getCurrentLocale } from './services/api';

const DEFAULT_LOCALE = 'ru';

let initializationPromise;

async function resolveInitialLocale() {
    try {
        const locale = await getCurrentLocale();
        if (typeof locale === 'string' && locale.trim().length > 0) {
            return locale;
        }
    } catch (error) {
        console.error('Failed to resolve initial locale, falling back to default.', error);
    }
    return DEFAULT_LOCALE;
}

export function initI18n() {
    if (!initializationPromise) {
        initializationPromise = (async () => {
            const initialLocale = await resolveInitialLocale();
            await i18n
                .use(initReactI18next)
                .init({
                    resources: {
                        ru,
                        en,
                    },
                    lng: initialLocale,
                    fallbackLng: DEFAULT_LOCALE,
                    interpolation: {
                        escapeValue: false,
                    },
                    returnObjects: true,
                });
            return i18n;
        })();
    }

    return initializationPromise;
}

export default i18n;
