import Middleware from "../Middleware";
import { AppEvent, RedeemEvent } from "../../twitch/messageParser";
import { BotConfig, StoreSchema } from "../../store/StoreSchema";
import ElectronStore from "electron-store";
import GachaEngine from "./GachaEngine";
import { ActionTypes } from "../ActionTypes";
import { GachaTrigger, GachaBannerMessages, PullResult } from "./types";
import { migrateGachaConfig, getDefaultBannerMessages } from "./migration";

/**
 * Заменяет переменные в шаблоне сообщения
 * Поддерживаемые переменные: ${user}, ${item}, ${stars}, ${rarity}, ${count}, ${pullNumber}, ${error}
 */
function formatMessage(template: string, variables: Record<string, string | number>): string {
    return template.replace(/\$\{(\w+)\}/g, (match, key) => {
        return variables[key]?.toString() ?? match;
    });
}

/**
 * Generate SHOW_MEDIA actions for a gacha pull result
 */
function generateMediaActions(
    result: PullResult,
    userName: string,
    userId: string
): Array<{ type: string; payload: any }> {
    const actions: Array<{ type: string; payload: any }> = [];

    const mediaEventIds = result.item.mediaEventIds;
    if (!mediaEventIds || mediaEventIds.length === 0) {
        return actions;
    }

    const stars = '⭐'.repeat(result.item.rarity);

    for (const mediaEventId of mediaEventIds) {
        actions.push({
            type: ActionTypes.SHOW_MEDIA,
            payload: {
                mediaEventId,
                context: {
                    user: userName,
                    userId: userId,
                    item: result.item.name,
                    rarity: result.item.rarity,
                    stars: stars,
                    pullNumber: result.pullNumber
                }
            }
        });
    }

    return actions;
}

export class GachaMiddleware extends Middleware {
    private store: ElectronStore<StoreSchema>;
    private gachaEngine: GachaEngine;
    private enabled: boolean = false;

    // Map: rewardId -> { bannerId, amount }
    private triggerMap: Map<string, { bannerId: number; amount: number }> = new Map();

    constructor(
        store: ElectronStore<StoreSchema>,
    ) {
        super();
        this.store = store;
        const name = this.store.get('currentBot') || 'default';
        const config = this.store.get('bots') || {};
        const bot = config[name] || null;

        console.log('[GachaMiddleware] Constructor called');
        console.log('[GachaMiddleware] Current bot name:', name);
        console.log('[GachaMiddleware] Bot config exists:', !!bot);
        console.log('[GachaMiddleware] Bot gacha config exists:', !!bot?.gacha);

        // Мигрируем конфиг если нужно
        const gachaConfig = bot?.gacha ? migrateGachaConfig(bot.gacha) : undefined;

        this.enabled = gachaConfig?.enabled ?? false;
        console.log('[GachaMiddleware] Enabled:', this.enabled);
        console.log('[GachaMiddleware] Gacha triggers:', JSON.stringify(gachaConfig?.triggers, null, 2));
        console.log('[GachaMiddleware] Gacha banners:', gachaConfig?.banners?.length || 0);
        console.log('[GachaMiddleware] Gacha items count:', gachaConfig?.items?.length || 0);

        this.gachaEngine = new GachaEngine(gachaConfig);
        this.buildTriggerMap(gachaConfig?.triggers || []);

        console.log('[GachaMiddleware] Trigger map initialized:', this.triggerMap.size, 'triggers');
    }

    private buildTriggerMap(triggers: GachaTrigger[]): void {
        this.triggerMap.clear();
        triggers.forEach(trigger => {
            this.triggerMap.set(trigger.rewardId, {
                bannerId: trigger.bannerId,
                amount: trigger.amount
            });
        });
    }

    processMessage(message: AppEvent) {
        console.log('[GachaMiddleware] ========== processMessage START ==========');
        console.log('[GachaMiddleware] Message type:', message.type);

        if (!this.enabled) {
            console.log('[GachaMiddleware] Gacha is disabled, skipping');
            return Promise.resolve({ message, actions: [], accepted: false });
        }

        if (message.type !== 'redemption') {
            console.log('[GachaMiddleware] Not a redemption event, skipping');
            return Promise.resolve({ message, actions: [], accepted: false });
        }

        const redemption = message as RedeemEvent;
        console.log('[GachaMiddleware] Redemption details:');
        console.log('[GachaMiddleware]   - User ID:', redemption.userId);
        console.log('[GachaMiddleware]   - User Name:', redemption.userName);
        console.log('[GachaMiddleware]   - Reward ID:', redemption.reward?.id);
        console.log('[GachaMiddleware]   - Reward Title:', redemption.reward?.title);

        const rewardId = redemption.reward?.id;
        if (!rewardId) {
            console.log('[GachaMiddleware] No reward ID in redemption');
            return Promise.resolve({ message, actions: [], accepted: false });
        }

        const trigger = this.triggerMap.get(rewardId);
        if (!trigger) {
            console.log(`[GachaMiddleware] No matching trigger for reward ID: ${rewardId}`);
            return Promise.resolve({ message, actions: [], accepted: false });
        }

        console.log('[GachaMiddleware] Found matching trigger:', JSON.stringify(trigger, null, 2));
        console.log('[GachaMiddleware]   - Banner ID:', trigger.bannerId);
        console.log('[GachaMiddleware]   - Pull amount:', trigger.amount);

        const userId = redemption.userId?.toString() || '0';
        const userName = redemption.userName?.toString() || 'UnknownUser';
        const bannerId = trigger.bannerId;

        // Получаем конфиг баннера и шаблоны сообщений
        const bannerConfig = this.gachaEngine.getBanner(bannerId);
        const messages = bannerConfig?.messages || getDefaultBannerMessages();

        let response = "";
        let mediaActions: Array<{ type: string; payload: any }> = [];

        try {
            if (trigger.amount === 1) {
                console.log('[GachaMiddleware] Executing single pull for banner:', bannerId);
                const result = this.gachaEngine.pull(userId, userName, bannerId);
                console.log('[GachaMiddleware] Pull result:', JSON.stringify(result, null, 2));

                const stars = '⭐'.repeat(result.item.rarity);
                response = formatMessage(messages.singlePull, {
                    user: redemption.userName || 'Unknown',
                    item: result.item.name,
                    stars: stars,
                    rarity: result.item.rarity
                });

                // Добавляем инфо о 50/50 для 5*
                if (result.item.rarity === 5 && result.was5050) {
                    if (result.won5050) {
                        response += result.wasCapturingRadiance
                            ? messages.capturingRadiance
                            : messages.won5050;
                    } else {
                        response += messages.lost5050;
                    }
                }

                // Инфо о soft pity
                if (result.wasSoftPity) {
                    response += formatMessage(messages.softPity, { pullNumber: result.pullNumber });
                }

                // Generate media actions for the pulled item
                mediaActions = generateMediaActions(result, userName, userId);
            } else {
                console.log(`[GachaMiddleware] Executing multi-pull (${trigger.amount}x) for banner:`, bannerId);
                const results = this.gachaEngine.multiPull(userId, trigger.amount, userName, bannerId);

                let _3counter = 0;
                let _4items: Array<{ name: string, result: any }> = [];
                let _5items: Array<{ name: string, result: any }> = [];

                results.forEach(result => {
                    if (result.item.rarity === 3) {
                        _3counter++;
                    } else if (result.item.rarity === 4) {
                        _4items.push({ name: result.item.name, result });
                    } else if (result.item.rarity === 5) {
                        _5items.push({ name: result.item.name, result });
                    }
                });

                console.log('[GachaMiddleware] Multi-pull summary:');
                console.log('[GachaMiddleware]   - 3* count:', _3counter);
                console.log('[GachaMiddleware]   - 4* items:', _4items.map(i => i.name));
                console.log('[GachaMiddleware]   - 5* items:', _5items.map(i => i.name));

                // Формируем компактное сообщение
                response = formatMessage(messages.multiPullIntro, {
                    user: redemption.userName || 'Unknown',
                    count: trigger.amount
                });

                const parts: string[] = [];

                // 5* предметы (с инфо о 50/50)
                if (_5items.length > 0) {
                    const fiveStarText = _5items.map(item => {
                        let text = item.name;
                        if (item.result.was5050) {
                            // Используем сокращенные маркеры для multi-pull
                            text += item.result.won5050
                                ? (item.result.wasCapturingRadiance ? '💫' : '✅')
                                : '❌';
                        }
                        return text;
                    }).join(', ');
                    parts.push(`⭐⭐⭐⭐⭐ ${fiveStarText}`);
                }

                // 4* предметы
                if (_4items.length > 0) {
                    const names = _4items.map(item => item.name);
                    if (names.length > 3) {
                        parts.push(`⭐⭐⭐⭐ x${names.length} (${names.slice(0, 2).join(', ')}...)`);
                    } else {
                        parts.push(`⭐⭐⭐⭐ ${names.join(', ')}`);
                    }
                }

                // 3* предметы (только счетчик)
                if (_3counter > 0) {
                    parts.push(`⭐⭐⭐ x${_3counter}`);
                }

                response += parts.join(' | ');

                // Generate media actions for 4★ and 5★ items in multi-pull
                for (const item of [..._5items, ..._4items]) {
                    const itemMediaActions = generateMediaActions(item.result, userName, userId);
                    mediaActions.push(...itemMediaActions);
                }
            }
        } catch (error) {
            console.error('[GachaMiddleware] Error during pull:', error);
            response = formatMessage(messages.error, {
                user: redemption.userName || 'Unknown',
                error: (error as Error).message
            });
        }

        console.log('[GachaMiddleware] Final response:', response);

        const action = {
            type: ActionTypes.SEND_MESSAGE,
            payload: { message: response, forwardToUi: true }
        };

        console.log('[GachaMiddleware] Media actions count:', mediaActions.length);
        console.log('[GachaMiddleware] ========== processMessage END (success) ==========');
        return Promise.resolve({ message, actions: [action, ...mediaActions], accepted: true });
    }

    updateConfig(botConfig: BotConfig): void {
        console.log('[GachaMiddleware] updateConfig called');

        if (!botConfig?.gacha) {
            console.warn('[GachaMiddleware] No gacha config provided');
            this.enabled = false;
            return;
        }

        // Мигрируем конфиг если нужно
        const gachaConfig = migrateGachaConfig(botConfig.gacha);

        // Обновляем enabled
        this.enabled = gachaConfig.enabled ?? false;

        console.log('[GachaMiddleware] Migrated config:');
        console.log('[GachaMiddleware]   - enabled:', this.enabled);
        console.log('[GachaMiddleware]   - banners:', gachaConfig.banners?.length || 0);
        console.log('[GachaMiddleware]   - items:', gachaConfig.items?.length || 0);
        console.log('[GachaMiddleware]   - triggers:', gachaConfig.triggers?.length || 0);

        // Обновляем triggers
        this.buildTriggerMap(gachaConfig.triggers || []);

        // Загружаем в engine
        this.gachaEngine.loadFromStore(gachaConfig);

        console.log('[GachaMiddleware] Config updated successfully');
    }

    onUserIdUpdated(userId: string | null) {
        console.log('[GachaMiddleware] onUserIdUpdated called with userId:', userId);
        this.gachaEngine.setCurrentUserId(userId);
    }
}
