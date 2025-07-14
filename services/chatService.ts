import net from 'net';
import * as authService from './authService';
import * as messageParser from './messageParser';

const HOST = 'irc.chat.twitch.tv';
const PORT = 6667;

class ChatService {
  private client: net.Socket | null = null;
  private messageHandler: ((msg: any) => Promise<void>) | null = null;
  private isStopping = false;
  private isConnecting = false;
  private lastEventTimestamp = Date.now();

  constructor() {
    authService.onTokenRefreshed(() => {
      if (this.client && !this.isStopping) {
        console.log('🔄 Tokens refreshed, reconnecting IRC...');
        this.handleAuthFailure();
      }
    });
  }

  registerMessageHandler(handler: (msg: any) => Promise<void>): void {
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
    const tokens = await authService.getTokens();
    if (!tokens) {
      console.error('❌ Token refresh failed or user logged out. Stopping IRC.');
      this.stopChat();
      return;
    }
    console.log('🔄 Reconnecting to IRC with refreshed token...');
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
    }
    const accessToken = tokens.access_token;
    const username = tokens.login!;
    const channel = username.toLowerCase();
    const socket = new net.Socket();
    this.client = socket;
    socket.connect(PORT, HOST, () => {
      this.isConnecting = false;
      this.lastEventTimestamp = Date.now();
      console.log('🟢 Connected to Twitch IRC');
      socket.write('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership\r\n');
      socket.write(`PASS oauth:${accessToken}\r\n`);
      socket.write(`NICK ${username}\r\n`);
      socket.write(`JOIN #${channel}\r\n`);
    });
    socket.on('data', async (data) => {
      this.lastEventTimestamp = Date.now();
      const messages = data.toString().split('\r\n');
      for (const message of messages) {
        if (!message) return;
        if (message.startsWith('PING')) {
          socket.write('PONG :tmi.twitch.tv\r\n');
          return;
        }
        if (/authentication failed/i.test(message)) {
          console.warn('⚠️ IRC authentication failed.');
          this.handleAuthFailure();
          return;
        }
        const parsed = await messageParser.parseIrcMessage(message);
        if (parsed) {
          console.log('📨', 'IRC сообщение :', parsed.username, parsed.htmlMessage);
          if (this.messageHandler) {
            await this.messageHandler(parsed);
          }
        }
      }
    });
    socket.on('close', () => {
      this.isConnecting = false;
      console.log('🔴 IRC Connection closed.');
    });
    socket.on('error', (err) => {
      this.isConnecting = false;
      console.error('❌ IRC Error:', err.message);
    });
  }

  stopChat(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      console.log('🛑 IRC Connection terminated.');
    }
    this.isStopping = true;
    this.isConnecting = false;
  }

  getLastEventTimestamp(): number {
    return this.lastEventTimestamp;
  }

  async sendMessage(message: string): Promise<void> {
    if (this.client && !this.client.destroyed) {
      const channel = (await authService.getCurrentLogin())?.toLowerCase();
      this.client.write(`PRIVMSG #${channel} :${message}\r\n`);
    }
  }
}

const instance = new ChatService();

export const startChat = () => instance.startChat();
export const stopChat = () => instance.stopChat();
export const sendMessage = (msg: string) => instance.sendMessage(msg);
export const registerMessageHandler = (handler: (msg: any) => Promise<void>) => instance.registerMessageHandler(handler);
export const getLastEventTimestamp = () => instance.getLastEventTimestamp();
