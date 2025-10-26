import WebSocket from 'ws';
import axios, { AxiosError } from 'axios';
import * as authService from './authService';
import { Tokens } from './authService';
import MESSAGE_TYPES from './types/eventSubMessageTypes';
import { AppEvent, FollowEvent, RedeemEvent } from './messageParser';
import { LogService } from '../logService';

// ============================================================================
// Configuration
// ============================================================================
const CONFIG = {
  CLIENT_ID: process.env.TWITCH_CLIENT_ID || '1khb6hwbhh9qftsry0gnkm2eeayipc',
  WS_URL: process.env.EVENTSUB_WS_URL || 'wss://eventsub.wss.twitch.tv/ws',
  API_BASE_URL: 'https://api.twitch.tv/helix',
  HEALTH_CHECK_INTERVAL: 60_000,
  INACTIVITY_THRESHOLD: 360_000,
  DEDUP_TTL_MS: 300_000,
  RECONNECT_DELAY: 5000,
  RESTART_DELAY: 1000,
  MAX_DEDUP_SIZE: 5000,
  DEDUP_CLEANUP_SIZE: 4000,
} as const;

// ============================================================================
// Types
// ============================================================================
type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

interface SubscriptionConfig {
  version: string;
  condition: (broadcasterId: string) => Record<string, string>;
}

interface SubscriptionDefinitions {
  [key: string]: SubscriptionConfig;
}

interface TwitchMessage {
  metadata: {
    message_id?: string;
    message_type: string;
  };
  payload: {
    session?: {
      id: string;
      reconnect_url?: string;
    };
    subscription?: {
      type: string;
    };
    event?: any;
  };
}

interface TwitchSubscription {
  type: string;
  status: string;
  condition: Record<string, any>;
  transport: {
    session_id?: string;
  };
}

interface StopOptions {
  setStopping?: boolean;
  ignoreClose?: boolean;
}

// ============================================================================
// Constants
// ============================================================================
export const EVENT_CHANEL = 'event';
export const EVENT_FOLLOW = 'follow';
export const EVENT_REDEMPTION = 'redemption';
export const EVENT_BROADCASTING = 'broadcasting';

const KNOWN_MESSAGE_TYPES = Object.values(MESSAGE_TYPES);

// ============================================================================
// Utility Functions
// ============================================================================
function generateConnectionId(): string {
  return `eventsub_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function createStableKey(obj: any): string {
  if (!obj || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  const sorted: Record<string, any> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return JSON.stringify(sorted);
}

function formatFollowEvent(event: any): FollowEvent {
  return {
    timestamp: Date.now(),
    id: `follow_${Date.now()}_${event.user_id}`,
    type: 'follow',
    userId: event.user_id,
    userLogin: event.user_login,
    userName: event.user_name,
    followedAt: event.followed_at,
    userNameRaw: event.user_login,
  };
}

function formatRedeemEvent(event: any): RedeemEvent {
  return {
    timestamp: Date.now(),
    id: `redemption_${Date.now()}_${event.user_id}_${event.reward.id}`,
    type: 'redemption',
    userId: event.user_id,
    userLogin: event.user_login,
    userName: event.user_name,
    reward: event.reward,
    userNameRaw: event.user_login,
  };
}

// ============================================================================
// Subscription Definitions
// ============================================================================
const SUBSCRIPTION_DEFINITIONS: SubscriptionDefinitions = {
  'channel.raid': {
    version: '1',
    condition: (id) => ({ to_broadcaster_user_id: id }),
  },
  'channel.bits.use': {
    version: '1',
    condition: (id) => ({ broadcaster_user_id: id }),
  },
  'channel.subscribe': {
    version: '1',
    condition: (id) => ({ broadcaster_user_id: id }),
  },
  'channel.channel_points_custom_reward_redemption.add': {
    version: '1',
    condition: (id) => ({ broadcaster_user_id: id }),
  },
  'channel.follow': {
    version: '2',
    condition: (id) => ({
      broadcaster_user_id: id,
      moderator_user_id: id,
    }),
  },
  'stream.online': {
    version: '1',
    condition: (id) => ({ broadcaster_user_id: id }),
  },
  'stream.offline': {
    version: '1',
    condition: (id) => ({ broadcaster_user_id: id }),
  },
};

// ============================================================================
// EventSubService Class
// ============================================================================
let globalInstance: EventSubService | null = null;

class EventSubService {
  private ws: WebSocket | null = null;
  private eventHandler: ((dest: string, payload: any) => void) | null = null;
  private logger: LogService | null = null;

  private isStopping = false;
  private isConnecting = false;
  private ignoreClose = false;

  private connectUrl = CONFIG.WS_URL;
  private skipSubscribe = false;
  private lastEventTimestamp = Date.now();
  private connectionId: string;

  private healthCheckTimer: NodeJS.Timeout | null = null;
  private connectEpoch = 0;
  private restarting = false;
  private restartQueued = false;

  private seenMessageIds = new Map<string, number>();

  constructor() {
    if (globalInstance) {
      throw new Error('EventSubService already started!');
    }
    globalInstance = this;
    this.connectionId = generateConnectionId();
    console.log(`🔷 EventSub instance created with ID: ${this.connectionId}`);

    this.setupProcessHandlers();
    this.initializeService();
  }

  // --------------------------------------------------------------------------
  // Public Methods
  // --------------------------------------------------------------------------

  registerEventHandlers(handler: (dest: string, payload: any) => void): void {
    this.eventHandler = handler;
  }

  setLogger(logger: LogService): void {
    this.logger = logger;
  }

  async start(url = CONFIG.WS_URL, skipSub = false): Promise<void> {
    this.validateInstance();

    this.isStopping = false;
    this.connectUrl = url;
    this.skipSubscribe = skipSub;

    if (this.isWebSocketActive()) {
      console.log(`ℹ️ [${this.connectionId}] WebSocket already connected.`);
      return;
    }

    if (this.isConnecting) {
      console.log(`⏳ [${this.connectionId}] Connection already in progress.`);
      return;
    }

    await this.establishConnection();
  }

  stop(options: StopOptions = {}): void {
    const { setStopping = true, ignoreClose = false } = options;
    console.log(`🛑 [${this.connectionId}] Stopping EventSub...`);

    if (this.ws) {
      this.ignoreClose = ignoreClose;
      this.ws.close();
      this.ws = null;
    }

    if (setStopping) {
      this.isStopping = true;
    }

    this.isConnecting = false;
    this.clearHealthCheck();
  }

  getLastEventTimestamp(): number {
    return this.lastEventTimestamp;
  }

  getConnectionId(): string {
    return this.connectionId;
  }

  static getInstance(): EventSubService | null {
    return globalInstance;
  }

  static hasActiveInstance(): boolean {
    return globalInstance !== null;
  }

  // --------------------------------------------------------------------------
  // Private Methods - Initialization
  // --------------------------------------------------------------------------

  private setupProcessHandlers(): void {
    const cleanup = () => this.cleanup();
    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  private initializeService(): void {
    authService.onTokenRefreshed(() => {
      if (!this.isStopping) {
        console.log(`🔄 [${this.connectionId}] Tokens refreshed, restarting...`);
        this.safeRestart();
      }
    });
    this.startHealthCheck();
  }

  private validateInstance(): void {
    if (globalInstance !== this) {
      throw new Error(`Attempt to start inactive instance ${this.connectionId}`);
    }
  }

  // --------------------------------------------------------------------------
  // Private Methods - Connection Management
  // --------------------------------------------------------------------------

  private async establishConnection(): Promise<void> {
    this.isConnecting = true;
    const myEpoch = ++this.connectEpoch;

    const tokens = await this.getValidTokens();
    if (!tokens) {
      this.isConnecting = false;
      return;
    }

    const ws = new WebSocket(this.connectUrl);
    this.ws = ws;

    this.setupWebSocketHandlers(ws, myEpoch);
  }

  private setupWebSocketHandlers(ws: WebSocket, epoch: number): void {
    ws.on('open', () => this.handleOpen(ws, epoch));
    ws.on('ping', () => this.handlePing(ws));
    ws.on('message', (data) => this.handleMessage(data, epoch));
    ws.on('close', () => this.handleClose(epoch));
    ws.on('error', (err) => this.handleError(err));
  }

  private isWebSocketActive(): boolean {
    return (
        this.ws !== null &&
        (this.ws.readyState === WebSocket.OPEN ||
            this.ws.readyState === WebSocket.CONNECTING)
    );
  }

  private async safeRestart(): Promise<void> {
    if (this.restarting) {
      this.restartQueued = true;
      return;
    }

    this.restarting = true;
    console.log(`🔄 [${this.connectionId}] Safe restart...`);

    const oldIgnoreClose = this.ignoreClose;
    this.ignoreClose = true;

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    await this.delay(CONFIG.RESTART_DELAY);

    this.ignoreClose = oldIgnoreClose;
    this.isStopping = false;
    this.isConnecting = false;

    try {
      await this.start(this.connectUrl, this.skipSubscribe);
    } finally {
      this.restarting = false;
      if (this.restartQueued) {
        this.restartQueued = false;
        await this.safeRestart();
      }
    }
  }

  // --------------------------------------------------------------------------
  // Private Methods - WebSocket Event Handlers
  // --------------------------------------------------------------------------

  private handleOpen(ws: WebSocket, epoch: number): void {
    if (!this.isCurrentEpoch(epoch)) {
      try {
        ws.close();
      } catch {}
      return;
    }

    this.isConnecting = false;
    this.lastEventTimestamp = Date.now();
    console.log(`🟢 [${this.connectionId}] Connected to Twitch EventSub`);

    this.log('Соединение с EventSub установлено');
  }

  private handlePing(ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.pong();
    }
  }

  private async handleMessage(data: WebSocket.Data, epoch: number): Promise<void> {
    if (!this.isCurrentEpoch(epoch)) {
      return;
    }

    this.lastEventTimestamp = Date.now();

    try {
      const message: TwitchMessage = JSON.parse(data.toString());
      const { metadata, payload } = message;

      if (this.isDuplicateMessage(metadata.message_id)) {
        console.log(`↩️ [${this.connectionId}] Duplicate message ${metadata.message_id} ignored`);
        return;
      }

      await this.processMessage(metadata.message_type as MessageType, payload);
    } catch (error) {
      console.error(`❌ [${this.connectionId}] Error processing message:`, error);
    }
  }

  private handleClose(epoch: number): void {
    if (!this.isCurrentEpoch(epoch)) {
      return;
    }

    this.isConnecting = false;
    console.log(`🔴 [${this.connectionId}] Connection closed`);
    this.log('Соединение с EventSub закрыто');

    if (!this.ignoreClose && !this.isStopping && globalInstance === this) {
      setTimeout(() => this.start(), CONFIG.RECONNECT_DELAY);
    }

    this.ignoreClose = false;
  }

  private handleError(err: Error): void {
    this.isConnecting = false;
    this.log(`Ошибка WebSocket: ${err.message}`);
    console.error(`❌ [${this.connectionId}] WebSocket Error:`, err);
  }

  // --------------------------------------------------------------------------
  // Private Methods - Message Processing
  // --------------------------------------------------------------------------

  private async processMessage(messageType: MessageType, payload: any): Promise<void> {
    switch (messageType) {
      case MESSAGE_TYPES.NOTIFICATION:
        this.handleNotification(payload);
        break;

      case MESSAGE_TYPES.SESSION_WELCOME:
        await this.handleSessionWelcome(payload);
        break;

      case MESSAGE_TYPES.SESSION_KEEPALIVE:
        console.log(`💓 [${this.connectionId}] Keep-alive received`);
        break;

      case MESSAGE_TYPES.SESSION_RECONNECT:
        await this.handleReconnect(payload);
        break;

      case MESSAGE_TYPES.REVOCATION:
        console.warn(`⚠️ [${this.connectionId}] Subscription revoked:`, payload);
        break;

      default:
        if (!KNOWN_MESSAGE_TYPES.includes(messageType)) {
          console.log(`❓ [${this.connectionId}] Unknown message type:`, messageType);
        }
    }
  }

  private handleNotification(payload: any): void {
    const { subscription, event } = payload;

    switch (subscription.type) {
      case 'channel.follow':
        this.handleFollowEvent(event);
        break;

      case 'channel.channel_points_custom_reward_redemption.add':
        this.handleRedemptionEvent(event);
        break;

      case 'stream.online':
        this.handleOnlineEvent(event);
        break;

      case 'stream.offline':
        this.handleOfflineEvent(event);
        break;

      default:
        console.warn(`⚠️ [${this.connectionId}] Unhandled subscription type: ${subscription.type}, event:`, event);
        break;
    }
  }

  private handleFollowEvent(event: any): void {
    console.log(`🎉 [${this.connectionId}] Новый фолловер: ${event.user_name}`);

    const followEvent = formatFollowEvent(event);
    this.log('Новый фолловер', event.user_id, event.user_name);
    this.eventHandler?.(`${EVENT_CHANEL}:${EVENT_FOLLOW}`, followEvent);
  }

  private handleRedemptionEvent(event: any): void {
    const { reward } = event;
    console.log(`🎉 [${this.connectionId}] Потрачены балы: ${reward.title}`);

    const redeemEvent = formatRedeemEvent(event);
    this.log(
        `Потрачены балы (${reward.cost}) на: ${reward.title}`,
        event.user_id,
        event.user_name
    );
    this.eventHandler?.(`${EVENT_CHANEL}:${EVENT_REDEMPTION}`, redeemEvent);
  }

  private handleOnlineEvent(event: any): void {
    console.log(`📡 [${this.connectionId}] Stream is live: ${event.broadcaster_user_name}`);
    this.log(
        `Стрим начался: ${event.broadcaster_user_name}`,
        event.user_id,
        event.user_name
    );
    this.eventHandler?.(`status:${EVENT_BROADCASTING}`, { type: "broadcast", isOnline: true });
  }

  private handleOfflineEvent(event: any): void {
    console.log(`📴 [${this.connectionId}] Stream has ended: ${event.broadcaster_user_name}`);
    this.log(
        `Стрим окончен: ${event.broadcaster_user_name}`,
        event.user_id,
        event.user_name
    );
    this.eventHandler?.(`status:${EVENT_BROADCASTING}`, { type: "broadcast", isOnline: false });
  }

  private async handleSessionWelcome(payload: any): Promise<void> {
    const sessionId = payload.session.id;
    console.log(`📡 [${this.connectionId}] Session started, ID:`, sessionId);

    if (!this.skipSubscribe) {
      await this.subscribeToEvents(sessionId);
    }
    this.skipSubscribe = false;
  }

  private async handleReconnect(payload: any): Promise<void> {
    const newUrl = payload.session.reconnect_url;
    console.log(`🔄 [${this.connectionId}] Reconnect requested:`, newUrl);
    this.stop({ setStopping: false, ignoreClose: true });
    await this.start(newUrl, true);
  }

  // --------------------------------------------------------------------------
  // Private Methods - Subscription Management
  // --------------------------------------------------------------------------

  private async subscribeToEvents(sessionId: string): Promise<void> {
    const tokens = await this.getValidTokens();
    if (!tokens) {
      this.stop();
      return;
    }

    const existingKeys = await this.fetchExistingSubscriptions(sessionId, tokens.access_token);

    for (const [type, config] of Object.entries(SUBSCRIPTION_DEFINITIONS)) {
      await this.subscribeToEvent(type, config, sessionId, tokens, existingKeys);
    }
  }

  private async fetchExistingSubscriptions(
      sessionId: string,
      accessToken: string
  ): Promise<Set<string>> {
    try {
      const response = await axios.get<{ data: TwitchSubscription[] }>(
          `${CONFIG.API_BASE_URL}/eventsub/subscriptions`,
          {
            headers: {
              'Client-ID': CONFIG.CLIENT_ID,
              Authorization: `Bearer ${accessToken}`,
            },
          }
      );

      const subscriptions = response.data?.data || [];
      const keys = subscriptions
          .filter((s) => s.status === 'enabled' && s.transport?.session_id === sessionId)
          .map((s) => `${s.type}|${createStableKey(s.condition)}`);

      const existingKeys = new Set(keys);
      console.log(
          `ℹ️ [${this.connectionId}] Existing subs for session ${sessionId}: ${existingKeys.size}`
      );

      return existingKeys;
    } catch (error: any) {
      console.warn(
          `⚠️ [${this.connectionId}] Could not fetch existing subscriptions:`,
          error?.response?.data || error?.message
      );
      return new Set();
    }
  }

  private async subscribeToEvent(
      type: string,
      config: SubscriptionConfig,
      sessionId: string,
      tokens: Tokens,
      existingKeys: Set<string>
  ): Promise<void> {
    if (!config?.condition || typeof config.condition !== 'function' || !config.version) {
      console.warn(`⚠️ [${this.connectionId}] Invalid subscription config for ${type}`);
      return;
    }

    if (!tokens.user_id) {
      console.error(`❌ [${this.connectionId}] User ID not found in tokens`);
      return;
    }

    const conditionData = config.condition(tokens.user_id);
    const key = `${type}|${createStableKey(conditionData)}`;

    if (existingKeys.has(key)) {
      console.log(
          `⭐️ [${this.connectionId}] Already subscribed to ${type} with same condition; skipping`
      );
      return;
    }

    try {
      await this.createSubscription(type, config.version, conditionData, sessionId, tokens.access_token);
      console.log(`✅ [${this.connectionId}] Subscribed to ${type}`);
      this.log(`Отслеживание события ${type} запущено`);
    } catch (error) {
      await this.handleSubscriptionError(error, type, sessionId);
    }
  }

  private async createSubscription(
      type: string,
      version: string,
      condition: Record<string, string>,
      sessionId: string,
      accessToken: string
  ): Promise<void> {
    await axios.post(
        `${CONFIG.API_BASE_URL}/eventsub/subscriptions`,
        {
          type,
          version,
          condition,
          transport: {
            method: 'websocket',
            session_id: sessionId,
          },
        },
        {
          headers: {
            'Client-ID': CONFIG.CLIENT_ID,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
    );
  }

  private async handleSubscriptionError(
      error: unknown,
      type: string,
      sessionId: string
  ): Promise<void> {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    if (status === 401 && !this.isStopping) {
      console.warn(`⚠️ [${this.connectionId}] Unauthorized, refreshing...`);
      const refreshed = await authService.getTokens();

      if (!refreshed) {
        this.log(`Ошибка обновления токенов при подписке на ${type}`);
        console.error(`❌ [${this.connectionId}] Token refresh failed.`);
        this.stop();
        return;
      }

      await this.subscribeToEvents(sessionId);
      return;
    }

    const message = axiosError.message || 'Unknown error';
    this.log(`Ошибка подписки на ${type}: ${message}`);
    console.error(
        `❌ [${this.connectionId}] Failed to subscribe to ${type}:`,
        axiosError.response?.data || message
    );
  }

  // --------------------------------------------------------------------------
  // Private Methods - Health Check
  // --------------------------------------------------------------------------

  private startHealthCheck(): void {
    this.clearHealthCheck();

    this.healthCheckTimer = setInterval(() => {
      if (globalInstance !== this) {
        console.error(`❌ [${this.connectionId}] Another instance detected! Stopping.`);
        this.stop();
        return;
      }

      const inactivity = Date.now() - this.lastEventTimestamp;
      if (
          inactivity > CONFIG.INACTIVITY_THRESHOLD &&
          !this.isConnecting &&
          !this.isStopping
      ) {
        console.warn(`⚠️ [${this.connectionId}] No activity detected, restarting...`);
        this.safeRestart();
      }
    }, CONFIG.HEALTH_CHECK_INTERVAL);
  }

  private clearHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  // --------------------------------------------------------------------------
  // Private Methods - Deduplication
  // --------------------------------------------------------------------------

  private isDuplicateMessage(id?: string): boolean {
    if (!id) {
      return false;
    }

    const now = Date.now();
    this.cleanupOldMessages(now);

    if (this.seenMessageIds.has(id)) {
      return true;
    }

    this.seenMessageIds.set(id, now);
    this.capMessageMapSize();

    return false;
  }

  private cleanupOldMessages(now: number): void {
    for (const [id, timestamp] of this.seenMessageIds) {
      if (now - timestamp > CONFIG.DEDUP_TTL_MS) {
        this.seenMessageIds.delete(id);
      }
    }
  }

  private capMessageMapSize(): void {
    if (this.seenMessageIds.size > CONFIG.MAX_DEDUP_SIZE) {
      const entries = Array.from(this.seenMessageIds.entries()).sort(
          (a, b) => a[1] - b[1]
      );
      const toRemove = entries.length - CONFIG.DEDUP_CLEANUP_SIZE;

      for (let i = 0; i < toRemove; i++) {
        this.seenMessageIds.delete(entries[i][0]);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Private Methods - Utilities
  // --------------------------------------------------------------------------

  private async getValidTokens(): Promise<Tokens | null> {
    const tokens = await authService.getTokens();
    if (!tokens) {
      console.error(`❌ [${this.connectionId}] No tokens found.`);
      return null;
    }
    if (!tokens.user_id) {
      console.error(`❌ [${this.connectionId}] User ID not found in tokens.`);
      return null;
    }
    return tokens;
  }

  private isCurrentEpoch(epoch: number): boolean {
    return epoch === this.connectEpoch;
  }

  private log(message: string, userId: string | null = null, userName: string | null = null): void {
    this.logger?.log({
      timestamp: new Date().toISOString(),
      message,
      userId,
      userName,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private cleanup(): void {
    console.log(`🧹 [${this.connectionId}] Cleaning up...`);
    this.stop();
    if (globalInstance === this) {
      globalInstance = null;
    }
  }

  registerLogoutHandler(handler: () => void): void {
    authService.onLogout(() => {
      handler();
    });
  }
}

// ============================================================================
// Module Instance Management
// ============================================================================
let instance: EventSubService | null = null;

function createInstance(): EventSubService | null {
  if (instance) {
    console.warn('⚠️ Попытка создать второй инстанс EventSub. Используется существующий.');
    return instance;
  }

  try {
    instance = new EventSubService();
    return instance;
  } catch (error: any) {
    console.error('❌ Ошибка создания EventSub инстанса:', error.message);
    return null;
  }
}

if (!instance) {
  instance = createInstance();
}

// ============================================================================
// Module Exports
// ============================================================================
export const start = (...args: any[]) => instance?.start(...args);
export const stop = (...args: any[]) => instance?.stop(...args);
export const registerEventHandlers = (handler: (dest: string, payload: AppEvent) => void) =>
    instance?.registerEventHandlers(handler);
export const registerLogoutHandler = (handler: () => void) => instance?.registerLogoutHandler(handler);
export const getLastEventTimestamp = () => instance?.getLastEventTimestamp();
export const setLogger = (logger: LogService) => instance?.setLogger(logger);
export const getConnectionId = () => instance?.getConnectionId();
export const getInstance = () => instance;
export const hasActiveInstance = () => EventSubService.hasActiveInstance();