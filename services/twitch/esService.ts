import WebSocket from 'ws';
import axios from 'axios';
import * as authService from './authService';
import MESSAGE_TYPES from './types/eventSubMessageTypes';
import {AppEvent, FollowEvent, ParserRedeemMessage, RedeemEvent} from "./messageParser";
import {LogService} from "../logService";

const knownTypes = Object.values(MESSAGE_TYPES);
const CLIENT_ID = '1khb6hwbhh9qftsry0gnkm2eeayipc';
const DEFAULT_URL = 'wss://eventsub.wss.twitch.tv/ws';
const HEALTH_CHECK_INTERVAL = 60 * 1000;
const INACTIVITY_THRESHOLD = 6 * 60 * 1000;

const DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes for message-id dedup


export const EVENT_CHANEL = "event";
export const EVENT_FOLLOW = "follow";
export const EVENT_REDEMPTION = "redemption";

let globalLock: EventSubService | null = null;

class EventSubService {
  private ws: WebSocket | null = null;
  private eventHandler: ((dest: string, payload: any) => void) | null = null;
  private isStopping = false;
  private isConnecting = false;
  private connectUrl = DEFAULT_URL;
  private skipSubscribe = false;
  private ignoreClose = false;
  private lastEventTimestamp = Date.now();
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private connectionId: string;
  private logger: LogService | null = null;
  private seenMessageIds: Map<string, number> = new Map();

  private isDuplicateMessage(id: string): boolean {
    const now = Date.now();
    // prune old ids
    for (const [k, t] of this.seenMessageIds) {
      if (now - t > DEDUP_TTL_MS) this.seenMessageIds.delete(k);
    }
    if (!id) return false;
    if (this.seenMessageIds.has(id)) return true;
    this.seenMessageIds.set(id, now);
    return false;
  }


  constructor() {
    if (globalLock) {
      throw new Error('EventSubService already started!');
    }
    globalLock = this;
    this.connectionId = this.generateConnectionId();
    console.log(`🔐 EventSub instance created with ID: ${this.connectionId}`);
    this.initializeService();
  }

  private generateConnectionId(): string {
    return `eventsub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  private startHealthCheck(): void {
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    this.healthCheckTimer = setInterval(() => {
      if (globalLock !== this) {
        console.error(`❌ [${this.connectionId}] Another instance detected! Stopping.`);
        this.stop();
        return;
      }
      const inactivity = Date.now() - this.lastEventTimestamp;
      if (inactivity > INACTIVITY_THRESHOLD && !this.isConnecting && !this.isStopping) {
        console.warn(`⚠️ [${this.connectionId}] No activity detected, restarting...`);
        this.safeRestart();
      }
    }, HEALTH_CHECK_INTERVAL);
  }

  private async safeRestart(): Promise<void> {
    console.log(`🔄 [${this.connectionId}] Safe restart...`);
    const oldIgnoreClose = this.ignoreClose;
    this.ignoreClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.ignoreClose = oldIgnoreClose;
    this.isStopping = false;
    this.isConnecting = false;
    await this.start();
  }

  registerEventHandlers(handler: (dest: string, payload: any) => void): void {
    this.eventHandler = handler;
  }

  async start(url = DEFAULT_URL, skipSub = false): Promise<void> {
    if (globalLock !== this) {
      throw new Error(`Attempt to start inactive instance ${this.connectionId}`);
    }
    this.isStopping = false;
    this.connectUrl = url;
    this.skipSubscribe = skipSub;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log(`ℹ️ [${this.connectionId}] WebSocket already connected.`);
      return;
    }
    if (this.isConnecting) {
      console.log(`⏳ [${this.connectionId}] Connection already in progress.`);
      return;
    }
    this.isConnecting = true;
    const tokens = await authService.getTokens();
    if (!tokens) {
      console.error(`❌ [${this.connectionId}] No tokens found.`);
      this.isConnecting = false;
      return;
    }
    const ws = new WebSocket(this.connectUrl);
    this.ws = ws;
    ws.on('open', () => {
      this.isConnecting = false;
      this.lastEventTimestamp = Date.now();
      console.log(`🟢 [${this.connectionId}] Connected to Twitch EventSub`);
      this.logger?.log({
        timestamp: new Date().toISOString(),
        message: 'Соединение с EventSub установлено',
        userId: null,
        userName: null
      });
    });
    ws.on('ping', function () {
      if (this.readyState === WebSocket.OPEN) {
        this.pong();
      }
    });
    ws.on('message', async (data) => {
      this.lastEventTimestamp = Date.now();
      const msg = JSON.parse(data.toString());
      const { metadata, payload } = msg;
      // Deduplicate at-least-once deliveries using message_id
      const messageId: string | undefined = metadata?.message_id;
      if (this.isDuplicateMessage(messageId || '')) {
        console.log(`↩️ [${this.connectionId}] Duplicate message ${messageId} ignored`);
        return;
      }
      if (metadata.message_type === MESSAGE_TYPES.NOTIFICATION) {
        const event = payload.event;
        if (payload.subscription.type === 'channel.follow') {
          console.log(`🎉 [${this.connectionId}] Новый фолловер: ${event.user_name}`);
          const followEvent: FollowEvent = {
            timestamp: Date.now(),
            id: `follow_${Date.now()}_${event.user_id}`,
            type: 'follow',
            userId: event.user_id,
            userLogin: event.user_login,
            userName: event.user_name,
            followedAt: event.followed_at,
          };
          this.logger?.log({
            timestamp: new Date().toISOString(),
            message: `Новый фолловер`,
            userId: event.user_id,
            userName: event.user_name
          });
          this.eventHandler?.(`${EVENT_CHANEL}:${EVENT_FOLLOW}`, followEvent);
        }
        if (payload.subscription.type === 'channel.channel_points_custom_reward_redemption.add') {
          const reward = payload.event.reward;
          console.log(`🎉 [${this.connectionId}] потрачены балы: ${reward.title}`);
          const redeemEvent: RedeemEvent = {
            timestamp: Date.now(),
            id: `redemption_${Date.now()}_${event.user_id}_${event.reward.id}`,
            type: 'redemption',
            userId: event.user_id,
            userLogin: event.user_login,
            userName: event.user_name,
            reward: reward,
          };
          this.logger?.log({
            timestamp: new Date().toISOString(),
            message: `Потрачены балы (${reward.cost}) на : ${reward.title}`,
            userId: event.user_id,
            userName: event.user_name
          });
          this.eventHandler?.(`${EVENT_CHANEL}:${EVENT_REDEMPTION}`, redeemEvent);
        }
      }
      if (metadata.message_type === MESSAGE_TYPES.SESSION_WELCOME) {
        const sessionId = payload.session.id;
        console.log(`📡 [${this.connectionId}] Session started, ID:`, sessionId);
        if (!this.skipSubscribe) {
          await this.subscribeToEvents(sessionId);
        }
        this.skipSubscribe = false;
      }
      if (metadata.message_type === MESSAGE_TYPES.SESSION_KEEPALIVE) {
        console.log(`💓 [${this.connectionId}] Keep-alive received`);
      }
      if (metadata.message_type === MESSAGE_TYPES.SESSION_RECONNECT) {
        const newUrl = payload.session.reconnect_url;
        console.log(`🔄 [${this.connectionId}] Reconnect requested:`, newUrl);
        this.stop({ setStopping: false, ignoreClose: true });
        this.start(newUrl, true);
      }
      if (metadata.message_type === MESSAGE_TYPES.REVOCATION) {
        console.warn(`⚠️ [${this.connectionId}] Subscription revoked:`, payload);
      }
      if (!knownTypes.includes(metadata.message_type)) {
        console.log(`❓ [${this.connectionId}] Unknown message type:`, metadata.message_type);
      }
    });
    ws.on('close', () => {
      this.isConnecting = false;
      console.log(`🔴 [${this.connectionId}] Connection closed`);
      this.logger?.log({
        timestamp: new Date().toISOString(),
        message: 'Соединение с EventSub закрыто',
        userId: null,
        userName: null
      });
      if (!this.ignoreClose && !this.isStopping && globalLock === this) {
        setTimeout(() => this.start(), 5000);
      }
      this.ignoreClose = false;
    });
    ws.on('error', (err) => {
      this.isConnecting = false;
      this.logger?.log({
        timestamp: new Date().toISOString(),
        message: `Ошибка WebSocket: ${err.message}`,
        userId: null,
        userName: null
      });
      console.error(`❌ [${this.connectionId}] WebSocket Error:`, err);
    });
  }

  private async subscribeToEvents(sessionId: string): Promise<void> {
    const tokens = await authService.getTokens();
    const broadcasterId = tokens ? tokens.user_id : null;
    const accessToken = tokens ? tokens.access_token : null;
    if (!accessToken || !broadcasterId) {
      console.error(`❌ [${this.connectionId}] Tokens unavailable.`);
      this.stop();
      return;
    }
    // Fetch existing subscriptions for this session to avoid duplicates
    let existingKeys = new Set<string>();
    try {
      const existing = await axios.get(
          'https://api.twitch.tv/helix/eventsub/subscriptions',
          { headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${accessToken}` } }
      );
      const stable = (obj: any) => {
        if (!obj || typeof obj !== 'object') return JSON.stringify(obj);
        const out: any = {};
        for (const k of Object.keys(obj).sort()) out[k] = obj[k];
        return JSON.stringify(out);
      };
      existingKeys = new Set(
          (existing.data?.data || [])
              .filter((s: any) => s.status === 'enabled' && s.transport?.session_id === sessionId)
              .map((s: any) => `${s.type}|${stable(s.condition)}`)
      );
      console.log(`ℹ️ [${this.connectionId}] Existing subs for session ${sessionId}: ${existingKeys.size}`);
    } catch (e: any) {
      console.warn(`⚠️ [${this.connectionId}] Could not fetch existing subscriptions:`, e.response?.data || e.message);
    }
    const subscriptions: Record<string, { version: string; condition: (id: string) => any }> = {
      'channel.raid': { version: '1', condition: (id) => ({ to_broadcaster_user_id: id }) },
      'channel.bits.use': { version: '1', condition: (id) => ({ broadcaster_user_id: id }) },
      'channel.subscribe': { version: '1', condition: (id) => ({ broadcaster_user_id: id }) },
      'channel.channel_points_custom_reward_redemption.add': { version: '1', condition: (id) => ({ broadcaster_user_id: id }) },
      'channel.follow': {
        version: '2',
        condition: (id) => ({ broadcaster_user_id: id, moderator_user_id: id }),
      },
    };
    for (const [type, sub] of Object.entries(subscriptions)) {
      if (!sub || typeof sub.condition !== 'function' || !sub.version) {
        console.warn(`⚠️ [${this.connectionId}] Invalid subscription config for ${type}`);
        continue;
      }
      const conditionData = sub.condition(broadcasterId!);
      // Skip if already have this exact subscription for this session
      const stable = (obj: any) => {
        if (!obj || typeof obj !== 'object') return JSON.stringify(obj);
        const out: any = {};
        for (const k of Object.keys(obj).sort()) out[k] = obj[k];
        return JSON.stringify(out);
      };
      const key = `${type}|${stable(conditionData)}`;
      if (existingKeys.has(key)) {
        console.log(`⏭️ [${this.connectionId}] Already subscribed to ${type} with same condition; skipping`);
        continue;
      }
      try {
        await axios.post(
            'https://api.twitch.tv/helix/eventsub/subscriptions',
            {
              type,
              version: sub.version,
              condition: conditionData,
              transport: { method: 'websocket', session_id: sessionId },
            },
            {
              headers: {
                'Client-ID': CLIENT_ID,
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
        );
        console.log(`✅ [${this.connectionId}] Subscribed to ${type}`);
        this.logger?.log({
          timestamp: new Date().toISOString(),
          message: `Отслеживание события ${type} запущено`,
          userId: null,
          userName: null
        });
      } catch (error: any) {
        const status = error.response?.status;
        if (status === 401 && !this.isStopping) {
          console.warn(`⚠️ [${this.connectionId}] Unauthorized, refreshing...`);
          const refreshed = await authService.getTokens();
          if (!refreshed) {
            this.logger?.log({
              timestamp: new Date().toISOString(),
              message: `Ошибка обновления токенов при подписке на ${type}`,
              userId: null,
              userName: null
            });
            console.error(`❌ [${this.connectionId}] Token refresh failed.`);
            this.stop();
            return;
          }
          await this.subscribeToEvents(sessionId);
          return;
        }
        this.logger?.log({
          timestamp: new Date().toISOString(),
          message: `Ошибка подписки на ${type}: ${error.message}`,
          userId: null,
          userName: null
        });
        console.error(`❌ [${this.connectionId}] Failed to subscribe to ${type}:`, error.response?.data || error.message);
      }
    }
  }

  stop(options: { setStopping?: boolean; ignoreClose?: boolean } = {}): void {
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
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private cleanup(): void {
    console.log(`🧹 [${this.connectionId}] Cleaning up...`);
    this.stop();
    if (globalLock === this) {
      globalLock = null;
    }
  }

  getLastEventTimestamp(): number {
    return this.lastEventTimestamp;
  }

  getConnectionId(): string {
    return this.connectionId;
  }

  static getInstance(): EventSubService | null {
    return globalLock;
  }

  static hasActiveInstance(): boolean {
    return globalLock !== null;
  }

  setLogger(logger: LogService): void {
    this.logger = logger;
  }
}

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

export const start = (...args: any[]) => instance?.start(...args);
export const stop = (...args: any[]) => instance?.stop(...args);
export const registerEventHandlers = (handler: (dest: string, payload: AppEvent) => void) => instance?.registerEventHandlers(handler);
export const getLastEventTimestamp = () => instance?.getLastEventTimestamp();
export const setLogger = (logger: LogService) => instance?.setLogger(logger);
export const getConnectionId = () => instance?.getConnectionId();
export const getInstance = () => instance;
export const hasActiveInstance = () => EventSubService.hasActiveInstance();