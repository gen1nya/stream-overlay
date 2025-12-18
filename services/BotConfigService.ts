import {ipcMain} from "electron";
import ElectronStore from "electron-store";
import {BotConfig, StoreSchema} from "./store/StoreSchema";

export class BotConfigService {
    private appStorage: ElectronStore<StoreSchema>;

    private bot: BotConfig = {
        roulette: {
            enabled: false,
            allowToBanEditors: false,
            commands: [
                "!roulette", "!рулетка"
            ],
            survivalMessages: [
                `@{user} still alive! 🎲`,
                '@${user} Не пробил!',
                '@${user} Need one more pull; Just one more!',
            ],
            deathMessages: [
                '@${user} Победил и хранится в темном прохладном месте. 🔇',
                '@${user} *А разве Макаровым играют в рулетку?* 🔇'
            ],
            cooldownMessage: [
                '@${user}, Привет... Чем могу помочь?',
                '@${user}, Привет... Чем могу [PEKO]?',
                '@${user}, от факапа до факапа 30 секунд. ⏳',
                'WAAAAAAAAGH!!!!11!',
            ],
            protectedUsersMessages: [
                "@${user}, Редактор не участвует в фестивале"
            ],
            muteDuration: 120000,
            commandCooldown: 30000,
            chance: 0.18,
            statsCommands: [
                "!roulette-stats", "!рулетка-стат"
            ],
            statsMessages: [
                "@${user} | Игр: ${plays} | Выжил: ${survivals} | Смертей: ${deaths} | Выживаемость: ${rate}% | Текущая серия: ${streak}"
            ],
            leaderboardCommands: [
                "!roulette-top", "!рулетка-топ"
            ],
            leaderboardMessages: [
                "🏆 Топ рулетки: ${top}"
            ],
            leaderboardSize: 5,
        },
        custom: { enabled: false },
        gacha: {
            enabled: false,
            banner: {
                id: 0,
                name: 'Новый баннер',
                featured5StarId: null,
                featured4StarIds: [],
                hardPity5Star: 90,
                hardPity4Star: 10,
                softPityStart: 74,
                baseRate5Star: 0.006,
                baseRate4Star: 0.051,
                featuredRate4Star: 0.5,
                hasCapturingRadiance: true
            },
            items: [],
            triggers: [],
        },
        pingpong: {
            enabled: false,
            commands: [
                {
                    enabled: true,
                    name: "ping",
                    triggers: [
                        { type: "text", value: "!ping" },
                        { type: "text", value: "!пинг" }
                    ],
                    responses: ["pong"],
                    triggerType: "exact"
                },
                {
                    enabled: true,
                    name: "Привет...",
                    triggers: [
                        {
                            type: "regex",
                            value: "^((здравствуй|здравствуйте|здорово|здарова|даров|дарова)[\\p{P}\\s]*|^здр[\\p{P}\\s]*)",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^(прив(ет|етик|етикос|етищ|етос)?)[\\p{P}\\s]*$",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^хай(ка|ушки|чик)?[\\p{P}\\s]*",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^добрый\\s+(день|вечер|утро)",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^доброго\\s+(времени|дня|вечера|утра)",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^hello\\b",
                            flags: "i"
                        },
                        {
                            type: "regex",
                            value: "^hi\\b",
                            flags: "i"
                        },
                        {
                            type: "regex",
                            value: "^hey\\b",
                            flags: "i"
                        }
                    ],
                    responses: ["Привет... чем могу помочь?"],
                    triggerType: "start"
                },
                {
                    enabled: false,
                    name: "Пиво",
                    triggers: [
                        {
                            type: "regex",
                            value: "^пиво[\\p{P}\\s]*$",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^пивко[\\p{P}\\s]*$",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^пивка[\\p{P}\\s]*$",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^пивчанский[\\p{P}\\s]*$",
                            flags: "iu"
                        }
                    ],
                    responses: ["🍺", "🍺🍺", "🍻"],
                    triggerType: "contains"
                }
            ]
        },
        lottery: {
            enabled: false,
            command: '!розыгрыш',
            cancelCommand: '!отмена',
            statsCommand: '!статистика',
            commandCooldownSec: 60,
            allowChatEntry: true,
            entryTrigger: '+',
            channelPointRewardIds: [],
            timerDurationSec: 60,
            requireSubjectInChat: true,
            enforceUniqueSubject: false,
            subjectBlacklist: [
                'streamelements',
                'nightbot',
                'fossabot',
                'streamlabs',
                'wizebot',
                'moobot',
                'coebot',
                'phantombot',
                'stayhydratedbot',
                'botisimo'
            ],
            messages: {
                start: 'Розыгрыш {{subject}} начат! Пиши {{trigger}} чтобы участвовать! Осталось {{timer}} сек.',
                warmup: [],
                winner: 'Победитель: {{winner}}! Поздравляем с {{subject}}!',
                noParticipants: 'Никто не захотел участвовать в розыгрыше {{subject}}',
                alreadyUsed: '{{subject}} уже разыгрывался ранее!',
                alreadyRunning: 'Розыгрыш уже идёт! Пиши {{trigger}} чтобы участвовать.',
                cooldown: 'Подожди ещё {{cooldown}} сек перед следующим розыгрышем.',
                cancelled: 'Розыгрыш {{subject}} отменён.',
                userNotInChat: '{{subject}} не найден в чате!',
                subjectRequired: 'Укажите предмет розыгрыша! Пример: {{command}} приз',
                subjectBlacklisted: '{{subject}} в чёрном списке и не может быть предметом розыгрыша',
                statsResponse: '📊 Топ игроков: {{topPlayers}} | Топ призов: {{topSubjects}} | @{{user}}: {{userWins}} побед, выиграл: {{userSubjects}}'
            }
        },
        triggers: {
            enabled: false,
            rules: []
        },
        timers: {
            enabled: false,
            timers: []
        }
    }

    constructor(
        store: ElectronStore<StoreSchema>,
        onConfigurationChanged: (newConfig: BotConfig) => void
    ) {
        this.appStorage = store;

        const name =  this.appStorage.get('currentBot') || 'default';
        let configs = this.appStorage.get('bots') || {};
        console.log('Loaded bot configurations:', configs);
        if (Object.keys(configs).length === 0) {
            configs['default'] = this.bot;
            this.appStorage.set('bots', configs);
        }

        const currentBot = configs[name] || configs['default'];
        if (currentBot) {
            onConfigurationChanged(currentBot);
        }

        ipcMain.handle('bot:get-all', async () => {
            return store.get('bots') || {};
        });
        ipcMain.handle('bot:get-by-name', async (_e, botName: string) => {
            const config = store.get('bots')
            return config[botName];
        });
        ipcMain.handle('bot:set', async (_e, botName: string, botConfig: BotConfig) => {
            const config = this.appStorage.get('bots') || {};
            config[botName] = botConfig;
            this.appStorage.set('bots', config);
            onConfigurationChanged(config[botName]);
            return true;
        });
        ipcMain.handle('bot:create', async (_e, botName: string) => {
            const configs = this.appStorage.get('bots') || {};
            if (configs[botName]) {
                throw new Error(`Bot with name ${botName} already exists`);
            }
            if (!configs['default']) {
                configs[botName] =  this.bot;
            } else {
                configs[botName] = configs['default'];
            }
            this.appStorage.set('bots', configs);
            return true;
        });
        ipcMain.handle('bot:delete', async (_e, botName: string) => {
            if (botName === 'default') {
                throw new Error("Cannot delete the default bot");
            }
            const config = this.appStorage.get('bots') || {};
            if (config[botName]) {
                delete config[botName];
                this.appStorage.set('bots', config);
                return true;
            }
            return false;
        });
        ipcMain.handle('bot:select', async (_e, botName: string) => {
            const config = this.appStorage.get('bots') || {};
            if (config[botName]) {
                this.appStorage.set('currentBot', botName);
                onConfigurationChanged(config[botName]);
                return true;
            }
            return false;
        });
        ipcMain.handle('bot:get-current', async () => {
            const name =  this.appStorage.get('currentBot') || 'default';
            const config = this.appStorage.get('bots') || {};
            return { name: name, config: config[name] || null };
        });
    }

}