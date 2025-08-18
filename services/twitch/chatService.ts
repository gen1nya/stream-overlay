import net from 'net';
import * as authService from './authService';
import * as messageParser from './messageParser';
import {AppEvent, ChatEvent} from "./messageParser";
import {LogService} from "../logService";

const HOST = 'irc.chat.twitch.tv';
const PORT = 6667;

class ChatService {
  private client: net.Socket | null = null;
  private messageHandler: ((msg: AppEvent) => Promise<void>) | null = null;
  private isStopping = false;
  private isConnecting = false;
  private lastEventTimestamp = Date.now();
  private logger: LogService | null = null;

  constructor() {
    authService.onTokenRefreshed(() => {
      if (this.client && !this.isStopping) {
        console.log('🔄 Tokens refreshed (on auth service), reconnecting IRC...');
        this.handleAuthFailure();
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

  private async handleAuthFailure(): Promise<void> {
    console.warn('⚠️ IRC authentication failed, attempting to refresh tokens...');
    const tokens = await authService.getTokens();
    if (!tokens) {
      console.error('❌ Token refresh failed or user logged out. Stopping IRC.');
      this.stopChat();
      return;
    }
    console.log('🔄 Reconnecting to IRC with refreshed token...');
    await this.reconnect();
  }

  private async handleReconnect(): Promise<void> {
    console.log('🔁 IRC RECONNECT requested by server.');
    await this.reconnect();
  }

  private async reconnect(): Promise<void> {
    if (this.client) {
      this.client.removeAllListeners();
      this.client.destroy();
      this.client = null;
    }
    if (!this.isStopping) {
      await this.connect();
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

    const tokens = await authService.getTokens();
    if (!tokens) {
      console.error('❌ No tokens found. Cannot connect to IRC.');
      this.isConnecting = false;
      return;
    } else {
      console.log('🔑 Using access token:', JSON.stringify(tokens, null, 2));
    }

    const accessToken = tokens.access_token;
    const username = tokens.login;
    const channel = username?.toLowerCase() ?? "unknown";
    const socket = new net.Socket();
    this.client = socket;

    socket.connect(PORT, HOST, () => {
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
    });

    socket.on('data', async (data) => {
      this.lastEventTimestamp = Date.now();
      const messages = data.toString().split('\r\n');
      for (const message of messages) {
        if (!message) continue;

        if (message.startsWith('PING')) {
          socket.write('PONG :tmi.twitch.tv\r\n');
          continue;
        }

        if (/authentication failed/i.test(message)) {
          console.warn('⚠️ IRC authentication failed.');
          await this.handleAuthFailure();
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
      this.isConnecting = false;
      this.logger?.log({
        timestamp: new Date().toISOString(),
        message: 'Соединение с IRC закрыто',
        userId: null,
        userName: null
      });
      console.log('🔴 IRC Connection closed.');
    });

    socket.on('error', (err) => {
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

  stopChat(): void {
    if (this.client) {
      this.client.end();
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
}

const instance = new ChatService();

export const startChat = () => instance.startChat();
export const stopChat = () => instance.stopChat();
export const setLogger = (logger: LogService) => instance.setLogger(logger);
export const sendMessage = (msg: string) => instance.sendMessage(msg);
export const registerMessageHandler = (handler: (msg: any) => Promise<void>) => instance.registerMessageHandler(handler);
export const getLastEventTimestamp = () => instance.getLastEventTimestamp();
