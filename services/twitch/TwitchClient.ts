import { EventEmitter } from 'events';
import * as authService from './authService';
import * as chatService from './chatService';
import * as eventSubService from './esService';
import {UserState, UserStateHolder} from './UserStateHolder';
import { LogService } from '../logService';
import { UserData } from './types/UserData';
import { AppEvent } from './messageParser';

export class TwitchClient extends EventEmitter {
  private userState: UserStateHolder;

  constructor(
    private logService: LogService,
    private onEditorsFetched: (editors: UserData[]) => void = () => {}
  ) {
    super();
    this.userState = new UserStateHolder(
      logService,
      (editors: UserData[]) => {
        this.onEditorsFetched(editors);
        this.emit('editors', editors);
      },
      null
    );

    chatService.setLogger(logService);
    eventSubService.setLogger(logService);
  }

  async start(): Promise<void> {
    eventSubService.registerEventHandlers((destination, parsedEvent) => {
      this.emit('event', { destination, event: parsedEvent });
    });

    chatService.registerMessageHandler(async (parsedMessage: AppEvent) => {
      this.emit('chat', parsedMessage);
    });

    await eventSubService.start();
    await chatService.startChat();
  }

  async logout(): Promise<void> {
    this.userState.logout()
    eventSubService.stop();
    chatService.stopChat();
  }

  stop(): void {
    eventSubService.stop({ setStopping: true } as any);
    chatService.stopChat();
  }

  async restart(): Promise<void> {
    eventSubService.stop({ setStopping: false, ignoreClose: true } as any);
    await eventSubService.start();
    await chatService.reconnect();
  }

  async sendMessage(message: string): Promise<void> {
    await chatService.sendMessage(message);
  }

  async refreshUser(): Promise<void> {
    const tokens = await authService.getTokens();
    if (tokens && tokens.user_id) {
      this.userState.setId(tokens.user_id);
    }
  }

  getEditors(): Promise<UserData[]> {
    return this.userState.getEditors();
  }

  getUser(): Promise<UserState> {
    return this.userState.getUser();
  }

  invalidateUserCache(): void {
    this.userState.invalidateCache();
  }

  getLastEventSubTimestamp(): number | undefined {
    return eventSubService.getLastEventTimestamp();
  }

  getLastChatTimestamp(): number | undefined {
    return chatService.getLastEventTimestamp();
  }
}
