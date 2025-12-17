import Middleware from './Middleware';
import { ActionTypes } from './ActionTypes';
import { AppEvent } from '../twitch/messageParser';
import { BotConfig, TimerBotConfig } from '../store/StoreSchema';
import { LogService } from '../logService';

export default class TimerMiddleware extends Middleware {
    private config: TimerBotConfig = { enabled: false, timers: [] };
    private messageCounters: Map<string, number> = new Map();  // timerId → message count
    private lastSentTime: Map<string, number> = new Map();     // timerId → timestamp
    private isBroadcastingCallback: (() => Promise<boolean>) | null = null;
    private logService: LogService;
    private userId: string | null = null;

    constructor(logService: LogService) {
        super();
        this.logService = logService;
    }

    setIsBroadcastingCallback(callback: () => Promise<boolean>): void {
        this.isBroadcastingCallback = callback;
    }

    updateConfig(botConfig: BotConfig): void {
        this.config = botConfig.timers || { enabled: false, timers: [] };

        // Initialize counters for new timers (don't reset existing ones)
        for (const timer of this.config.timers) {
            if (!this.messageCounters.has(timer.id)) {
                this.messageCounters.set(timer.id, 0);
            }
            if (!this.lastSentTime.has(timer.id)) {
                this.lastSentTime.set(timer.id, 0);
            }
        }

        // Clean up counters for removed timers
        const timerIds = new Set(this.config.timers.map(t => t.id));
        for (const id of this.messageCounters.keys()) {
            if (!timerIds.has(id)) {
                this.messageCounters.delete(id);
                this.lastSentTime.delete(id);
            }
        }
    }

    onUserIdUpdated(userId: string | null): void {
        this.userId = userId;
    }

    async processMessage(message: AppEvent): Promise<{ message: any; actions: any[]; accepted: boolean }> {
        const actions: { type: string; payload: any }[] = [];

        // Only process chat messages
        if (message.type !== 'chat') {
            return { message, actions, accepted: false };
        }

        // Check if timers are enabled
        if (!this.config.enabled || this.config.timers.length === 0) {
            return { message, actions, accepted: false };
        }

        // Check if stream is online
        if (this.isBroadcastingCallback) {
            const isBroadcasting = await this.isBroadcastingCallback();
            if (!isBroadcasting) {
                return { message, actions, accepted: false };
            }
        }

        const now = Date.now();

        // Process each enabled timer
        for (const timer of this.config.timers) {
            if (!timer.enabled) continue;

            // Increment message counter
            const currentCount = (this.messageCounters.get(timer.id) || 0) + 1;
            this.messageCounters.set(timer.id, currentCount);

            // Check if conditions are met
            const lastSent = this.lastSentTime.get(timer.id) || 0;
            const timeSinceLastSend = now - lastSent;
            const minIntervalMs = timer.minIntervalSec * 1000;

            const messageConditionMet = timer.minMessages <= 0 || currentCount >= timer.minMessages;
            const timeConditionMet = timeSinceLastSend >= minIntervalMs;

            if (messageConditionMet && timeConditionMet) {
                // Add SEND_MESSAGE action
                actions.push({
                    type: ActionTypes.SEND_MESSAGE,
                    payload: {
                        message: timer.message,
                        forwardToUi: true
                    }
                });

                // Reset counters
                this.messageCounters.set(timer.id, 0);
                this.lastSentTime.set(timer.id, now);

                this.logService.logMessage(`Timer "${timer.name}" triggered`);
            }
        }

        return { message, actions, accepted: false };
    }
}
