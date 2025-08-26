import {UserData} from "./types/UserData";
import {fetchFollowerCount, fetchEditors, fetchUser} from "./authorizedHelixApi";
import {LogService} from "../logService";

export interface UserState {
    displayName: string;
    login: string;
    avatar: string;
    userId: string;
    followerCount: number;
}

export class UserStateHolder {

    private static TTL = 1000 * 60 * 5; // 5 minutes

    private userId: string | null = null;

    private user: UserState | null = null;
    private editors: UserData[] | null = null;

    private lastFetchTime = 0;

    private logger: LogService;

    private onEditorsFetched: (editors: UserData[]) => void;

    constructor(
        logger: LogService,
        onEditorsFetched: (editors: UserData[]) => void,
        userId?: string | null

    ) {
        this.userId = userId ?? null;
        this.logger = logger;
        this.onEditorsFetched = onEditorsFetched
    }

    public async getEditors(): Promise<UserData[]> {
        if (!this.editors) {
            console.warn('Editors are not set, fetching editors data');
            this.editors = await this.fetchEditors()
        } else if (this.lastFetchTime + UserStateHolder.TTL < Date.now()) {
            console.warn('Editors data is stale, fetching new editors data');
            this.editors = await this.fetchEditors();
        }
        return this.editors;
    }

    logout() {
        this.user = null;
        this.editors = null;
        this.userId = null;
        this.lastFetchTime = 0;
        this.logger.log({
            timestamp: new Date().toISOString(),
            message: 'User state cleared',
        });
    }

    invalidateCache() {
        this.lastFetchTime = 0;
    }

    async getUser(): Promise<UserState> {
        if (!this.user) {
            console.warn('User is not set, fetching user data');
            this.user = await this.fetchUser()
        } else if (this.lastFetchTime + UserStateHolder.TTL < Date.now()) {
            console.warn('User data is stale, fetching new user data');
            this.user = await this.fetchUser();
        }
        return this.user;
    }

    private async fetchUser(): Promise<UserState> {
        if (!this.userId) {
            console.warn('User ID is not set, cannot fetch user');
            throw new Error('User ID is not set');
        }
        return Promise.all([
            fetchUser(),
            fetchFollowerCount(this.userId)
        ]).then(([userResponse, followerCount]) => {
            this.logger.log({
                timestamp: new Date().toISOString(),
                message: `Fetched user ${userResponse.display_name} (${userResponse.id}) with ${followerCount} followers`,
            });
            this.lastFetchTime = Date.now();
            return {
                displayName: userResponse.display_name,
                login: userResponse.login,
                avatar: userResponse.profile_image_url,
                userId: userResponse.id,
                followerCount: followerCount || 0,
            };
        });
    }

    private async fetchEditors(): Promise<UserData[]> {
        if (!this.userId) {
            console.warn('User ID is not set, cannot fetch editors');
            throw new Error('User ID is not set');
        }
        let editorsResponse = await fetchEditors();
        this.onEditorsFetched(editorsResponse.data)
        this.logger.log({
            timestamp: new Date().toISOString(),
            message: `Fetched ${editorsResponse.data.length} editors`,
            userId: this.userId,
        })
        return editorsResponse.data
    }

    public getUserId(): string | null {
        return this.userId;
    }

    setId(user_id: string) {
        this.userId = user_id;
    }

}