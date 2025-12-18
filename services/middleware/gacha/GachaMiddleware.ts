import Middleware from "../Middleware";
import {AppEvent, RedeemEvent} from "../../twitch/messageParser";
import {BotConfig, StoreSchema} from "../../store/StoreSchema";
import ElectronStore from "electron-store";
import GachaEngine from "./GachaEngine";
import {ActionTypes} from "../ActionTypes";
import type * as Database from "better-sqlite3";


export class GachaMiddleware extends Middleware {
    private store: ElectronStore<StoreSchema>;
    private gachaEngine: GachaEngine;

    private triggers: { rewardId: string, amount: number }[];

    constructor(
        store: ElectronStore<StoreSchema>,
    ) {
        super();
        this.store = store;
        const name =  this.store.get('currentBot') || 'default';
        const config = this.store.get('bots') || {};
        const bot = config[name] || null ;

        console.log('🎰 [GachaMiddleware] Constructor called');
        console.log('🎰 [GachaMiddleware] Current bot name:', name);
        console.log('🎰 [GachaMiddleware] Bot config exists:', !!bot);
        console.log('🎰 [GachaMiddleware] Bot gacha config exists:', !!bot?.gacha);
        console.log('🎰 [GachaMiddleware] Bot gacha triggers:', JSON.stringify(bot?.gacha?.triggers, null, 2));
        console.log('🎰 [GachaMiddleware] Bot gacha banner:', JSON.stringify(bot?.gacha?.banner, null, 2));
        console.log('🎰 [GachaMiddleware] Bot gacha items count:', bot?.gacha?.items?.length || 0);

        this.gachaEngine = new GachaEngine(bot?.gacha);
        this.triggers = bot?.gacha?.triggers /*|| [{ rewardId:"e1350c53-0b86-4e10-83cf-756113b87c89", amount: 1 }]*/;

        console.log('🎰 [GachaMiddleware] Triggers initialized:', JSON.stringify(this.triggers, null, 2));
    }

    processMessage(message: AppEvent)  {
        console.log('🎰 [GachaMiddleware] ========== processMessage START ==========');
        console.log('🎰 [GachaMiddleware] Message received:', JSON.stringify(message, null, 2));
        console.log('🎰 [GachaMiddleware] Message type:', message.type);

        if (message.type !== 'redemption') {
            console.log('🎰 [GachaMiddleware] ❌ Not a redemption event, skipping');
            console.log('🎰 [GachaMiddleware] ========== processMessage END (not redemption) ==========');
            return Promise.resolve({ message, actions: [], accepted: false });
        }

        console.log('🎰 [GachaMiddleware] ✅ Message is a redemption event');

        const redemption = message as RedeemEvent;
        console.log('🎰 [GachaMiddleware] Redemption details:');
        console.log('🎰 [GachaMiddleware]   - User ID:', redemption.userId);
        console.log('🎰 [GachaMiddleware]   - User Name:', redemption.userName);
        console.log('🎰 [GachaMiddleware]   - Reward ID:', redemption.reward?.id);
        console.log('🎰 [GachaMiddleware]   - Reward Title:', redemption.reward?.title);

        console.log('🎰 [GachaMiddleware] Current triggers:', JSON.stringify(this.triggers, null, 2));
        console.log('🎰 [GachaMiddleware] Triggers is array:', Array.isArray(this.triggers));
        console.log('🎰 [GachaMiddleware] Triggers length:', this.triggers?.length);

        if (!this.triggers || !Array.isArray(this.triggers)) {
            console.log('🎰 [GachaMiddleware] ❌ Triggers not configured or not an array!');
            console.log('🎰 [GachaMiddleware] ========== processMessage END (no triggers) ==========');
            return Promise.resolve({ message: message, actions: [], accepted: false });
        }

        const matchingTrigger = this.triggers.some(t => {
            console.log(`🎰 [GachaMiddleware] Checking trigger: ${t.rewardId} === ${redemption.reward?.id} -> ${t.rewardId === redemption.reward?.id}`);
            return t.rewardId === redemption.reward?.id;
        });

        if (!matchingTrigger) {
            console.log(`🎰 [GachaMiddleware] ❌ No matching trigger for reward ID: ${redemption.reward?.id}`);
            console.log('🎰 [GachaMiddleware] ========== processMessage END (no matching trigger) ==========');
            return Promise.resolve({ message: message, actions: [], accepted: false });
        }

        const trigger = this.triggers.find(t => t.rewardId === redemption.reward?.id);
        if (!trigger) {
            console.log(`🎰 [GachaMiddleware] ❌ Trigger find returned null (should not happen)`);
            console.log('🎰 [GachaMiddleware] ========== processMessage END (trigger find failed) ==========');
            return Promise.resolve({message: message, actions: [], accepted: false});
        }

        console.log('🎰 [GachaMiddleware] ✅ Found matching trigger:', JSON.stringify(trigger, null, 2));
        console.log('🎰 [GachaMiddleware] Pull amount:', trigger.amount);

        let response = "";
        if (trigger.amount === 1) {
            console.log('🎰 [GachaMiddleware] Executing single pull...');
            const result = this.gachaEngine.pull(
                redemption.userId?.toString() || '0',
                redemption.userName?.toString() || 'UnknownUser'
            );
            console.log('🎰 [GachaMiddleware] Pull result:', JSON.stringify(result, null, 2));

            const stars = '⭐'.repeat(result.item.rarity);

            response = `@${redemption.userName}, you got: ${result.item.name} ${stars}`;

            // Добавляем инфо о 50/50 для 5*
            if (result.item.rarity === 5 && result.was5050) {
                if (result.won5050) {
                    response += result.wasCapturingRadiance ? ' 💫 (Capturing Radiance!)' : ' ✅ (50/50 Won!)';
                } else {
                    response += ' ❌ (50/50 Lost)';
                }
            }

            // Инфо о soft pity
            if (result.wasSoftPity) {
                response += ` 🔥 (Крутка #${result.pullNumber})`;
            }
        } else {
            console.log(`🎰 [GachaMiddleware] Executing multi-pull (${trigger.amount}x)...`);
            let _3counter = 0;
            let _4items: Array<{name: string, result: any}> = [];
            let _5items: Array<{name: string, result: any}> = [];

            for (let i = 0; i < trigger.amount; i++) {
                console.log(`🎰 [GachaMiddleware] Multi-pull iteration ${i + 1}/${trigger.amount}`);
                const result = this.gachaEngine.pull(
                    redemption.userId?.toString() || '0',
                    redemption.userName?.toString() || 'UnknownUser'
                );
                console.log(`🎰 [GachaMiddleware] Multi-pull result ${i + 1}:`, JSON.stringify(result, null, 2));
                if (result.item.rarity === 3) {
                    _3counter++;
                } else if (result.item.rarity === 4) {
                    _4items.push({name: result.item.name, result});
                } else if (result.item.rarity === 5) {
                    _5items.push({name: result.item.name, result});
                }
            }

            console.log('🎰 [GachaMiddleware] Multi-pull summary:');
            console.log('🎰 [GachaMiddleware]   - 3* count:', _3counter);
            console.log('🎰 [GachaMiddleware]   - 4* items:', _4items.map(i => i.name));
            console.log('🎰 [GachaMiddleware]   - 5* items:', _5items.map(i => i.name));

            // Формируем компактное сообщение
            response = `@${redemption.userName} крутит ${trigger.amount}x и получает: `;

            const parts: string[] = [];

            // 5* предметы (с инфо о 50/50)
            if (_5items.length > 0) {
                const fiveStarText = _5items.map(item => {
                    let text = item.name;
                    if (item.result.was5050) {
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
                // Если слишком много, группируем
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
        }

        console.log('🎰 [GachaMiddleware] Final response:', response);

        const action = {
            type: ActionTypes.SEND_MESSAGE,
            payload: {message: response}
        };

        console.log('🎰 [GachaMiddleware] Created action:', JSON.stringify(action, null, 2));
        console.log('🎰 [GachaMiddleware] ========== processMessage END (success) ==========');

        return Promise.resolve({ message: message, actions: [action], accepted: true });
    }

    updateConfig(botConfig: BotConfig): void {
        console.log('🎰 [GachaMiddleware] updateConfig called');
        console.log('🎰 [GachaMiddleware] New config:', JSON.stringify(botConfig?.gacha, null, 2));

        if (!botConfig || !botConfig.gacha || !botConfig.gacha.banner || !botConfig.gacha.items) {
            console.warn('🎰 [GachaMiddleware] ❌ Invalid gacha config!');
            console.warn('🎰 [GachaMiddleware]   - botConfig exists:', !!botConfig);
            console.warn('🎰 [GachaMiddleware]   - gacha exists:', !!botConfig?.gacha);
            console.warn('🎰 [GachaMiddleware]   - banner exists:', !!botConfig?.gacha?.banner);
            console.warn('🎰 [GachaMiddleware]   - items exists:', !!botConfig?.gacha?.items);
            return;
        }

        // Update triggers if they exist
        if (botConfig.gacha.triggers) {
            console.log('🎰 [GachaMiddleware] Updating triggers:', JSON.stringify(botConfig.gacha.triggers, null, 2));
            this.triggers = botConfig.gacha.triggers;
        }

        this.gachaEngine.setBannerConfig(botConfig.gacha.banner);
        this.gachaEngine.getItemDatabase().loadFromStore(botConfig.gacha.items);
        console.log('🎰 [GachaMiddleware] Config updated successfully');
    }

    onUserIdUpdated(userId: string | null) {
        console.log('🎰 [GachaMiddleware] onUserIdUpdated called with userId:', userId);
        this.gachaEngine.setCurrentUserId(userId);
    }
}