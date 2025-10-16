import RouletteService from './RouletteService';
import GreetingMiddleware from './GreetingMiddleware';
import {ActionType} from './ActionTypes';
import {AppEvent} from "../twitch/messageParser";
import {LogService} from "../logService";
import Middleware from "./Middleware";
import {UserData} from "../twitch/types/UserData";
import {BotConfig, StoreSchema} from "../store/StoreSchema";
import ElectronStore from "electron-store";
import {GachaMiddleware} from "./gacha/GachaMiddleware";
import type * as Database from "better-sqlite3";
import {DbRepository} from "../db/DbRepository";


export class MiddlewareProcessor {
  private applyAction: (action: { type: ActionType; payload: any }) => Promise<void>;
  private logService: LogService;
  private middlewares: Middleware[] = [];

  constructor(
      applyAction: (action: { type: ActionType; payload: any }) => Promise<void>,
      logService: LogService,
      store: ElectronStore<StoreSchema>,
  ) {
    this.applyAction = applyAction;
    this.logService = logService;
    this.middlewares = [
      new RouletteService(this.logService),
      new GreetingMiddleware(this.logService),
      new GachaMiddleware(store)
    ];
  }

  async processMessage(message: AppEvent): Promise<AppEvent> {
    const actions: { type: ActionType; payload: any }[] = [];
    let currentMessage = message;
    for (const middleware of this.middlewares) {
      const result = await middleware.processMessage(currentMessage);
      if (result.message !== undefined) currentMessage = result.message;
      if (result.actions?.length) actions.push(...result.actions);
      if (result.accepted) break;
    }
    for (const action of actions) {
      await this.applyAction(action);
    }
    return currentMessage;
  }

  onThemeUpdated(botConfig: BotConfig): void {
    if (botConfig) {
      console.log('✅ Конфигурация бота валидна!');
      for (const middleware of this.middlewares) {
        middleware.updateConfig(botConfig);
      }
    } else {
      console.warn('❌ Невалидная конфигурация бота!', botConfig);
    }
  }

  setEditors(editors: UserData[]): void {
    for (const middleware of this.middlewares) {
      if (middleware instanceof RouletteService) {
        middleware.setEditors(editors);
      }
    }
  }

  onUserUpdated(userId: string | null) {
    for (const middleware of this.middlewares) {
      middleware.onUserIdUpdated(userId);
    }
  }
}

export function applyRandomInt(template: string): string {
  try{
    return template.replace(/\$\{random\((\d+),\s*(\d+)\)\}/g, (_, min, max) => {
      const a = parseInt(min, 10);
      const b = parseInt(max, 10);
      const r = Math.floor(Math.random() * (b - a + 1)) + a;
      return r.toString();
    });
  } catch (e) {
    console.error('❌ Error processing random replacement in template:', template, e);
    return template
  }
}

