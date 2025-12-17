import { ActionTypes } from './ActionTypes';
import Middleware from './Middleware';
import { AppEvent, RedeemEvent, ChatEvent, FollowEvent, RaidEvent } from '../twitch/messageParser';
import { LogService } from '../logService';
import {
    BotConfig,
    TriggerRule,
    TriggerAction,
    TriggerCondition,
    TriggersBotConfig
} from '../store/StoreSchema';
import { DbRepository } from '../db/DbRepository';
import { TriggerRepository, CreateExecutionData } from '../db/TriggerRepository';
import { fetchUser } from '../twitch/authorizedHelixApi';

// ============================================
// Trigger Context Types
// ============================================

interface TriggerContext {
    event: AppEvent;
    eventType: 'message' | 'redemption' | 'follow' | 'command' | 'raid';

    sender: {
        id: string;
        name: string;
        displayName: string;
        roles: Set<'broadcaster' | 'mod' | 'vip' | 'sub'>;
    };

    args: string[];
    rawInput: string;

    reward?: {
        id: string;
        title: string;
        cost: number;
        userInput?: string;
    };

    raid?: {
        fromId: string;
        fromLogin: string;
        fromName: string;
        viewers: number;
    };
}

interface ResolvedUser {
    id: string;
    name: string;
    displayName: string;
}

// ============================================
// TriggerMiddleware Implementation
// ============================================

export default class TriggerMiddleware extends Middleware {
    private logService: LogService;
    private userId: string | null = null;
    private enabled = false;
    private rules: TriggerRule[] = [];

    // Cooldown tracking: key -> lastUsed timestamp
    // key format: "triggerId" (global) or "triggerId:userId" (per_user)
    private cooldowns: Map<string, number> = new Map();

    constructor(logService: LogService) {
        super();
        this.logService = logService;
    }

    // ============================================
    // Middleware Interface
    // ============================================

    async processMessage(event: AppEvent): Promise<{ message: AppEvent; actions: any[]; accepted: boolean }> {
        if (!this.enabled || this.rules.length === 0) {
            return { message: event, actions: [], accepted: false };
        }

        // Build context from event
        const context = this.buildContext(event);
        if (!context) {
            return { message: event, actions: [], accepted: false };
        }

        // Check each rule
        for (const rule of this.rules) {
            if (!rule.enabled) continue;

            // Check condition
            if (!this.matchesCondition(rule.condition, context)) continue;

            // Check cooldown
            if (this.isOnCooldown(rule, context)) continue;

            // Execute the trigger
            try {
                const actions = await this.executeTrigger(rule, context);
                this.updateCooldown(rule, context);

                return {
                    message: event,
                    actions,
                    accepted: rule.stopPropagation ?? false
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.log(`Ошибка выполнения триггера "${rule.name}": ${errorMessage}`);
            }
        }

        return { message: event, actions: [], accepted: false };
    }

    updateConfig(config: BotConfig): void {
        const triggers: TriggersBotConfig = config.triggers ?? { enabled: false, rules: [] };
        this.enabled = triggers.enabled;
        this.rules = triggers.rules ?? [];

        this.log(`TriggerMiddleware: конфиг обновлен, ${this.rules.length} правил, enabled=${this.enabled}`);
    }

    onUserIdUpdated(userId: string | null): void {
        this.userId = userId;
        // Clear cooldowns when user changes
        this.cooldowns.clear();
    }

    // ============================================
    // Context Building
    // ============================================

    private buildContext(event: AppEvent): TriggerContext | null {
        if (event.type === 'chat') {
            return this.buildChatContext(event as ChatEvent);
        }

        if (event.type === 'redemption') {
            return this.buildRedemptionContext(event as RedeemEvent);
        }

        if (event.type === 'follow') {
            return this.buildFollowContext(event as FollowEvent);
        }

        if (event.type === 'raid') {
            return this.buildRaidContext(event as RaidEvent);
        }

        return null;
    }

    private buildChatContext(event: ChatEvent): TriggerContext {
        const text = event.rawMessage || '';
        const isCommand = text.startsWith('!');

        // Parse roles from event
        const roles = new Set<'broadcaster' | 'mod' | 'vip' | 'sub'>();
        if (event.roles) {
            if (event.roles.isBroadcaster) roles.add('broadcaster');
            if (event.roles.isModerator) roles.add('mod');
            if (event.roles.isVip) roles.add('vip');
            // Note: subscriber status is tracked via badges, not in roles
        }

        // Parse args from message
        const args = this.parseArgs(text);

        return {
            event,
            eventType: isCommand ? 'command' : 'message',
            sender: {
                id: event.userId || '',
                name: event.userName || '',
                displayName: event.userNameRaw || event.userName || '',
                roles
            },
            args,
            rawInput: text
        };
    }

    private buildRedemptionContext(event: RedeemEvent): TriggerContext {
        const userInput = event.reward?.userInput || '';
        const args = this.parseArgs(userInput);

        return {
            event,
            eventType: 'redemption',
            sender: {
                id: event.userId || '',
                name: event.userLogin || event.userName || '',
                displayName: event.userName || '',
                roles: new Set()
            },
            args,
            rawInput: userInput,
            reward: {
                id: event.reward?.id || '',
                title: event.reward?.title || '',
                cost: event.reward?.cost || 0,
                userInput
            }
        };
    }

    private buildFollowContext(event: FollowEvent): TriggerContext {
        return {
            event,
            eventType: 'follow',
            sender: {
                id: event.userId || '',
                name: event.userName || '',
                displayName: event.userNameRaw || event.userName || '',
                roles: new Set()
            },
            args: [],
            rawInput: ''
        };
    }

    private buildRaidContext(event: RaidEvent): TriggerContext {
        return {
            event,
            eventType: 'raid',
            sender: {
                id: event.fromBroadcasterId || '',
                name: event.fromBroadcasterLogin || '',
                displayName: event.fromBroadcasterName || '',
                roles: new Set()
            },
            args: [],
            rawInput: '',
            raid: {
                fromId: event.fromBroadcasterId || '',
                fromLogin: event.fromBroadcasterLogin || '',
                fromName: event.fromBroadcasterName || '',
                viewers: event.viewers || 0
            }
        };
    }

    // ============================================
    // Condition Matching
    // ============================================

    private matchesCondition(condition: TriggerCondition, context: TriggerContext): boolean {
        // Check event type
        if (condition.eventType !== context.eventType) {
            return false;
        }

        // Check text match (for message/command)
        if (condition.textMatch && (context.eventType === 'message' || context.eventType === 'command')) {
            if (!this.matchesText(condition.textMatch, context.rawInput)) {
                return false;
            }
        }

        // Check reward ID (for redemption)
        if (condition.rewardId && context.eventType === 'redemption') {
            if (context.reward?.id !== condition.rewardId) {
                return false;
            }
        }

        // Check user roles
        if (condition.userRoles) {
            if (!this.matchesRoles(condition.userRoles, context.sender.roles)) {
                return false;
            }
        }

        return true;
    }

    private matchesText(
        textMatch: { type: string; value: string; caseSensitive?: boolean },
        input: string
    ): boolean {
        const text = textMatch.caseSensitive ? input : input.toLowerCase();
        const pattern = textMatch.caseSensitive ? textMatch.value : textMatch.value.toLowerCase();

        switch (textMatch.type) {
            case 'exact':
                return text.trim() === pattern;
            case 'starts':
                return text.trim().startsWith(pattern);
            case 'contains':
                return text.includes(pattern);
            case 'regex':
                try {
                    const flags = textMatch.caseSensitive ? '' : 'i';
                    const regex = new RegExp(textMatch.value, flags);
                    return regex.test(input);
                } catch {
                    return false;
                }
            default:
                return false;
        }
    }

    private matchesRoles(
        roleFilter: { include?: string[]; exclude?: string[] },
        userRoles: Set<string>
    ): boolean {
        // If include is specified, user must have at least one of the roles
        if (roleFilter.include && roleFilter.include.length > 0) {
            const hasIncluded = roleFilter.include.some(role => userRoles.has(role));
            if (!hasIncluded) return false;
        }

        // If exclude is specified, user must not have any of the excluded roles
        if (roleFilter.exclude && roleFilter.exclude.length > 0) {
            const hasExcluded = roleFilter.exclude.some(role => userRoles.has(role));
            if (hasExcluded) return false;
        }

        return true;
    }

    // ============================================
    // Cooldown Management
    // ============================================

    private isOnCooldown(rule: TriggerRule, context: TriggerContext): boolean {
        if (!rule.cooldown || rule.cooldown <= 0) {
            return false;
        }

        const key = this.getCooldownKey(rule, context);
        const lastUsed = this.cooldowns.get(key) || 0;
        const now = Date.now();

        return (now - lastUsed) < (rule.cooldown * 1000);
    }

    private updateCooldown(rule: TriggerRule, context: TriggerContext): void {
        if (!rule.cooldown || rule.cooldown <= 0) {
            return;
        }

        const key = this.getCooldownKey(rule, context);
        this.cooldowns.set(key, Date.now());
    }

    private getCooldownKey(rule: TriggerRule, context: TriggerContext): string {
        if (rule.cooldownScope === 'per_user') {
            return `${rule.id}:${context.sender.id}`;
        }
        return rule.id; // global
    }

    // ============================================
    // Trigger Execution
    // ============================================

    private async executeTrigger(rule: TriggerRule, context: TriggerContext): Promise<any[]> {
        const repository = this.getRepository();
        const actions: any[] = [];

        // Determine target user for the first action (for execution tracking)
        let primaryTargetUser: ResolvedUser | null = null;
        if (rule.actions.length > 0) {
            primaryTargetUser = await this.resolveTarget(rule.actions[0], context);
        }

        // Create execution record
        let executionId: number | null = null;
        if (repository) {
            const executionData: CreateExecutionData = {
                triggerId: rule.id,
                triggerName: rule.name,
                eventType: context.eventType,
                eventId: context.event.id,
                sourceUserId: context.sender.id,
                sourceUserName: context.sender.name,
                targetUserId: primaryTargetUser?.id,
                targetUserName: primaryTargetUser?.name,
                contextArgs: context.args,
                contextInput: context.rawInput
            };
            executionId = repository.createExecution(executionData);
        }

        // Process each action
        for (const action of rule.actions) {
            const targetUser = await this.resolveTarget(action, context);

            if (!targetUser && action.target === 'arg_user') {
                this.log(`Триггер "${rule.name}": target user не найден, пропускаем действие ${action.type}`);
                continue;
            }

            if (action.delay && action.delay.value > 0) {
                // Schedule delayed action
                if (repository && executionId) {
                    const executeAt = Date.now() + this.delayToMs(action.delay);

                    // Check for existing scheduled remove for this user (conflict handling)
                    if ((action.type === 'remove_vip' || action.type === 'remove_mod') && targetUser) {
                        const existingAction = repository.getScheduledRemoveForUser(
                            targetUser.id,
                            action.type as 'remove_vip' | 'remove_mod'
                        );

                        if (existingAction) {
                            // Extend the existing scheduled action instead of creating new
                            repository.extendScheduledAction(existingAction.id!, executeAt);
                            this.log(`Триггер "${rule.name}": продлен срок ${action.type} для ${targetUser.name} до ${new Date(executeAt).toLocaleString()}`);
                            continue;
                        }
                    }

                    repository.scheduleAction({
                        executionId,
                        actionType: action.type,
                        actionParams: JSON.stringify({
                            ...action.params,
                            message: action.params.message
                                ? this.interpolate(action.params.message, context, targetUser)
                                : undefined
                        }),
                        targetUserId: targetUser?.id || context.sender.id,
                        targetUserName: targetUser?.name || context.sender.name,
                        executeAt
                    });

                    this.log(`Триггер "${rule.name}": запланировано ${action.type} для ${targetUser?.name || context.sender.name} на ${new Date(executeAt).toLocaleString()}`);
                }
            } else {
                // Immediate action
                const immediateAction = this.buildImmediateAction(action, context, targetUser);
                if (immediateAction) {
                    actions.push(immediateAction);
                }
            }
        }

        this.log(`Триггер "${rule.name}" выполнен для ${context.sender.name}`);
        return actions;
    }

    private buildImmediateAction(
        action: TriggerAction,
        context: TriggerContext,
        targetUser: ResolvedUser | null
    ): any | null {
        const target = targetUser || {
            id: context.sender.id,
            name: context.sender.name,
            displayName: context.sender.displayName
        };

        switch (action.type) {
            case 'send_message':
                return {
                    type: ActionTypes.SEND_MESSAGE,
                    payload: {
                        message: this.interpolate(action.params.message || '', context, targetUser),
                        forwardToUi: true
                    }
                };

            case 'add_vip':
                return {
                    type: ActionTypes.ADD_VIP,
                    payload: {
                        userId: target.id,
                        userName: target.name
                    }
                };

            case 'remove_vip':
                return {
                    type: ActionTypes.REMOVE_VIP,
                    payload: {
                        userId: target.id,
                        userName: target.name
                    }
                };

            case 'add_mod':
                return {
                    type: ActionTypes.ADD_MOD,
                    payload: {
                        userId: target.id,
                        userName: target.name
                    }
                };

            case 'remove_mod':
                return {
                    type: ActionTypes.REMOVE_MOD,
                    payload: {
                        userId: target.id,
                        userName: target.name
                    }
                };

            case 'timeout':
                return {
                    type: ActionTypes.MUTE_USER,
                    payload: {
                        userId: target.id,
                        userName: target.name,
                        duration: action.params.duration || 60,
                        reason: action.params.reason || 'Trigger action'
                    }
                };

            case 'delete_message':
                return {
                    type: ActionTypes.DELETE_MESSAGE,
                    payload: {
                        messageId: context.event.id
                    }
                };

            case 'shoutout':
                return {
                    type: ActionTypes.SHOUTOUT,
                    payload: {
                        userId: target.id,
                        userName: target.name
                    }
                };

            default:
                return null;
        }
    }

    // ============================================
    // Target Resolution
    // ============================================

    private async resolveTarget(action: TriggerAction, context: TriggerContext): Promise<ResolvedUser | null> {
        if (action.target === 'sender') {
            return {
                id: context.sender.id,
                name: context.sender.name,
                displayName: context.sender.displayName
            };
        }

        if (action.target === 'arg_user') {
            const argIndex = action.argIndex ?? 0;

            // Try to find @username in args
            const username = this.extractUsername(context.args, argIndex);
            if (!username) {
                return null;
            }

            // Resolve user via Twitch API
            try {
                const user = await fetchUser(null, { login: username });
                return {
                    id: user.id,
                    name: user.login,
                    displayName: user.display_name
                };
            } catch (error) {
                this.log(`Не удалось найти пользователя @${username}`);
                return null;
            }
        }

        return null;
    }

    private extractUsername(args: string[], argIndex: number): string | null {
        if (args.length === 0) return null;

        // First, try to find @mention using regex
        const mentionRegex = /@(\w+)/;
        for (const arg of args) {
            const match = arg.match(mentionRegex);
            if (match) {
                return match[1].toLowerCase();
            }
        }

        // Fallback: use argument at specified index
        if (argIndex < args.length) {
            // Remove @ prefix if present
            return args[argIndex].replace(/^@/, '').toLowerCase();
        }

        return null;
    }

    // ============================================
    // Helpers
    // ============================================

    private parseArgs(text: string): string[] {
        // Split by whitespace, skip the first word if it's a command
        const words = text.trim().split(/\s+/);

        if (words.length === 0) return [];

        // If first word is a command (starts with !), skip it
        if (words[0].startsWith('!')) {
            return words.slice(1);
        }

        return words;
    }

    private interpolate(template: string, context: TriggerContext, targetUser: ResolvedUser | null): string {
        let result = template;

        // ${user} - sender name
        result = result.replace(/\$\{user\}/g, context.sender.displayName || context.sender.name);

        // ${target} - target user name
        if (targetUser) {
            result = result.replace(/\$\{target\}/g, targetUser.displayName || targetUser.name);
        }

        // ${args[N]} - specific argument
        result = result.replace(/\$\{args\[(\d+)\]\}/g, (_, index) => {
            const i = parseInt(index, 10);
            return context.args[i] || '';
        });

        // ${reward} - reward title (for redemptions)
        if (context.reward) {
            result = result.replace(/\$\{reward\}/g, context.reward.title);
            result = result.replace(/\$\{reward_cost\}/g, String(context.reward.cost));
        }

        // ${raider}, ${viewers} - raid info
        if (context.raid) {
            result = result.replace(/\$\{raider\}/g, context.raid.fromName);
            result = result.replace(/\$\{viewers\}/g, String(context.raid.viewers));
        }

        return result;
    }

    private delayToMs(delay: { value: number; unit: string }): number {
        const multipliers: Record<string, number> = {
            seconds: 1000,
            minutes: 60 * 1000,
            hours: 60 * 60 * 1000,
            days: 24 * 60 * 60 * 1000
        };
        return delay.value * (multipliers[delay.unit] || 1000);
    }

    private getRepository(): TriggerRepository | null {
        if (!this.userId) return null;
        return DbRepository.getInstance(this.userId).triggers;
    }

    private log(message: string, userId?: string | null, userName?: string | null): void {
        this.logService.log({
            timestamp: new Date().toISOString(),
            message,
            userId: userId || null,
            userName: userName || null
        });
    }
}
