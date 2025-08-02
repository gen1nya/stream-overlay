import {UserData} from "./types/UserData";
import {getEditorsByBroadcasterId} from "./authorizedHelixApi";
import {LogService} from "../logService";

export class UserState {

    private userId: string | null = null;
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

    private editors: UserData[] = [];

    public getEditors(): UserData[] {
        return this.editors;
    }

    public fetchEditors(): void {
        if (!this.userId) {
            console.warn('User ID is not set, cannot fetch editors');
            return;
        }
        getEditorsByBroadcasterId(this.userId)
            .then(editorsResponse => {
                this.editors = editorsResponse.data
                this.onEditorsFetched(editorsResponse.data)
                this.logger.log({
                    timestamp: new Date().toISOString(),
                    message: `Fetched ${this.editors.length} editors`,
                    userId: this.userId,
                })
            })
            .catch(err => {
                console.error('Failed to fetch editors:', err);
            });
    }

    public getUserId(): string | null {
        return this.userId;
    }

    setId(user_id: string) {
        this.userId = user_id;
    }

}