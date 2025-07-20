import RouletteService from './RouletteService';
import GreetingMiddleware from './GreetingMiddleware';
import { ActionType } from './ActionTypes';
import {AppEvent, ParsedIrcMessage} from "../messageParser";

export interface BotConfig {
  roulette: {
    enabled: boolean;
    commands: string[];
    survivalMessages: string[];
    deathMessages: string[];
    cooldownMessage: string[];
    muteDuration: number;
    commandCooldown: number;
    chance: number;
  };

  custom?: {
    enabled: boolean;
  } | null;

  pingpong: {
    enabled: boolean;
    commands: {
      enabled: boolean;
      name: string;
      triggerType: "exact" | "start" | "contains";
      triggers: {
        type: "text" | "regex";
        value: string;
        flags?: string;
      }[];
      responses: string[];
    }[];
  };
}

export class MiddlewareProcessor {
  private applyAction: (action: { type: ActionType; payload: any }) => Promise<void>;
  private middlewares = [new RouletteService(), new GreetingMiddleware()];

  constructor(applyAction: (action: { type: ActionType; payload: any }) => Promise<void>) {
    this.applyAction = applyAction;
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


  isBotConfig(obj: any): obj is BotConfig {
    const r = obj?.roulette;
    const c = obj?.custom;
    const p = obj?.pingpong;

    const validCustom = c === null || (typeof c === 'object' && typeof c?.enabled === 'boolean');

    const validPingPong =
        typeof p === 'object' &&
        p !== null &&
        typeof p.enabled === 'boolean' &&
        Array.isArray(p.commands) &&
        p.commands.every((cmd: any) =>
            typeof cmd === 'object' &&
            typeof cmd.enabled === 'boolean' &&
            typeof cmd.name === 'string' &&
            typeof cmd.triggerType === 'string' &&
            ['exact', 'start', 'contains'].includes(cmd.triggerType) &&
            Array.isArray(cmd.triggers) &&
            cmd.triggers.every((tr: any) =>
                typeof tr === 'object' &&
                typeof tr.type === 'string' &&
                (tr.type === 'text' || (tr.type === 'regex' && typeof tr.flags === 'string')) &&
                typeof tr.value === 'string'
            ) &&
            Array.isArray(cmd.responses) &&
            cmd.responses.every((resp: any) => typeof resp === 'string')
        );

    return (
        typeof r?.enabled === 'boolean' &&
        Array.isArray(r?.commands) &&
        Array.isArray(r?.survivalMessages) &&
        Array.isArray(r?.deathMessages) &&
        Array.isArray(r?.cooldownMessage) &&
        typeof r?.muteDuration === 'number' &&
        typeof r?.commandCooldown === 'number' &&
        typeof r?.chance === 'number' &&
        validCustom && validPingPong
    );
  }

  safeCast<T>(value: any, checker: (v: any) => v is T): T | null {
    return checker(value) ? value : null;
  }

  onThemeUpdated(botConfig: any): void {
    const config = this.safeCast<BotConfig>(botConfig, this.isBotConfig);
    if (config) {
      console.log('✅ Конфигурация бота валидна!');
      for (const middleware of this.middlewares) {
        middleware.updateConfig(config);
      }
    } else {
      console.warn('❌ Невалидная конфигурация бота!', botConfig);
    }

  }


}
