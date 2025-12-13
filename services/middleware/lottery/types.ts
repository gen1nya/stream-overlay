/**
 * Lottery Bot Types
 * Типы для системы розыгрышей
 */

/** Триггер разогревающего сообщения */
export interface WarmupTrigger {
    id: string;
    type: 'time' | 'count';  // по времени или по количеству участников
    value: number;           // секунды или количество
    message: string;         // шаблон сообщения
}

/** Триггер с состоянием (для runtime) */
export interface WarmupTriggerState extends WarmupTrigger {
    fired: boolean;          // уже сработал?
}

/** Конфигурация сообщений лотереи */
export interface LotteryMessages {
    start: string;           // "Розыгрыш {{subject}} начат!"
    warmup: WarmupTrigger[]; // разогревающие сообщения
    winner: string;          // "Победитель: {{winner}}!"
    noParticipants: string;  // "Никто не участвовал"
    alreadyUsed: string;     // "{{subject}} уже разыгрывался!"
    alreadyRunning: string;  // "Розыгрыш уже идёт!"
    cooldown: string;        // "Подожди {{cooldown}} сек"
    cancelled: string;       // "Розыгрыш отменён"
    userNotInChat: string;   // "{{subject}} не найден в чате!"
    subjectRequired: string; // "Укажите предмет розыгрыша!"
}

/** Конфигурация бота лотереи (для store) */
export interface LotteryBotConfig {
    enabled: boolean;

    // Команды
    command: string;                   // "!розыгрыш"
    cancelCommand: string;             // "!отмена"
    commandCooldownSec: number;        // кулдаун между розыгрышами (глобальный)

    // Способы входа
    entryTrigger: string;              // "+" или другое сообщение
    channelPointRewardIds: string[];   // ID наград канала

    // Таймер
    timerDurationSec: number;          // длительность приёма заявок

    // Валидация subject
    requireSubjectInChat: boolean;     // требовать, чтобы subject был в чате

    // Уникальность subject
    enforceUniqueSubject: boolean;

    // Сообщения
    messages: LotteryMessages;
}

/** Запись об участнике розыгрыша */
export interface LotteryEntry {
    userId: string;
    userName: string;
    enteredAt: number;
    entryMethod: 'chat' | 'points';
}

/** Активная лотерея (runtime state) */
export interface ActiveLottery {
    id: number;                              // ID в БД
    subject: string;                         // предмет розыгрыша (@username)
    initiatorId: string;
    initiatorName: string;
    startedAt: number;
    endsAt: number;
    entries: Map<string, LotteryEntry>;      // userId -> entry
    warmupTriggers: WarmupTriggerState[];    // копия триггеров с состоянием
}

/** Запись о розыгрыше в БД */
export interface LotteryDraw {
    id: number;
    subject: string;
    initiatorId: string;
    initiatorName: string;
    startedAt: number;
    endedAt: number;
    winnerId: string | null;
    winnerName: string | null;
    participantCount: number;
    status: 'completed' | 'cancelled';
}

/** Статистика пользователя */
export interface LotteryStats {
    userId: string;
    userName: string;
    totalEntries: number;
    totalWins: number;
    totalInitiated: number;
    lastWinAt: number | null;
    updatedAt: number;
}

/** Переменные для подстановки в шаблоны */
export interface LotteryTemplateVars {
    subject?: string;
    initiator?: string;
    command?: string;
    winner?: string;
    count?: number;
    timer?: number;
    trigger?: string;
    cooldown?: number;
    user?: string;
}

/** Дефолтная конфигурация */
export const DEFAULT_LOTTERY_CONFIG: LotteryBotConfig = {
    enabled: false,
    command: '!розыгрыш',
    cancelCommand: '!отмена',
    commandCooldownSec: 60,
    entryTrigger: '+',
    channelPointRewardIds: [],
    timerDurationSec: 60,
    requireSubjectInChat: true,
    enforceUniqueSubject: false,
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
        subjectRequired: 'Укажите предмет розыгрыша! Пример: {{command}} приз'
    }
};
