import { ActionTypes } from './ActionTypes';
import Middleware from './Middleware';
import {applyRandomInt, BotConfig} from './MiddlewareProcessor';
import RoleRestoreManager from './RoleRestoreManager';
import {AppEvent} from "../messageParser";
import {LogService} from "../logService";
import {UserData} from "../types/UserData";
import {act} from "react";

export default class RouletteService extends Middleware {
  private commands: string[];
  private commandCooldown: number;
  private survivalMessages: string[];
  private deathMessages: string[];
  private protectedUsersMessages: string[] = [];
  private cooldownMessages: string[];
  private muteDuration: number;
  private enabled: boolean;
  private allowToBanEditors: boolean = false;
  private cooldowns: Map<string, number> = new Map();
  private roleManager: RoleRestoreManager;
  private chance: number;
  private logService: LogService;
  private editors: UserData[] = [];

  constructor(
    logService: LogService,
    muteDuration = 2 * 60 * 1000,
    commandCooldown = 30 * 1000,
    deathMessages: string[] = [
      '@${user} Победил и хранится в темном прохладном месте. 🔇',
      '@${user} *А разве Макаровым играют в рулетку?* 🔇',
    ],
    survivalMessages: string[] = [
      "@{user} still alive! 🎲",
      '@${user} Не пробил!',
      '@${user} Need one more pull; Just one more!',
    ],
    cooldownMessages: string[] = [
      '@${user}, Привет... Чем могу помочь?',
      '@${user}, Привет... Чем могу [PEKO]?',
      '@${user}, от факапа до факапа 30 секунд. ⏳',
      'WAAAAAAAAGH!!!!11!',
    ],
    commands: string[] = ['!roulette', '!рулетка'],
    enabled: boolean = false,
    protectedUsersMessages: string[] = ['Редактор не учавствует в фестивале'],
  ) {
    super();
    this.commands = commands;
    this.commandCooldown = commandCooldown;
    this.survivalMessages = survivalMessages;
    this.deathMessages = deathMessages;
    this.cooldownMessages = cooldownMessages;
    this.muteDuration = muteDuration;
    this.enabled = enabled;
    this.chance = 0.18;
    this.logService = logService;
    this.roleManager = new RoleRestoreManager(logService);
    this.protectedUsersMessages = protectedUsersMessages;
  }

    updateConfig(config: BotConfig) {
      this.commands = config.roulette.commands;
      this.commandCooldown = config.roulette.commandCooldown;
      this.survivalMessages = config.roulette.survivalMessages;
      this.deathMessages = config.roulette.deathMessages;
      this.cooldownMessages = config.roulette.cooldownMessage;
      this.muteDuration = config.roulette.muteDuration;
      this.enabled = config.roulette.enabled;
      this.chance = config.roulette.chance || 18;
      this.allowToBanEditors = config.roulette.allowToBanEditors || false;
      this.protectedUsersMessages = config.roulette.protectedUsersMessages;
      console.log('✅ RouletteService config updated:', config.roulette);
    }

  async processMessage(message: AppEvent) {
    if (!this.enabled) {
      console.warn('⏩ RouletteService is disabled, skipping message processing');
      return { accepted: false, message: { ...message }, actions: [] };
    }
    if (message.type !== 'chat') {
      console.warn('⏩ RouletteService only processes chat messages, skipping:', message.type);
      return { message, actions: [], accepted: false };
    }
    if (message.userId === null || message.userName === null) {
      console.warn('❌ Message is missing userId or userName, skipping RouletteService processing');
      return { accepted: false, message: { ...message }, actions: [] };
    }
    if (!this.commands.includes(message.htmlMessage)) {
      console.warn(`⏩ Message is not a roulette command, skipping`);
      return { accepted: false, message: { ...message }, actions: [] };
    }
    const now = Date.now();
    const lastUsed = this.cooldowns.get(message.userId) || 0;
    if (now - lastUsed < this.commandCooldown) {
      const cooldownMsg = this.getRandomMessage(this.cooldownMessages, message.userName);
      this.log(`Рулетка еще не остыла для пользователя`, message.userId, message.userName);
      return {
        accepted: false,
        message: { ...message },
        actions: [
          { type: ActionTypes.SEND_MESSAGE, payload: { message: cooldownMsg, forwardToUi: true } },
        ],
      };
    }
    this.cooldowns.set(message.userId, now);
    const actions: any[] = [];
    if (this.checkRouletteWin()) {
      const prepared = await this.roleManager.prepareMute(
          message.userId,
          message.userName,
          this.muteDuration,
          message.roles
      );
      if (!prepared) {
        return {
          accepted: true,
          message: { ...message },
          actions: [
            {
              type: ActionTypes.SEND_MESSAGE,
              payload: {
                message: `@${message.userName}, ты же не думаешь, что ты, что сидит за экраном, и ты здесь, в Сети - это одно и то же?`,
                forwardToUi: true
              }
            },
          ],
        };
      }

      const isEditor = this.editors.some(editor => editor.user_id === message.userId);
      const canBeMuted = !isEditor || this.allowToBanEditors;

      const reason = this.getRandomMessage(
          canBeMuted ? this.deathMessages : this.protectedUsersMessages,
          message.userName
      );

      const muteAction = {
        type: ActionTypes.MUTE_USER,
        payload: {
          userId: message.userId,
          reason,
          duration: this.muteDuration / 1000,
          userName: message.userName
        }
      };

      const messageAction = {
        type: ActionTypes.SEND_MESSAGE,
        payload: {
          message: reason,
          forwardToUi: true
        }
      };

      actions.push(messageAction);

      if (canBeMuted) {
        actions.push(muteAction);
        this.log(`Пользователь выиграл в рулетку и будет замьючен`, message.userId, message.userName);
      } else {
        this.log(`Банить Редакторов запрещено в настройках`, message.userId, message.userName);
      }

    } else {
      this.log(`Пользователь проиграл в рулетку и не будет замьючен`, message.userId, message.userName);
      const reason = this.getRandomMessage(this.survivalMessages, message.userName);
      actions.push({ type: ActionTypes.SEND_MESSAGE, payload: { message: reason, forwardToUi: true } });
    }
    return { accepted: true, message: { ...message }, actions };
  }

  public setEditors(editors: UserData[]): void {
    this.editors = editors;
  }

  private checkRouletteWin(): boolean {
    if (this.chance <= 0) return false;
    if (this.chance >= 1) return true;
    const roll = Math.random();
    console.log(`🎲 Roulette roll: ${roll} (chance: ${this.chance})`);
    return roll < this.chance;
  }

  private getRandomMessage(array: string[], username: string): string {
    const template = array[Math.floor(Math.random() * array.length)];

    let result = template.replace(/\$\{user\}/g, username)

    return applyRandomInt(result);
  }

  private log(message: string, userId?: string | null, userName?: string | null): void {
    const logMessage = {
      timestamp: new Date().toISOString(),
      message,
      userId: userId || null,
      userName: userName || null
    };
    this.logService.log(logMessage);
  }
}
