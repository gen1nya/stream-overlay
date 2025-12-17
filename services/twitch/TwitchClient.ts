import { EventEmitter } from 'events';
import * as authService from './authService';
import * as chatService from './chatService';
import * as eventSubService from './esService';
import {UserState, UserStateHolder} from './UserStateHolder';
import { LogService } from '../logService';
import {Follower, UserData} from './types/UserData';
import { AppEvent } from './messageParser';
import {fetchCustomRewards, fetchFollower, fetchModerators, fetchStreams, fetchVips} from "./authorizedHelixApi";
import {DbRepository} from "../db/DbRepository";
import {ipcMain} from "electron";
import {EVENT_BROADCASTING} from "./esService";
import {ProxyService} from "../ProxyService";
import {ChattersService} from "./ChattersService";

export class TwitchClient extends EventEmitter {
  private userState: UserStateHolder;
  private dbRepository: DbRepository | null = null;
  private newFollowers: Set<string> = new Set();
  private readonly onLogoutCallback: () => void = () => {};
  private chattersService: ChattersService;
  private chattersRefreshInterval: NodeJS.Timeout | null = null;

  constructor(
    private logService: LogService,
    private onEditorsFetched: (editors: UserData[]) => void = () => {},
    private onUserFetched: (user: UserState) => void = () => {},
    private onLogout: () => void = () => {},
    proxyService?: ProxyService,
  ) {
    super();
    this.onLogoutCallback = this.onLogout;
    this.userState = new UserStateHolder(
      logService,
      (editors: UserData[]) => {
        this.onEditorsFetched(editors);
        this.emit('editors', editors);
      },
      (user: UserState) => {
        this.onUserFetched(user);
        this.emit('user', user);
      },
      null
    );

    chatService.setLogger(logService);
    eventSubService.setLogger(logService);
    this.chattersService = ChattersService.getInstance();

    // Set proxy service if provided
    if (proxyService) {
      eventSubService.setProxyService(proxyService);
      chatService.setProxyService(proxyService);
    }

    this.registerIpcHandlers()
  }

  async start(): Promise<void> {
    eventSubService.registerEventHandlers((destination, parsedEvent: AppEvent) => {
        console.log('event', destination, parsedEvent);
        this.emit('event', { destination, event: parsedEvent });
        if (parsedEvent.type === "broadcast") {
            this.userState.setIsBroadcasting(parsedEvent.isOnline);
            if (!parsedEvent.isOnline) {
                this.newFollowers.clear();
                this.broadcastNewFollowersPerStream();
            }
        }
        if (parsedEvent.type === "follow" && parsedEvent.userId) {
          console.log('New follower:', parsedEvent.userNameRaw);
          this.newFollowers.add(parsedEvent.userId);
          this.broadcastNewFollowersPerStream()
        }
        if (parsedEvent.userId) {
            this.dbRepository?.users.updateLastSeen(parsedEvent.userId, parsedEvent.timestamp);
        }
    });

    chatService.registerMessageHandler(async (parsedMessage: AppEvent) => {
        console.log('chat', parsedMessage);
        this.emit('chat', parsedMessage);

        // Обновляем список chatters по событиям
        if (parsedMessage.type === 'join' && parsedMessage.userNameRaw) {
            this.chattersService.onUserJoin(parsedMessage.userNameRaw, parsedMessage.userName || undefined);
        } else if (parsedMessage.type === 'part' && parsedMessage.userNameRaw) {
            this.chattersService.onUserPart(parsedMessage.userNameRaw);
        } else if (parsedMessage.type === 'chat' && parsedMessage.userNameRaw) {
            // Обычное сообщение - добавляем/обновляем пользователя
            this.chattersService.onUserMessage(
                parsedMessage.userId || '',
                parsedMessage.userNameRaw,
                parsedMessage.userName || parsedMessage.userNameRaw
            );
        }

        if (parsedMessage.userId) {
            this.dbRepository?.users.updateLastSeen(parsedMessage.userId, parsedMessage.timestamp);
        } else if (parsedMessage.userNameRaw) {
            this.dbRepository?.users.updateLastSeenByName(parsedMessage.userNameRaw, parsedMessage.timestamp);
        }
    });

    chatService.registerLogoutHandler(this.onLogoutCallback);
    eventSubService.registerLogoutHandler(this.onLogoutCallback);

    await eventSubService.start();
    await chatService.startChat();
    await this.refreshUser();
    await this.checkBroadcastingStatus();

    // Инициализируем список chatters из Helix API
    this.chattersService.initialize().catch(err => {
      console.warn('ChattersService initialization failed, will use JOIN/PART events:', err?.message);
    });

    // Периодическое обновление chatters каждые 5 минут
    this.chattersRefreshInterval = setInterval(() => {
      this.chattersService.initialize().catch(err => {
        console.warn('ChattersService refresh failed:', err?.message);
      });
    }, 5 * 60 * 1000);

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
    this.chattersService.clear();
    if (this.chattersRefreshInterval) {
      clearInterval(this.chattersRefreshInterval);
      this.chattersRefreshInterval = null;
    }
    eventSubService.stop();
    chatService.stopChat();
  }

  stop(): void {
    if (this.chattersRefreshInterval) {
      clearInterval(this.chattersRefreshInterval);
      this.chattersRefreshInterval = null;
    }
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

  async refreshUser(): Promise<string | null> {
    const tokens = await authService.getTokens();
    if (tokens && tokens.user_id) {
      this.userState.setId(tokens.user_id);
    }
    return tokens?.user_id ?? null;
  }

  getEditors(): Promise<UserData[]> {
    return this.userState.getEditors();
  }

  getUser(): Promise<UserState> {
    return this.userState.getUser();
  }

  getUserId(): string | null {
    return this.userState.getUserId();
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

  async getIsBroadcasting(): Promise<boolean> {
    return this.userState.getIsBroadcasting();
  }

  async checkBroadcastingStatus() {
      const isBroadcasting = await this.userState.getIsBroadcasting();
      const destination = `status:${EVENT_BROADCASTING}`
      const payload =  { isOnline: isBroadcasting };
      this.userState.setIsBroadcasting(isBroadcasting);
      this.emit('event', { destination: destination, event: payload });
  }

  broadcastNewFollowersPerStream() {
    const count = this.newFollowers.size;
    console.log('New followers this stream:', this.newFollowers);
    this.emit('event', { destination: "event:new_followers_count", event: count });
    return count;
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

    ipcMain.handle('twitch:get-rewards', async () => {
        const response = await fetchCustomRewards();
        return response.data;
    });

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
