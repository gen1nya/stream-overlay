const ru = {
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
        loading: {
            title: 'Загрузка...'
        },
        notFound: {
            title: 'Дружок пирожок, ты выбрал не ту дверь',
            hint: 'Кожевенный клуб два блока вниз'
        },
        common: {
            theme: 'Тема',
            bot: 'Бот',
            settings: 'Настройки',
            logout: 'Выйти',
            back: 'Назад',
            preview: 'Превью',
            copyLink: 'Скопировать ссылку',
            open: 'Открыть',
            close: 'Закрыть',
            loading: 'Загрузка...',
        },
        dashboard: {
            windowTitle: 'Оверлеешная - {{name}}',
            headerMessages: [
                { type: 'text', text: 'Ну шо?' },
                { type: 'text', text: '"Боты + в чат"' },
                { type: 'text', text: 'Кто здесь?!' },
                { type: 'text', text: 'Срочно! Поправь монитор!' },
                { type: 'text', text: '[ПЕКО]' },
                { type: 'text', text: 'Привет... чем могу помочь?' },
                { type: 'text', text: 'Молочный UwU\'н' },
                { type: 'text', text: 'Emotional Damage!' },
                { type: 'text', text: 'Опять забыл настроить?' },
                { type: 'text', text: 'ФЫР-ФЫР-ФЫР' },
                { type: 'text', text: '!roulette' },
                { type: 'text', text: 'Вращайте барабан' },
                { type: 'text', text: 'Я Олег, мне 42 года' },
                { type: 'text', text: 'Мы тыкаем палочками' },
                { type: 'text', text: 'Когда ДРГ?' },
                { type: 'text', text: 'Good luck, have fun!' },
                { type: 'text', text: 'Ну, удачной охоты, сталкер!' },
                { type: 'text', text: 'Хорошего стрима ;)' },
                { type: 'text', text: 'Хихи-Хаха' },
                { type: 'text', text: '…ᘛ⁐̤ᕐᐷ…ᘛ⁐̤ᕐᐷ…ᘛ⁐̤ᕐᐷ' },
                { type: 'text', text: 'Ты рыбак?' },
                { type: 'text', text: 'undefined' },
                { type: 'text', text: 'Евготаро Пекорский' },
                { type: 'text', text: 'Гоу ту хорни джейл' },
                { type: 'text', text: 'Кuwuwuн' },
                { type: 'text', text: '[ДАННЫЕ УДАЛЕНЫ]' },
                { type: 'text', text: '[Здесь могла быть ваша паста]' },
                { type: 'text', text: 'Лисонад' },
                { type: 'text', text: 'Silly-cat натрия' },
                { type: 'text', text: 'Пуэра в горшок мне!' },
                { type: 'text', text: '<Удалено модератором>' },
                { type: 'text', text: 'Киси-киси мяу-мяу' },
                { type: 'text', text: 'Пуэра в горшок мне!' },
                { type: 'text', text: 'ЛисDuke Nukem' },
                { type: 'text', text: 'TheIlluminati' },
                { type: 'text', text: 'Ррррыба!' },
                { type: 'text', text: 'Вставай самурай - стрим упал' },
                { type: 'inlineLink', text: 'А ещё загляни на', linkText: 'streamiverse.io', href: 'https://streamiverse.io' },
                { type: 'link', text: 'Ebatel.online', href: 'https://tools.rus.ebatel.online/' },
                { type: 'text', text: 'Здорова солнышки!' },
                { type: 'text', text: 'Ты сейсо или хорни?' },
                { type: 'action', text: 'NEPTUNE INTELLIGENZA', action: 'openTerminal' },
            ],
            betaTesters: [
                'ellis_leaf',
                'kururun_chan',
                'fox1k_ru',
                'sonamint',
                'kigudi',
                'kurosakissora',
                'qvik_l',
                'gena_zogii'
            ],
            cards: {
                account: {
                    title: 'Аккаунт',
                    status: {
                        online: 'Трансляция идёт в прямом эфире',
                        offline: 'Трансляция не ведётся',
                    },
                    followers: 'Фолловеров: {{count}}',
                    loading: 'Загрузка информации...'
                },
                chat: {
                    title: 'Чат-оверлей',
                    open: 'Открыть чат',
                    copyLink: 'Скопировать ссылку',
                    themeLabel: 'Тема',
                    defaultThemeOption: 'По умолчанию'
                },
                widgets: {
                    title: 'Виджеты',
                    playerCard: 'Плеер-карточка',
                    playerVinyl: 'Плеер-пластинка',
                    followersGoal: 'Цель фолловеров/стрим'
                }
            },
            logs: {
                title: 'Логи'
            },
            status: {
                uptime: 'Аптайм: {{duration}}',
                eventSub: 'EventSub: {{duration}}',
                irc: 'IRC: {{duration}}',
                reconnect: 'Переподключиться'
            },
            footer: {
                betaTest: 'Бета-тест:'
            }
        },
        userInfo: {
            title: 'Информация о пользователе',
            loading: 'Загрузка...',
            badges: {
                moderator: 'Модератор',
                vip: 'VIP',
                muted: 'Заглушен',
            },
            meta: {
                id: 'ID',
                created: 'Создан',
                following: 'Фолловер с',
                mutedUntil: 'Заглушен до',
            },
            actions: {
                unban: 'Разбанить',
                mute1m: 'Замутить на 1 минуту',
                mute10m: 'Замутить на 10 минут',
                removeVip: 'Убрать VIP',
                makeVip: 'Сделать VIP',
                removeMod: 'Убрать модератора',
                makeMod: 'Назначить модератором',
            },
            error: 'Не удалось загрузить информацию о пользователе.'
        },
        settings: {
            header: {
                title: 'Настройки',
            },
            colorPicker: {
                title: 'Цвет',
            },
            pages: {
                general: { title: 'Общие настройки', label: 'Общие' },
                chat: { title: 'Настройки сообщений', label: 'Сообщения' },
                follow: { title: 'Настройки подписок', label: 'Follow' },
                channelPoints: { title: 'Настройки баллов канала', label: 'Баллы' },
                bot: { title: 'Настройки бота', label: 'Бот >_' },
                players: { title: 'Настройки плееров', label: 'Плееры' },
                youtube: { title: 'Чат ютуба', label: 'YouTube Чат' },
                followersGoal: { title: 'Прогресс фоловеров', label: 'Прогресс' },
                about: { title: 'О программе', label: 'О программе' },
            },
            general: {
                appearance: {
                    title: 'Внешний вид',
                    subtitle: 'Настройте интерфейс под себя',
                    languageLabel: 'Язык интерфейса',
                    loading: 'Загрузка языков…',
                    saving: 'Применение языка…',
                    error: 'Не удалось обновить язык. Попробуйте ещё раз.',
                },
            },
            follow: {
                title: 'Follow вариант №{{index}}',
                collapse: 'Свернуть',
                expand: 'Развернуть',
                template: {
                    title: 'Шаблон сообщения',
                    hint: 'Доступные плейсхолдеры: {userName}',
                    label: 'Шаблон для новых фолловеров',
                    textColor: 'Цвет текста',
                    shadowColor: 'Цвет тени текста',
                    shadowRadius: 'Радиус тени',
                },
                background: {
                    title: 'Настройки фона',
                    type: 'Тип фона',
                    radius: 'Скругление углов',
                    options: {
                        color: 'Цвет',
                        image: 'Картинка',
                        gradient: 'Градиент',
                    },
                },
                layout: {
                    title: 'Отступы и позиционирование',
                },
                delete: {
                    action: 'Удалить вариант',
                    tooltip: 'Удалить вариант',
                    disabledTooltip: 'Нельзя удалить последний элемент',
                },
            },
            fft: {
                title: 'FFT анализатор',
                collapse: 'Свернуть',
                expand: 'Настроить',
                status: {
                    error: 'Ошибка',
                    active: 'Активен',
                    noDevice: 'Нет устройства',
                    disabled: 'Отключен',
                },
                device: {
                    notSelected: 'Не выбрано',
                    placeholder: 'Выберите устройство',
                    refresh: 'Обновить список устройств',
                    selected: 'Выбрано: {{name}}',
                },
                sections: {
                    general: 'Основные настройки',
                    device: 'Аудиоустройство',
                    parameters: 'Параметры анализатора',
                    demo: 'Демонстрация FFT',
                },
                controls: {
                    enable: 'Включить FFT анализ',
                    enabled: 'Включен',
                    disabled: 'Выключен',
                },
                preview: {
                    description: 'Анализатор аудиочастот в реальном времени для визуальных эффектов.<br/><br/><highlight>Устройство:</highlight> {{device}}',
                },
                sliders: {
                    dbFloor: 'Нижний порог (dB)',
                    masterGain: 'Основное усиление',
                    tilt: 'Наклон частот',
                },
                demo: {
                    columns: 'Демо FFT (столбцы)',
                    ring: 'Демо FFT (кольцо)',
                    waveform: 'Демо волна',
                    hint: 'Откроется в новом окне для тестирования визуализаций.',
                },
                errors: {
                    loadConfig: 'Не удалось загрузить конфигурацию FFT',
                    loadDevices: 'Не удалось загрузить список аудиоустройств',
                    toggle: 'Не удалось переключить FFT',
                    setDevice: 'Не удалось установить аудиоустройство',
                    setGain: 'Не удалось установить усиление FFT',
                    setDbFloor: 'Не удалось установить нижний порог FFT',
                    setTilt: 'Не удалось установить наклон FFT',
                },
            },
            about: {
                appName: 'Оверлеешная',
                version: 'Версия {{version}}',
                build: 'Собрано {{date}}',
                description: {
                    title: 'Описание',
                    paragraph1: {
                        line1: 'Набор виджетов для оверлеев в OBS Studio и других программах (чат, плееры, счётчик фолловеров).',
                        line2: 'А ещё бот с гачей, рулеткой и простыми запрос-ответ.',
                    },
                    paragraph2: {
                        line1: 'Проект полностью открытый и бесплатный, аналитику не собирает, сервер не требует.',
                        line2: 'Буду рад любой помощи — от тестирования и багрепортов до кода и дизайна.',
                    },
                    support: 'Слеплено при поддержке <highlight>NEPTUNE INTELLIGENZA</highlight>',
                    license: {
                        label: 'Лицензия',
                        value: 'GNU GPL v3 License',
                    },
                    platform: {
                        label: 'Платформа',
                        value: 'Windows, Linux (если достаточно смелы)',
                    },
                },
                social: {
                    title: 'Контакты и социальные сети',
                    github: 'GitHub',
                    twitch: 'Twitch',
                    website: 'Веб-сайт',
                },
            },
            botConfigMissing: {
                title: 'Конфигурация бота не найдена',
                line1: 'Для настройки бота необходимо загрузить или создать конфигурацию.',
                line2: 'Чтото сломалось. Стучите в личку',
            },
            unknownPage: 'Неизвестная страница',
        },
        twitchUsers: {
            title: 'Пользователи Twitch',
            search: {
                placeholder: 'Поиск пользователей...',
                clear: 'Очистить поиск (ESC)',
            },
            filtersLabel: 'Фильтры:',
            filters: {
                vips: 'VIP',
                followers: 'Фолловеры',
                moderators: 'Модеры',
                editors: 'Редакторы',
            },
            table: {
                name: 'Имя',
                status: 'Статус',
                lastSeen: 'Последний визит',
                followedSince: 'Фолловер с',
            },
            states: {
                loading: 'Загрузка...',
                emptyTitle: 'Пользователи не найдены',
                emptyDescription: 'Попробуйте изменить критерии поиска или фильтры',
            },
            statusIcons: {
                vipAdd: 'Добавить VIP (клик для изменения)',
                vipRemove: 'Убрать VIP (клик для изменения)',
                follower: 'Фолловер',
                modAdd: 'Добавить модератора (клик для изменения)',
                modRemove: 'Убрать модератора (клик для изменения)',
                editor: 'Редактор',
            },
            pagination: {
                info: 'Показано {{current}} из {{total}} пользователей',
                page: 'Страница {{page}}',
            },
            lastSeen: {
                never: 'Никогда',
                justNow: 'Только что',
                minutes_one: '{{count}} мин. назад',
                minutes_few: '{{count}} мин. назад',
                minutes_many: '{{count}} мин. назад',
                minutes_other: '{{count}} мин. назад',
                hours_one: '{{count}} ч. назад',
                hours_few: '{{count}} ч. назад',
                hours_many: '{{count}} ч. назад',
                hours_other: '{{count}} ч. назад',
                days_one: '{{count}} дн. назад',
                days_few: '{{count}} дн. назад',
                days_many: '{{count}} дн. назад',
                days_other: '{{count}} дн. назад',
            }
        },
    },
};

export default ru;
