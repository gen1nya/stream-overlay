import { EventEmitter } from 'events';
import * as authService from './authService';
import * as chatService from './chatService';
import * as eventSubService from './esService';
import {UserState, UserStateHolder} from './UserStateHolder';
import { LogService } from '../logService';
import {Follower, UserData} from './types/UserData';
import { AppEvent } from './messageParser';
import {fetchFollower, fetchModerators, fetchVips} from "./authorizedHelixApi";
import {DbRepository} from "../db/DbRepository";
import {ipcMain} from "electron";

export class TwitchClient extends EventEmitter {
  private userState: UserStateHolder;
  private dbRepository: DbRepository | null = null;

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
    this.registerIpcHandlers()
  }

  async start(): Promise<void> {
    eventSubService.registerEventHandlers((destination, parsedEvent: AppEvent) => {
        console.log('event', destination, parsedEvent);
        this.emit('event', { destination, event: parsedEvent });
        if (parsedEvent.userId) {
            this.dbRepository?.users.updateLastSeen(parsedEvent.userId, parsedEvent.timestamp);
        }
    });

    chatService.registerMessageHandler(async (parsedMessage: AppEvent) => {
        console.log('chat', parsedMessage);
        this.emit('chat', parsedMessage);
        if (parsedMessage.userId) {
            this.dbRepository?.users.updateLastSeen(parsedMessage.userId, parsedMessage.timestamp);
        } else if (parsedMessage.userNameRaw) {
            this.dbRepository?.users.updateLastSeenByName(parsedMessage.userNameRaw, parsedMessage.timestamp);
        }
    });

    await eventSubService.start();
    await chatService.startChat();
    await this.refreshUser();
    this.dbRepository = DbRepository.getInstance(this.userState.getUserId() || 'default');

    let vips: UserData[] = [];
    let letVipsCursor: string | null = null;
    do {
        const response = await fetchVips(letVipsCursor);
        console.log(`fetched vips: ${response.data.length}`);
        vips.push(...response.data);
        letVipsCursor = response.pagination?.cursor || null;
    } while (letVipsCursor);

    let mods: UserData[] = [];
    let modsCursor: string | null = null;
    do {
        const response = await fetchModerators(modsCursor);
        console.log(`fetched mods: ${response.data.length}`);
        mods.push(...response.data);
        modsCursor = response.pagination?.cursor || null;
    } while (modsCursor);

    const editors = await this.userState.getEditors();

    console.log("vips", vips);

    let cursor: string | null = null;
    do {
      const response = await fetchFollower(cursor);
      console.log(`fetched followers: ${response.data.length}`);
      this.dbRepository.users.upsertUsers(
          response.data.map(follower => ({
            id: follower.user_id,
            name: follower.user_login,
            displayName: follower.user_name ?? follower.user_login,
            isFollower: true,
            isVip: vips.some(vip => vip.user_id === follower.user_id),
            isEditor: editors.some(editor => editor.user_id === follower.user_id),
            isMod: mods.some(mod => mod.user_id === follower.user_id),
            updatedAt: Date.now(),
            twitchType: 'follower',
            followedAt: follower.followed_at,
          }))
      );
      cursor = response.pagination?.cursor || null;
    } while (cursor);
    console.log('All followers fetched');
  }

  async logout(): Promise<void> {
    this.userState.logout()
    this.dbRepository = null;
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

  private registerIpcHandlers() {
    ipcMain.handle('twitch:get-users', async (_e, { offset, limit }) => {
        if (!this.dbRepository) return { total: 0, data: [] as Follower[] };
        const total = this.dbRepository.users.getUsersLength();
        const data = this.dbRepository.users.getUsers(offset, limit);
        return { total, data };
    });

    ipcMain.handle('twitch:search-users', async (_e, { query, offset, limit }) => {
        if (!this.dbRepository) return { total: 0, data: [] as Follower[] };
        const total = this.dbRepository.users.getUsersLength();
        const data = this.dbRepository.users.searchUsers(query, offset, limit);
        return { total, data };
    })

    ipcMain.handle('auth:getAccountInfo', async () => {
        const accountInfo = await this.userState.getUser();
        const editors = await this.userState.getEditors();
        return { accountInfo, editors };
    });

    // ipcMain.handle('twitch-get-user', async () => {
    //   return this.getUser();
    // });

    // ipcMain.handle('twitch-invalidate-user-cache', async () => {
    //   this.invalidateUserCache();
    // });

    // ipcMain.handle('twitch-get-last-eventsub-timestamp', async () => {
    //   return this.getLastEventSubTimestamp();
    // });

    // ipcMain.handle('twitch-get-last-chat-timestamp', async () => {
    //   return this.getLastChatTimestamp();
    // });
  }
}
