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

    private triggers: [ { rewardId: string, amount: number }];

    constructor(
        store: ElectronStore<StoreSchema>,
    ) {
        super();
        this.store = store;
        const name =  this.store.get('currentBot') || 'default';
        const config = this.store.get('bots') || {};
        const bot = config[name] || null ;
        this.gachaEngine = new GachaEngine(bot?.gacha);
        this.triggers = bot?.gacha?.triggers /*|| [{ rewardId:"e1350c53-0b86-4e10-83cf-756113b87c89", amount: 1 }]*/;
    }

    processMessage(message: AppEvent)  {
        console.log('🎰 GachaMiddleware processing message:', message);
        if (message.type !== 'redemption') {
            return Promise.resolve({ message, actions: [], accepted: false });
        }

        console.log('🎰 GachaMiddleware processing redemption:', message);

        const redemption = message as RedeemEvent;
        if (!this.triggers.some(t => t.rewardId === redemption.reward.id)) {
            console.log(`⚠️ Gacha trigger for reward ID ${redemption.reward.id} not found.`);
            return Promise.resolve({ message: message, actions: [], accepted: false });
        }

        const trigger = this.triggers.find(t => t.rewardId === redemption.reward.id);
        if (!trigger) {
            console.log(`⚠️ Gacha trigger for reward ID ${redemption.reward.id} not found.`);
            return Promise.resolve({message: message, actions: [], accepted: false});
        }

        let response = "";
        if (trigger.amount === 1) {
            const result = this.gachaEngine.pull(
                redemption.userId?.toString() || '0',
                redemption.userName?.toString() || 'UnknownUser'
            );
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
            let _3counter = 0;
            let _4items: Array<{name: string, result: any}> = [];
            let _5items: Array<{name: string, result: any}> = [];

            for (let i = 0; i < trigger.amount; i++) {
                const result = this.gachaEngine.pull(
                    redemption.userId?.toString() || '0',
                    redemption.userName?.toString() || 'UnknownUser'
                );
                if (result.item.rarity === 3) {
                    _3counter++;
                } else if (result.item.rarity === 4) {
                    _4items.push({name: result.item.name, result});
                } else if (result.item.rarity === 5) {
                    _5items.push({name: result.item.name, result});
                }
            }

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

        const action = {
            type: ActionTypes.SEND_MESSAGE,
            payload: {message: response}
        };
        return Promise.resolve({ message: message, actions: [action], accepted: true });
    }

    updateConfig(botConfig: BotConfig): void {
        if (!botConfig || !botConfig.gacha || !botConfig.gacha.banner || !botConfig.gacha.items) {
            console.warn('❌ Невалидная конфигурация гача!', botConfig);
            return;
        }
        this.gachaEngine.setBannerConfig(botConfig.gacha.banner);
        this.gachaEngine.getItemDatabase().loadFromStore(botConfig.gacha.items);
    }

    onUserIdUpdated(userId: string | null) {
        this.gachaEngine.setCurrentUserId(userId);
    }
}