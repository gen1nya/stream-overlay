import net from 'net';
import WebSocket from 'ws';
import * as authService from './authService';
import * as messageParser from './messageParser';
import {AppEvent, ChatEvent} from "./messageParser";
import {LogService} from "../logService";
import {ProxyService} from "../ProxyService";

const IRC_TCP_HOST = 'irc.chat.twitch.tv';
const IRC_TCP_PORT = 6667;
const IRC_WS_URL = 'wss://irc-ws.chat.twitch.tv:443';

class ChatService {
  private client: net.Socket | null = null;
  private wsClient: WebSocket | null = null;
  private useWebSocket = false; // Default to TCP
  private messageHandler: ((msg: AppEvent) => Promise<void>) | null = null;
  private isStopping = false;
  private isConnecting = false;
  private ignoreClose = false; // ← ДОБАВЛЕНО: флаг для контроля автореконнекта
  private lastEventTimestamp = Date.now();
  private logger: LogService | null = null;
  private proxyService: ProxyService | null = null;

  // Health check - ДОБАВЛЕНО
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 60_000; // 60 секунд
  private readonly INACTIVITY_THRESHOLD = 300_000; // 5 минут

  // Concurrency guards
  private connectEpoch = 0;
  private reconnecting = false;
  private reconnectQueued = false;

  constructor() {
    authService.onTokenRefreshed(() => {
      if (this.client && !this.isStopping) {
        console.log('🔄 Tokens refreshed (on auth service), reconnecting IRC...');
        this.handleAuthFailure(false);
      }
    });
  }

  registerMessageHandler(handler: (msg: AppEvent) => Promise<void>): void {
    this.messageHandler = handler;
  }

  async startChat(): Promise<void> {
    this.isStopping = false;
    if (this.client && !this.client.destroyed) {
      console.log('ℹ️ IRC already connected.');
      return;
    }
    if (this.isConnecting) {
      console.log('⏳ IRC connection already in progress.');
      return;
    }
    await this.connect();
  }

  private async handleAuthFailure(forceRefresh: boolean): Promise<void> {
    console.warn('⚠️ IRC authentication failed, attempting to refresh tokens...');
    const tokens = await authService.getTokens(forceRefresh);
    if (!tokens) {
      console.error('❌ Token refresh failed or user logged out. Stopping IRC.');
      this.stopChat();
      return;
    }
    console.log('🔄 Reconnecting to IRC with refreshed token...');
    await this.safeReconnect();
  }

  private async handleReconnect(): Promise<void> {
    console.log('🔁 IRC RECONNECT requested by server.');
    await this.safeReconnect();
  }

  async reconnect(): Promise<void> {
    return this.safeReconnect();
  }

  private handleSocketConnected(socket: net.Socket, epoch: number, accessToken: string, username: string, channel: string): void {
    if (epoch !== this.connectEpoch) {
      try { socket.destroy(); } catch {}
      return;
    }

    this.isConnecting = false;
    this.lastEventTimestamp = Date.now();
    console.log('🟢 Connected to Twitch IRC');

    this.logger?.log({
      timestamp: new Date().toISOString(),
      message: 'Подключено к IRC',
      userName: username
    });

    socket.write('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership\r\n');
    socket.write(`PASS oauth:${accessToken}\r\n`);
    socket.write(`NICK ${username}\r\n`);
    socket.write(`JOIN #${channel}\r\n`);

    this.startHealthCheck();
  }

  private async safeReconnect(): Promise<void> {
    // Coalesce concurrent reconnect requests
    if (this.reconnecting) {
      this.reconnectQueued = true;
      return;
    }
    this.reconnecting = true;
    try {
      // Force-stop current socket if any
      if (this.client) {
        this.ignoreClose = true;
        try { this.client.removeAllListeners(); } catch {}
        try { this.client.destroy(); } catch {}
        this.client = null;
      }
      // Very important: clear connecting flag so a fresh connect can proceed
      this.isConnecting = false;
      if (!this.isStopping) {
        // small delay to let OS release the port/socket
        await new Promise(res => setTimeout(res, 300));
        await this.connect();
      }
    } finally {
      this.reconnecting = false;
      if (this.reconnectQueued) {
        this.reconnectQueued = false;
        await this.safeReconnect();
      }
    }
  }

  private async connect(): Promise<void> {
    if (this.client && !this.client.destroyed) {
      console.log('ℹ️ IRC already connected.');
      return;
    }
    if (this.isConnecting) {
      console.log('⏳ IRC connection already in progress.');
      return;
    }
    this.isConnecting = true;

    // Epoch for this connection attempt
    const myEpoch = ++this.connectEpoch;

    const tokens = await authService.getTokens();
    if (!tokens) {
      console.error('❌ No tokens found. Cannot connect to IRC.');
      this.isConnecting = false;
      return;
    }

    const accessToken = tokens.access_token;
    const username = tokens.login ?? "unknown";
    const channel = username.toLowerCase();

    // Try to create connection via proxy if enabled
    let socket: net.Socket;
    try {
      if (this.proxyService?.isEnabled()) {
        console.log('🔧 IRC connecting via SOCKS proxy...');
        socket = await this.proxyService.createTcpConnection(IRC_TCP_HOST, IRC_TCP_PORT);
        this.client = socket;

        // For proxy connection, we need to manually trigger the connection callback
        this.handleSocketConnected(socket, myEpoch, accessToken, username, channel);
      } else {
        // Normal direct connection
        socket = new net.Socket();
        this.client = socket;

        socket.connect(IRC_TCP_PORT, IRC_TCP_HOST, () => {
          this.handleSocketConnected(socket, myEpoch, accessToken, username, channel);
        });
      }
    } catch (error) {
      console.error('❌ Failed to create IRC connection:', error);
      this.isConnecting = false;
      return;
    }

    socket.on('data', async (data) => {
      if (myEpoch !== this.connectEpoch) { return; }
      this.lastEventTimestamp = Date.now();
      const messages = data.toString().split('\r\n');
      for (const message of messages) {
        if (!message) continue;

        if (message.startsWith('PING')) {
          socket.write('PONG :tmi.twitch.tv\r\n');
          continue;
        }

        if (/authentication failed/i.test(message)) {
          console.warn('⚠️ IRC authentication failed. message is :', message);
          await this.handleAuthFailure(true);
          return;
        }

        const parsed = await messageParser.parseIrcMessage(message);
        if (parsed) {
          console.log('📨', 'IRC сообщение :', parsed.userName, (parsed as ChatEvent).htmlMessage);
          if (parsed.type === 'system' && parsed.rawMessage.includes('RECONNECT')) {
            await this.handleReconnect();
          }
          if (parsed.type === 'join') {
            this.logger?.log({
              timestamp: new Date().toISOString(),
              message: `Зашел в чат`,
              userName: parsed.userName
            });
          }
          if (parsed.type === 'part') {
            this.logger?.log({
              timestamp: new Date().toISOString(),
              message: `Покинул чат`,
              userName: parsed.userName
            });
          }
          if (this.messageHandler) {
            await this.messageHandler(parsed);
          }
        }
      }
    });

    socket.on('close', () => {
      if (myEpoch !== this.connectEpoch) { return; }
      this.isConnecting = false;
      this.logger?.log({
        timestamp: new Date().toISOString(),
        message: 'Соединение с IRC закрыто',
        userId: null,
        userName: null
      });
      console.log('🔴 IRC Connection closed.');

      if (!this.ignoreClose && !this.isStopping) {
        console.log('🔄 Attempting to reconnect IRC in 5 seconds...');
        setTimeout(() => this.safeReconnect(), 5000);
      }
      this.ignoreClose = false;
    });

    socket.on('error', (err) => {
      if (myEpoch !== this.connectEpoch) { return; }
      this.isConnecting = false;
      this.logger?.log({
        timestamp: new Date().toISOString(),
        message: `Ошибка IRC: ${err.message}`,
        userId: null,
        userName: null
      });
      console.error('❌ IRC Error:', err.message);
    });
  }

  private startHealthCheck(): void {
    this.clearHealthCheck();

    console.log('🔍 IRC Health check started');

    this.healthCheckTimer = setInterval(() => {
      const inactivity = Date.now() - this.lastEventTimestamp;
      const inactivitySeconds = Math.floor(inactivity / 1000);

      if (inactivity > this.INACTIVITY_THRESHOLD && !this.isConnecting && !this.isStopping) {
        console.warn(`⚠️ IRC no activity for ${inactivitySeconds}s, reconnecting...`);
        this.safeReconnect();
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private clearHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      console.log('🔍 IRC Health check stopped');
    }
  }

  stopChat(): void {
    this.ignoreClose = true;
    this.clearHealthCheck();
    if (this.client) {
      try { this.client.end(); } catch {}; try { this.client.destroy(); } catch {};
      this.client = null;
      console.log('🛑 IRC Connection terminated.');
      this.logger?.log({
        timestamp: new Date().toISOString(),
        message: 'Соединение с IRC завершено',
        userId: null,
        userName: null
      });
    }
    this.isStopping = true;
    this.isConnecting = false;
  }

  getLastEventTimestamp(): number {
    return this.lastEventTimestamp;
  }

  truncateToUtf8Bytes(str: string, maxBytes: number): string {
    const encoder = new TextEncoder();
    let result = '';
    let bytes = 0;
    for (const char of str) {
      const encoded = encoder.encode(char);
      if (bytes + encoded.length > maxBytes) break;
      bytes += encoded.length;
      result += char;
    }
    return result;
  }

  async sendMessage(message: string): Promise<void> {
    if (this.client && !this.client.destroyed) {
      const sanitizedRaw = message.replace(/[\r\n]+/g, ' ');
      const sanitized = this.truncateToUtf8Bytes(sanitizedRaw, 500);
      const channel = (await authService.getCurrentLogin())?.toLowerCase();
      this.client.write(`PRIVMSG #${channel} :${sanitized}\r\n`);
    }
  }

  setLogger(logger: LogService) {
    this.logger = logger;
  }

  setProxyService(proxyService: ProxyService) {
    this.proxyService = proxyService;
    console.log('🔧 IRC ProxyService set');
  }

  setUseWebSocket(useWebSocket: boolean) {
    if (this.useWebSocket !== useWebSocket) {
      console.log(`🔧 IRC transport changed to: ${useWebSocket ? 'WebSocket' : 'TCP'}`);
      this.useWebSocket = useWebSocket;
    }
  }

  getUseWebSocket(): boolean {
    return this.useWebSocket;
  }

  registerLogoutHandler(handler: () => void) {
    authService.onLogout(() => {
      handler();
    });
  }
}

const instance = new ChatService();

export const startChat = () => instance.startChat();
export const stopChat = () => instance.stopChat();
export const setLogger = (logger: LogService) => instance.setLogger(logger);
export const setProxyService = (proxyService: ProxyService) => instance.setProxyService(proxyService);
export const setUseWebSocket = (useWebSocket: boolean) => instance.setUseWebSocket(useWebSocket);
export const getUseWebSocket = () => instance.getUseWebSocket();
export const sendMessage = (msg: string) => instance.sendMessage(msg);
export const registerMessageHandler = (handler: (msg: any) => Promise<void>) => instance.registerMessageHandler(handler);
export const registerLogoutHandler = (handler: () => void) => instance.registerLogoutHandler(handler);
export const getLastEventTimestamp = () => instance.getLastEventTimestamp();
export const reconnect = () => instance.reconnect();