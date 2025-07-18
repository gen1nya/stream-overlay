import { ActionTypes } from './ActionTypes';
import Middleware from './Middleware';
import { BotConfig } from './MiddlewareProcessor';
import RoleRestoreManager from './RoleRestoreManager';

export default class RouletteService extends Middleware {
  private commands: string[];
  private commandCooldown: number;
  private survivalMessages: string[];
  private deathMessages: string[];
  private cooldownMessages: string[];
  private muteDuration: number;
  private enabled: boolean;
  private cooldowns: Map<string, number> = new Map();
  private roleManager = new RoleRestoreManager();
  private chance: number;

  constructor(
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
      console.log('✅ RouletteService config updated:', config.roulette);
    }

  async processMessage(message: any) {
    if (!this.enabled) {
      console.warn('⏩ RouletteService is disabled, skipping message processing');
      return { accepted: false, message: { ...message }, actions: [] };
    }
    if (!this.commands.includes(message.htmlMessage)) {
      console.warn(`⏩ Message is not a roulette command, skipping`);
      return { accepted: false, message: { ...message }, actions: [] };
    }
    const now = Date.now();
    const lastUsed = this.cooldowns.get(message.userId) || 0;
    if (now - lastUsed < this.commandCooldown) {
      const cooldownMsg = this.getRandomMessage(this.cooldownMessages, message.username);
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
          message.username,
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
                message: `@${message.username}, ты же не думаешь, что ты, что сидит за экраном, и ты здесь, в Сети - это одно и то же?`,
                forwardToUi: true
              }
            },
          ],
        };
      }

      const reason = this.getRandomMessage(this.deathMessages, message.username);
      actions.push(
        { type: ActionTypes.SEND_MESSAGE, payload: { message: reason, forwardToUi: true } },
        { type: ActionTypes.MUTE_USER, payload: { userId: message.userId, reason, duration: this.muteDuration / 1000 } }
      );
    } else {
      const reason = this.getRandomMessage(this.survivalMessages, message.username);
      actions.push({ type: ActionTypes.SEND_MESSAGE, payload: { message: reason, forwardToUi: true } });
    }
    return { accepted: true, message: { ...message }, actions };
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
    return template.replace(/\$\{user\}/g, username);
  }
}
