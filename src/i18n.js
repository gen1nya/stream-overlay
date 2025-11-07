import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    ru: {
        translation: {
            auth: {
                title: 'Ну что, поехали?',
                idle: {
                    message: 'Для начала работы необходимо авторизоваться',
                    button: 'Авторизоваться через Twitch',
                },
                loading: 'Инициализация...',
                prompt: 'Выполните авторизацию в Twitch',
                methodTitle: 'Способ авторизации',
                methodCode: 'Код и ссылка',
                methodQr: 'QR код',
                openBrowser: 'Откройте в браузере',
                enterCode: 'Введите код',
                qrHint: 'Отсканируйте QR код с мобильного устройства. Камера откроет страницу авторизации с уже введенным кодом.',
                waiting: 'Ожидание авторизации (попытка {{count}})',
                cancel: 'Отменить',
                successTitle: '✅ Успешная авторизация!',
                successSubtitle: 'Переход в панель управления...',
                errorTitle: 'Ошибка авторизации',
                retry: 'Попробовать снова',
                startError: 'Не удалось начать авторизацию',
                language: 'Язык интерфейса',
            },
            footer: {
                settings: 'Настройки',
                player2: 'Плеер №2 (пластинка)',
                player1: 'Плеер №1',
                demoColumns: 'Демо FFT (столбцы)',
                demoRing: 'Демо FFT (кольцо)',
            },
        },
    },
    en: {
        translation: {
            auth: {
                title: "Ready to get started?",
                idle: {
                    message: 'Please sign in to continue',
                    button: 'Sign in with Twitch',
                },
                loading: 'Initializing...',
                prompt: 'Complete the authorization in Twitch',
                methodTitle: 'Authorization method',
                methodCode: 'Code and link',
                methodQr: 'QR code',
                openBrowser: 'Open in browser',
                enterCode: 'Enter the code',
                qrHint: 'Scan the QR code with your mobile device. The camera will open the authorization page with the code prefilled.',
                waiting: 'Waiting for authorization (attempt {{count}})',
                cancel: 'Cancel',
                successTitle: '✅ Authorization successful!',
                successSubtitle: 'Redirecting to the dashboard...',
                errorTitle: 'Authorization error',
                retry: 'Try again',
                startError: 'Failed to start authorization',
                language: 'Interface language',
            },
            footer: {
                settings: 'Settings',
                player2: 'Player #2 (record)',
                player1: 'Player #1',
                demoColumns: 'FFT demo (columns)',
                demoRing: 'FFT demo (ring)',
            },
        },
    },
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'ru',
        fallbackLng: 'ru',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
