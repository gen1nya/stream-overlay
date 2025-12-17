import Middleware from '../Middleware';
import { ActionTypes, ActionType } from '../ActionTypes';
import { AppEvent, ChatEvent, RedeemEvent } from '../../twitch/messageParser';
import { BotConfig, StoreSchema } from '../../store/StoreSchema';
import { LogService } from '../../logService';
import { DbRepository } from '../../db/DbRepository';
import ElectronStore from 'electron-store';
import { ipcMain } from 'electron';
import {
    LotteryBotConfig,
    ActiveLottery,
    LotteryEntry,
    WarmupTriggerState,
    LotteryTemplateVars,
    DEFAULT_LOTTERY_CONFIG
} from './types';
import { ChattersService } from '../../twitch/ChattersService';

/**
 * Middleware для системы розыгрышей (лотереи)
 *
 * Флоу:
 * 1. Пользователь запускает розыгрыш командой !розыгрыш @subject
 * 2. Таймер запускается, участники могут войти через чат (+) или баллы канала
 * 3. Во время таймера срабатывают warmup сообщения (по времени/количеству)
 * 4. По завершению выбирается случайный победитель
 */
export class LotteryMiddleware extends Middleware {
    private store: ElectronStore<StoreSchema>;
    private logService: LogService;
    private config: LotteryBotConfig = DEFAULT_LOTTERY_CONFIG;
    private userId: string | null = null;
    private applyAction: ((action: { type: ActionType; payload: any }) => Promise<void>) | null = null;
    private chattersService: ChattersService;

    // Runtime state
    private activeLottery: ActiveLottery | null = null;
    private lastDrawEndTime: number = 0;
    private timers: NodeJS.Timeout[] = [];

    constructor(store: ElectronStore<StoreSchema>, logService: LogService) {
        super();
        this.store = store;
        this.logService = logService;
        this.chattersService = ChattersService.getInstance();
        this.loadConfig();
        this.registerIpcHandlers();
    }

    /**
     * Регистрирует IPC хэндлеры для работы с данными лотереи из UI
     */
    private registerIpcHandlers(): void {
        // Получить список доступных месяцев
        ipcMain.handle('lottery:get-months', () => {
            if (!this.userId) return [];
            const db = DbRepository.getInstance(this.userId);
            return db.lottery.getAvailableMonths();
        });

        // Получить розыгрыши за месяц
        ipcMain.handle('lottery:get-draws-by-month', (_e, { year, month }) => {
            if (!this.userId) return [];
            const db = DbRepository.getInstance(this.userId);
            return db.lottery.getDrawsByMonth(year, month);
        });

        // Получить статистику по месяцам
        ipcMain.handle('lottery:get-monthly-stats', () => {
            if (!this.userId) return [];
            const db = DbRepository.getInstance(this.userId);
            return db.lottery.getMonthlyStats();
        });

        // Получить историю (с пагинацией)
        ipcMain.handle('lottery:get-history', (_e, { limit, offset }) => {
            if (!this.userId) return { draws: [], total: 0 };
            const db = DbRepository.getInstance(this.userId);
            const draws = db.lottery.getDrawHistory(limit, offset);
            const total = db.lottery.countDraws();
            return { draws, total };
        });

        // Экспорт всех данных
        ipcMain.handle('lottery:export', () => {
            if (!this.userId) return [];
            const db = DbRepository.getInstance(this.userId);
            return db.lottery.exportAllDraws();
        });

        // Очистить все данные
        ipcMain.handle('lottery:clear-all', () => {
            if (!this.userId) return { draws: 0, usedSubjects: 0, stats: 0 };
            const db = DbRepository.getInstance(this.userId);
            return db.lottery.clearAllData();
        });

        // Очистить данные за месяц
        ipcMain.handle('lottery:clear-month', (_e, { year, month }) => {
            if (!this.userId) return 0;
            const db = DbRepository.getInstance(this.userId);
            return db.lottery.clearMonth(year, month);
        });
    }

    /**
     * Устанавливает callback для немедленной отправки actions (из таймеров)
     */
    setApplyAction(applyAction: (action: { type: ActionType; payload: any }) => Promise<void>): void {
        this.applyAction = applyAction;
    }

    private loadConfig(): void {
        const botName = this.store.get('currentBot') || 'default';
        const bots = this.store.get('bots') || {};
        const bot = bots[botName];
        if (bot?.lottery) {
            // Merge with defaults to ensure new fields are available
            this.config = {
                ...DEFAULT_LOTTERY_CONFIG,
                ...bot.lottery,
                messages: {
                    ...DEFAULT_LOTTERY_CONFIG.messages,
                    ...bot.lottery.messages
                }
            };
        }
    }

    updateConfig(botConfig: BotConfig): void {
        if (botConfig?.lottery) {
            // Merge with defaults to ensure new fields are available
            this.config = {
                ...DEFAULT_LOTTERY_CONFIG,
                ...botConfig.lottery,
                messages: {
                    ...DEFAULT_LOTTERY_CONFIG.messages,
                    ...botConfig.lottery.messages
                }
            };
            this.log('LotteryMiddleware config updated');
        }
    }

    onUserIdUpdated(userId: string | null): void {
        this.userId = userId;
    }

    async processMessage(message: AppEvent): Promise<{ message: AppEvent; actions: any[]; accepted: boolean }> {
        if (!this.config.enabled) {
            return { message, actions: [], accepted: false };
        }

        // Проверяем тип сообщения
        if (message.type === 'chat') {
            return this.handleChatMessage(message as ChatEvent);
        }

        if (message.type === 'redemption') {
            return this.handleRedemption(message as RedeemEvent);
        }

        return { message, actions: [], accepted: false };
    }

    private async handleChatMessage(message: ChatEvent): Promise<{ message: ChatEvent; actions: any[]; accepted: boolean }> {
        const text = message.htmlMessage?.trim() || '';

        // 1. Проверяем команду запуска
        if (this.isStartCommand(text)) {
            return this.handleStartCommand(message, text);
        }

        // 2. Проверяем команду отмены
        if (this.isCancelCommand(text)) {
            return this.handleCancelCommand(message);
        }

        // 3. Проверяем команду статистики
        if (this.isStatsCommand(text)) {
            return this.handleStatsCommand(message);
        }

        // 4. Проверяем триггер входа
        if (this.isEntryTrigger(text)) {
            return this.handleEntryTrigger(message);
        }

        return { message, actions: [], accepted: false };
    }

    private async handleRedemption(message: RedeemEvent): Promise<{ message: RedeemEvent; actions: any[]; accepted: boolean }> {
        // Проверяем, есть ли активная лотерея
        if (!this.activeLottery) {
            return { message, actions: [], accepted: false };
        }

        // Проверяем reward ID
        const rewardId = message.reward?.id;
        if (!rewardId || !this.config.channelPointRewardIds.includes(rewardId)) {
            return { message, actions: [], accepted: false };
        }

        // Добавляем участника
        const actions = this.addEntry(
            message.userId || '',
            message.userName || message.userLogin || 'Unknown',
            'points'
        );

        return { message, actions, accepted: actions.length > 0 };
    }

    // ==================== Команды ====================

    private isStartCommand(text: string): boolean {
        const command = this.config.command.toLowerCase();
        return text.toLowerCase().startsWith(command);
    }

    private isCancelCommand(text: string): boolean {
        const command = this.config.cancelCommand.toLowerCase();
        return text.toLowerCase() === command;
    }

    private isEntryTrigger(text: string): boolean {
        // Проверяем, что вход через чат разрешён
        if (!this.config.allowChatEntry) return false;
        return text === this.config.entryTrigger;
    }

    private isStatsCommand(text: string): boolean {
        const command = this.config.statsCommand?.toLowerCase();
        if (!command) return false;
        return text.toLowerCase() === command;
    }

    private handleStartCommand(message: ChatEvent, text: string): { message: ChatEvent; actions: any[]; accepted: boolean } {
        const userId = message.userId;
        const userName = message.userName || 'Unknown';

        if (!userId) {
            return { message, actions: [], accepted: false };
        }

        // Проверяем, что это наш канал
        if (this.userId && message.sourceRoomId && message.sourceRoomId !== this.userId) {
            return { message, actions: [], accepted: false };
        }

        // Извлекаем subject из команды
        let subject = this.extractSubject(text);

        // Если subject не указан
        if (!subject) {
            if (this.config.requireSubjectInChat) {
                // Режим "только чатерсы" - выбираем случайного пользователя из чата
                const blacklist = this.config.subjectBlacklist || [];
                const randomChatter = this.chattersService.getRandomChatter(userId, blacklist); // исключаем инициатора и blacklist
                if (!randomChatter) {
                    this.log('No chatters available for random selection', userId, userName);
                    return { message, actions: [], accepted: false };
                }
                subject = randomChatter;
                this.log(`Random chatter selected: ${subject}`, userId, userName);
            } else {
                // Режим "что угодно" - просим указать предмет
                const template = this.config.messages.subjectRequired || 'Укажите предмет розыгрыша! Пример: {{command}} приз';
                const responseMsg = this.applyTemplate(template, {
                    command: this.config.command
                });
                return {
                    message,
                    actions: [{ type: ActionTypes.SEND_MESSAGE, payload: { message: responseMsg, forwardToUi: true } }],
                    accepted: true
                };
            }
        }

        // Проверяем, что пользователь присутствует в чате (если включена опция)
        if (this.config.requireSubjectInChat && !this.chattersService.isUserInChat(subject)) {
            const template = this.config.messages.userNotInChat || '{{subject}} не найден в чате!';
            const responseMsg = this.applyTemplate(template, {
                subject: subject
            });
            return {
                message,
                actions: [{ type: ActionTypes.SEND_MESSAGE, payload: { message: responseMsg, forwardToUi: true } }],
                accepted: true
            };
        }

        // Проверяем чёрный список
        if (this.isSubjectBlacklisted(subject)) {
            const template = this.config.messages.subjectBlacklisted || '{{subject}} в чёрном списке!';
            const responseMsg = this.applyTemplate(template, {
                subject: subject
            });
            return {
                message,
                actions: [{ type: ActionTypes.SEND_MESSAGE, payload: { message: responseMsg, forwardToUi: true } }],
                accepted: true
            };
        }

        // Проверяем, есть ли уже активная лотерея
        if (this.activeLottery) {
            const responseMsg = this.applyTemplate(this.config.messages.alreadyRunning, {
                subject: this.activeLottery.subject,
                trigger: this.config.entryTrigger
            });
            return {
                message,
                actions: [{ type: ActionTypes.SEND_MESSAGE, payload: { message: responseMsg, forwardToUi: true } }],
                accepted: true
            };
        }

        // Проверяем глобальный кулдаун
        const now = Date.now();
        const cooldownMs = this.config.commandCooldownSec * 1000;
        if (now - this.lastDrawEndTime < cooldownMs) {
            const remainingSec = Math.ceil((cooldownMs - (now - this.lastDrawEndTime)) / 1000);
            const responseMsg = this.applyTemplate(this.config.messages.cooldown, {
                cooldown: remainingSec
            });
            return {
                message,
                actions: [{ type: ActionTypes.SEND_MESSAGE, payload: { message: responseMsg, forwardToUi: true } }],
                accepted: true
            };
        }

        // Проверяем уникальность subject
        if (this.config.enforceUniqueSubject && this.userId) {
            const db = DbRepository.getInstance(this.userId);
            if (db.lottery.isSubjectUsed(subject)) {
                const responseMsg = this.applyTemplate(this.config.messages.alreadyUsed, {
                    subject: subject
                });
                return {
                    message,
                    actions: [{ type: ActionTypes.SEND_MESSAGE, payload: { message: responseMsg, forwardToUi: true } }],
                    accepted: true
                };
            }
        }

        // Запускаем лотерею
        const actions = this.startLottery(subject, userId, userName);

        return { message, actions, accepted: true };
    }

    private handleCancelCommand(message: ChatEvent): { message: ChatEvent; actions: any[]; accepted: boolean } {
        // Проверяем права (только broadcaster или mod)
        if (!message.roles.isBroadcaster && !message.roles.isModerator) {
            return { message, actions: [], accepted: false };
        }

        // Проверяем, есть ли активная лотерея
        if (!this.activeLottery) {
            return { message, actions: [], accepted: false };
        }

        const actions = this.cancelLottery();
        return { message, actions, accepted: true };
    }

    private handleStatsCommand(message: ChatEvent): { message: ChatEvent; actions: any[]; accepted: boolean } {
        const userId = message.userId;
        const userName = message.userName || 'Unknown';

        if (!userId || !this.userId) {
            return { message, actions: [], accepted: false };
        }

        const db = DbRepository.getInstance(this.userId);

        // Получаем данные для статистики ЗА ТЕКУЩИЙ МЕСЯЦ
        const topWinners = db.lottery.getTopWinnersThisMonth(5);
        const topSubjects = db.lottery.getTopSubjectsThisMonth(5);
        const userWins = db.lottery.getUserWinsThisMonth(userId);
        const userWonSubjects = db.lottery.getUserWonSubjectsThisMonth(userId, 10);

        // Форматируем топ игроков: "user1(3), user2(2), user3(1)"
        const topPlayersStr = topWinners.length > 0
            ? topWinners.map(w => `${w.userName}(${w.wins})`).join(', ')
            : 'нет данных';

        // Форматируем топ предметов: "приз1(3), приз2(2)"
        const topSubjectsStr = topSubjects.length > 0
            ? topSubjects.map(s => `${s.subject}(${s.count})`).join(', ')
            : 'нет данных';

        // Форматируем выигранные предметы пользователя
        const userSubjectsStr = userWonSubjects.length > 0
            ? userWonSubjects.join(', ')
            : 'ничего';

        const template = this.config.messages.statsResponse ||
            '📊 Топ игроков: {{topPlayers}} | Топ призов: {{topSubjects}} | @{{user}}: {{userWins}} побед, выиграл: {{userSubjects}}';

        const responseMsg = this.applyTemplate(template, {
            user: userName,
            topPlayers: topPlayersStr,
            topSubjects: topSubjectsStr,
            userWins: userWins,
            userSubjects: userSubjectsStr
        });

        return {
            message,
            actions: [{ type: ActionTypes.SEND_MESSAGE, payload: { message: responseMsg, forwardToUi: true } }],
            accepted: true
        };
    }

    private handleEntryTrigger(message: ChatEvent): { message: ChatEvent; actions: any[]; accepted: boolean } {
        // Проверяем, есть ли активная лотерея
        if (!this.activeLottery) {
            return { message, actions: [], accepted: false };
        }

        const userId = message.userId;
        const userName = message.userName || 'Unknown';

        if (!userId) {
            return { message, actions: [], accepted: false };
        }

        // Проверяем, что это наш канал
        if (this.userId && message.sourceRoomId && message.sourceRoomId !== this.userId) {
            return { message, actions: [], accepted: false };
        }

        const actions = this.addEntry(userId, userName, 'chat');

        return { message, actions, accepted: false }; // accepted: false чтобы сообщение шло дальше
    }

    // ==================== Логика лотереи ====================

    private extractSubject(text: string): string | null {
        // Формат: !розыгрыш @username или !розыгрыш username
        const parts = text.split(/\s+/);
        if (parts.length < 2) return null;

        let subject = parts.slice(1).join(' ').trim();
        // Убираем @ если есть
        if (subject.startsWith('@')) {
            subject = subject.substring(1);
        }
        return subject || null;
    }

    private startLottery(subject: string, initiatorId: string, initiatorName: string): any[] {
        const now = Date.now();
        const endsAt = now + (this.config.timerDurationSec * 1000);

        // Создаём запись в БД
        let drawId = 0;
        if (this.userId) {
            const db = DbRepository.getInstance(this.userId);
            drawId = db.lottery.createDraw(subject, initiatorId, initiatorName);
            db.lottery.updateStats(initiatorId, initiatorName, 'initiated');
        }

        // Создаём warmup triggers с состоянием
        const warmupTriggers: WarmupTriggerState[] = this.config.messages.warmup.map(t => ({
            ...t,
            fired: false
        }));

        // Инициализируем активную лотерею
        this.activeLottery = {
            id: drawId,
            subject,
            initiatorId,
            initiatorName,
            startedAt: now,
            endsAt,
            entries: new Map(),
            warmupTriggers
        };

        // Запускаем таймер завершения
        const endTimer = setTimeout(() => {
            this.endLottery();
        }, this.config.timerDurationSec * 1000);
        this.timers.push(endTimer);

        // Запускаем таймеры warmup (по времени)
        for (const trigger of warmupTriggers) {
            if (trigger.type === 'time') {
                const warmupTimer = setTimeout(() => {
                    this.fireWarmupTrigger(trigger);
                }, trigger.value * 1000);
                this.timers.push(warmupTimer);
            }
        }

        this.log(`Lottery started for "${subject}" by ${initiatorName}`, initiatorId, initiatorName);

        // Отправляем стартовое сообщение
        const startMsg = this.applyTemplate(this.config.messages.start, {
            subject: subject,
            initiator: initiatorName,
            timer: this.config.timerDurationSec,
            trigger: this.config.entryTrigger
        });

        return [{ type: ActionTypes.SEND_MESSAGE, payload: { message: startMsg, forwardToUi: true } }];
    }

    private addEntry(userId: string, userName: string, method: 'chat' | 'points'): any[] {
        if (!this.activeLottery) return [];

        // Проверяем, не участвует ли уже
        if (this.activeLottery.entries.has(userId)) {
            return [];
        }

        // Добавляем участника
        const entry: LotteryEntry = {
            userId,
            userName,
            enteredAt: Date.now(),
            entryMethod: method
        };
        this.activeLottery.entries.set(userId, entry);

        // Обновляем статистику
        if (this.userId) {
            const db = DbRepository.getInstance(this.userId);
            db.lottery.updateStats(userId, userName, 'entry');
        }

        this.log(`Entry added: ${userName} (${method})`, userId, userName);

        // Проверяем warmup триггеры по количеству
        const count = this.activeLottery.entries.size;
        const countActions: any[] = [];

        for (const trigger of this.activeLottery.warmupTriggers) {
            if (trigger.type === 'count' && !trigger.fired && count >= trigger.value) {
                trigger.fired = true;
                const msg = this.applyTemplate(trigger.message, {
                    subject: this.activeLottery.subject,
                    count,
                    initiator: this.activeLottery.initiatorName
                });
                countActions.push({ type: ActionTypes.SEND_MESSAGE, payload: { message: msg, forwardToUi: true } });
            }
        }

        return countActions;
    }

    private async fireWarmupTrigger(trigger: WarmupTriggerState): Promise<void> {
        if (!this.activeLottery || trigger.fired) return;

        trigger.fired = true;
        const count = this.activeLottery.entries.size;
        const remainingTime = Math.max(0, Math.ceil((this.activeLottery.endsAt - Date.now()) / 1000));

        const msg = this.applyTemplate(trigger.message, {
            subject: this.activeLottery.subject,
            count,
            timer: remainingTime,
            initiator: this.activeLottery.initiatorName
        });

        // Отправляем сразу через callback
        if (this.applyAction) {
            await this.applyAction({ type: ActionTypes.SEND_MESSAGE, payload: { message: msg, forwardToUi: true } });
        }
    }

    private async endLottery(): Promise<void> {
        if (!this.activeLottery) return;

        const lottery = this.activeLottery;
        const entries = Array.from(lottery.entries.values());
        const participantCount = entries.length;

        let winnerId: string | null = null;
        let winnerName: string | null = null;
        let resultMsg: string;

        if (participantCount > 0) {
            // Выбираем случайного победителя
            const winner = entries[Math.floor(Math.random() * entries.length)];
            winnerId = winner.userId;
            winnerName = winner.userName;

            resultMsg = this.applyTemplate(this.config.messages.winner, {
                subject: lottery.subject,
                winner: winnerName,
                count: participantCount,
                initiator: lottery.initiatorName
            });

            // Обновляем статистику победителя
            if (this.userId) {
                const db = DbRepository.getInstance(this.userId);
                db.lottery.updateStats(winnerId, winnerName, 'win');
            }

            this.log(`Lottery ended. Winner: ${winnerName}`, winnerId, winnerName);
        } else {
            resultMsg = this.applyTemplate(this.config.messages.noParticipants, {
                subject: lottery.subject,
                count: 0,
                initiator: lottery.initiatorName
            });

            this.log(`Lottery ended. No participants.`);
        }

        // Завершаем в БД
        if (this.userId) {
            const db = DbRepository.getInstance(this.userId);
            db.lottery.completeDraw(lottery.id, winnerId, winnerName, participantCount);

            // Отмечаем subject как использованный (если включено)
            if (this.config.enforceUniqueSubject && winnerId) {
                db.lottery.markSubjectUsed(lottery.subject, lottery.id);
            }
        }

        // Очищаем состояние
        this.clearTimers();
        this.activeLottery = null;
        this.lastDrawEndTime = Date.now();

        // Отправляем результат сразу через callback
        if (this.applyAction) {
            await this.applyAction({ type: ActionTypes.SEND_MESSAGE, payload: { message: resultMsg, forwardToUi: true } });
        }
    }

    private cancelLottery(): any[] {
        if (!this.activeLottery) return [];

        const lottery = this.activeLottery;

        // Отменяем в БД
        if (this.userId) {
            const db = DbRepository.getInstance(this.userId);
            db.lottery.cancelDraw(lottery.id);
        }

        const cancelMsg = this.applyTemplate(this.config.messages.cancelled, {
            subject: lottery.subject,
            initiator: lottery.initiatorName,
            count: lottery.entries.size
        });

        this.log(`Lottery cancelled for "${lottery.subject}"`);

        // Очищаем состояние
        this.clearTimers();
        this.activeLottery = null;
        this.lastDrawEndTime = Date.now();

        return [{ type: ActionTypes.SEND_MESSAGE, payload: { message: cancelMsg, forwardToUi: true } }];
    }

    private clearTimers(): void {
        for (const timer of this.timers) {
            clearTimeout(timer);
        }
        this.timers = [];
    }

    // ==================== Утилиты ====================

    private applyTemplate(template: string, vars: LotteryTemplateVars): string {
        let result = template;

        if (vars.subject !== undefined) {
            result = result.replace(/\{\{subject\}\}/g, vars.subject);
        }
        if (vars.command !== undefined) {
            result = result.replace(/\{\{command\}\}/g, vars.command);
        }
        if (vars.initiator !== undefined) {
            result = result.replace(/\{\{initiator\}\}/g, vars.initiator);
        }
        if (vars.winner !== undefined) {
            result = result.replace(/\{\{winner\}\}/g, vars.winner);
        }
        if (vars.count !== undefined) {
            result = result.replace(/\{\{count\}\}/g, String(vars.count));
        }
        if (vars.timer !== undefined) {
            result = result.replace(/\{\{timer\}\}/g, String(vars.timer));
        }
        if (vars.trigger !== undefined) {
            result = result.replace(/\{\{trigger\}\}/g, vars.trigger);
        }
        if (vars.cooldown !== undefined) {
            result = result.replace(/\{\{cooldown\}\}/g, String(vars.cooldown));
        }
        if (vars.user !== undefined) {
            result = result.replace(/\{\{user\}\}/g, vars.user);
        }
        // Stats-specific variables
        if (vars.topPlayers !== undefined) {
            result = result.replace(/\{\{topPlayers\}\}/g, vars.topPlayers);
        }
        if (vars.topSubjects !== undefined) {
            result = result.replace(/\{\{topSubjects\}\}/g, vars.topSubjects);
        }
        if (vars.userWins !== undefined) {
            result = result.replace(/\{\{userWins\}\}/g, String(vars.userWins));
        }
        if (vars.userSubjects !== undefined) {
            result = result.replace(/\{\{userSubjects\}\}/g, vars.userSubjects);
        }

        return result;
    }

    private isSubjectBlacklisted(subject: string): boolean {
        const blacklist = this.config.subjectBlacklist || [];
        const lowerSubject = subject.toLowerCase();
        return blacklist.some(blocked => blocked.toLowerCase() === lowerSubject);
    }

    private log(message: string, userId?: string | null, userName?: string | null): void {
        const logMessage = {
            timestamp: new Date().toISOString(),
            message: `[Lottery] ${message}`,
            userId: userId || null,
            userName: userName || null
        };
        this.logService.log(logMessage);
    }

    // Публичный метод для получения состояния (для UI/отладки)
    public getActiveLottery(): ActiveLottery | null {
        return this.activeLottery;
    }
}
