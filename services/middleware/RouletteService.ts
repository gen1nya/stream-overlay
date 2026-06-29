import { ActionTypes } from './ActionTypes';
import Middleware from './Middleware';
import {applyRandomInt} from './MiddlewareProcessor';
import RoleRestoreManager from './RoleRestoreManager';
import {AppEvent} from "../twitch/messageParser";
import {LogService} from "../logService";
import {UserData} from "../twitch/types/UserData";
import {BotConfig} from "../store/StoreSchema";
import {RouletteRepository} from "../db/RouletteRepository";

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
  private allowCollabChatters: boolean = false;
  private cooldowns: Map<string, number> = new Map();
  private roleManager: RoleRestoreManager;
  private chance: number;
  private logService: LogService;
  private editors: UserData[] = [];
  private userId: string | null = "unknown";
  // Stats command
  private statsCommands: string[] = ['!roulette-stats', '!рулетка-стат'];
  private statsMessages: string[] = [];
  // Leaderboard command
  private leaderboardCommands: string[] = ['!roulette-top', '!рулетка-топ'];
  private leaderboardMessages: string[] = [];
  private leaderboardSize: number = 5;
  private repository: RouletteRepository | null = null;

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
      this.allowCollabChatters = config.roulette.allowCollabChatters || false;
      this.protectedUsersMessages = config.roulette.protectedUsersMessages;
      this.statsCommands = config.roulette.statsCommands || ['!roulette-stats', '!рулетка-стат'];
      this.statsMessages = config.roulette.statsMessages || [];
      this.leaderboardCommands = config.roulette.leaderboardCommands || ['!roulette-top', '!рулетка-топ'];
      this.leaderboardMessages = config.roulette.leaderboardMessages || [];
      this.leaderboardSize = config.roulette.leaderboardSize || 5;
      console.log('✅ RouletteService config updated');
    }

    setRepository(repository: RouletteRepository) {
      this.repository = repository;
    }

  async processMessage(message: AppEvent) {
    if (!this.enabled) {
      console.warn('⏩ RouletteService is disabled, skipping message processing');
      return { accepted: false, message: { ...message }, actions: [] };
    }
    if (message.type !== 'chat') {
      return { message, actions: [], accepted: false };
    }
    if (message.userId === null || message.userName === null) {
      console.warn('❌ Message is missing userId or userName, skipping RouletteService processing');
      return { accepted: false, message: { ...message }, actions: [] };
    }
    if (!this.allowCollabChatters && this.userId !== null && message.sourceRoomId !== null && message.sourceRoomId !== this.userId) {
      return { message, actions: [], accepted: false };
    }

    // Check for stats command first
    if (this.statsCommands.includes(message.htmlMessage)) {
      return this.handleStatsCommand(message);
    }

    // Check for leaderboard command
    if (this.leaderboardCommands.includes(message.htmlMessage)) {
      return this.handleLeaderboardCommand(message);
    }

    // Check for roulette command
    if (!this.commands.includes(message.htmlMessage)) {
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
    const isDeath = this.checkRouletteWin();

    if (isDeath) {
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

      // Record play to database
      this.recordPlay(message.userId, message.userName, 'death', canBeMuted);

    } else {
      this.log(`Пользователь проиграл в рулетку и не будет замьючен`, message.userId, message.userName);
      const reason = this.getRandomMessage(this.survivalMessages, message.userName);
      actions.push({ type: ActionTypes.SEND_MESSAGE, payload: { message: reason, forwardToUi: true } });

      // Record play to database
      this.recordPlay(message.userId, message.userName, 'survival', false);
    }
    return { accepted: true, message: { ...message }, actions };
  }

  private handleStatsCommand(message: AppEvent): { accepted: boolean; message: AppEvent; actions: any[] } {
    if (!this.repository) {
      return { accepted: false, message: { ...message }, actions: [] };
    }

    const stats = this.repository.getStats(message.userId!);

    if (!stats || stats.totalPlays === 0) {
      return {
        accepted: true,
        message: { ...message },
        actions: [
          {
            type: ActionTypes.SEND_MESSAGE,
            payload: {
              message: `@${message.userName}, у тебя пока нет статистики рулетки. Попробуй сыграть!`,
              forwardToUi: true
            }
          }
        ]
      };
    }

    const survivalRate = ((stats.survivals / stats.totalPlays) * 100).toFixed(1);
    const streakText = this.formatStreak(stats.currentStreak);

    const template = this.statsMessages.length > 0
      ? this.statsMessages[Math.floor(Math.random() * this.statsMessages.length)]
      : "@${user} | Игр: ${plays} | Выжил: ${survivals} | Смертей: ${deaths} | Выживаемость: ${rate}% | Серия: ${streak}";

    const statsMessage = template
      .replace(/\$\{user\}/g, message.userName!)
      .replace(/\$\{plays\}/g, stats.totalPlays.toString())
      .replace(/\$\{survivals\}/g, stats.survivals.toString())
      .replace(/\$\{deaths\}/g, stats.deaths.toString())
      .replace(/\$\{rate\}/g, survivalRate)
      .replace(/\$\{streak\}/g, streakText);

    return {
      accepted: true,
      message: { ...message },
      actions: [
        {
          type: ActionTypes.SEND_MESSAGE,
          payload: {
            message: statsMessage,
            forwardToUi: true
          }
        }
      ]
    };
  }

  private formatStreak(streak: number): string {
    if (streak === 0) return '0';
    if (streak > 0) return `+${streak} выживаний`;
    return `${streak} смертей`;
  }

  private handleLeaderboardCommand(message: AppEvent): { accepted: boolean; message: AppEvent; actions: any[] } {
    if (!this.repository) {
      return { accepted: false, message: { ...message }, actions: [] };
    }

    const leaderboard = this.repository.getLeaderboard('plays', this.leaderboardSize);

    if (!leaderboard || leaderboard.length === 0) {
      return {
        accepted: true,
        message: { ...message },
        actions: [
          {
            type: ActionTypes.SEND_MESSAGE,
            payload: {
              message: `Лидерборд пока пуст. Будь первым!`,
              forwardToUi: true
            }
          }
        ]
      };
    }

    // Format leaderboard entries
    const topEntries = leaderboard.map((stat, index) => {
      const survivalRate = stat.totalPlays > 0
        ? ((stat.survivals / stat.totalPlays) * 100).toFixed(0)
        : '0';
      return `${index + 1}. ${stat.userName} (${stat.totalPlays} игр, ${survivalRate}%)`;
    }).join(' | ');

    const template = this.leaderboardMessages.length > 0
      ? this.leaderboardMessages[Math.floor(Math.random() * this.leaderboardMessages.length)]
      : "🏆 Топ рулетки: ${top}";

    const leaderboardMessage = template.replace(/\$\{top\}/g, topEntries);

    return {
      accepted: true,
      message: { ...message },
      actions: [
        {
          type: ActionTypes.SEND_MESSAGE,
          payload: {
            message: leaderboardMessage,
            forwardToUi: true
          }
        }
      ]
    };
  }

  private recordPlay(userId: string, userName: string, result: 'survival' | 'death', wasMuted: boolean): void {
    if (!this.repository) {
      console.warn('⚠️ RouletteRepository not set, skipping play recording');
      return;
    }
    try {
      this.repository.recordPlay({ userId, userName, result, wasMuted });
    } catch (error) {
      console.error('❌ Failed to record roulette play:', error);
    }
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

  onUserIdUpdated(userId: string | null) {
    this.userId = userId
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
