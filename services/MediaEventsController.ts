import { LogService } from './logService';
import { MediaEventConfig } from './store/StoreSchema';
import { MediaEventsService } from './MediaEventsService';

export interface MediaEventContext {
    // Common
    user: string;
    userId: string;

    // Triggers
    reward?: string;
    rewardCost?: number;
    target?: string;
    args?: string[];
    raider?: string;
    viewers?: number;

    // Gacha
    item?: string;
    rarity?: number;
    stars?: string;
    pullNumber?: number;
}

export interface ShowMediaPayload {
    mediaEventId: string;
    context: MediaEventContext;
}

export class MediaEventsController {
    private logService: LogService;
    private mediaEventsService: MediaEventsService;
    private broadcastCallback: ((channel: string, payload: any) => void) | null = null;

    constructor(logService: LogService, mediaEventsService: MediaEventsService) {
        this.logService = logService;
        this.mediaEventsService = mediaEventsService;
    }

    setBroadcastCallback(callback: (channel: string, payload: any) => void): void {
        this.broadcastCallback = callback;
    }

    getMediaEventById(id: string): MediaEventConfig | undefined {
        return this.mediaEventsService.get(id);
    }

    getAllMediaEvents(): MediaEventConfig[] {
        return this.mediaEventsService.getAll();
    }

    async showMedia(payload: ShowMediaPayload): Promise<void> {
        const event = this.getMediaEventById(payload.mediaEventId);

        if (!event) {
            this.log(`Media event not found: ${payload.mediaEventId}`);
            return;
        }

        const interpolatedCaption = this.interpolateCaption(event.caption, payload.context);

        // Log the event details
        this.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        this.log(`SHOW_MEDIA: ${event.name}`);
        this.log(`  Type: ${event.mediaType}`);
        this.log(`  URL: ${event.mediaUrl}`);
        this.log(`  Caption: ${interpolatedCaption}`);
        this.log(`  Duration: ${event.displayDuration}s`);
        this.log(`  Group: ${event.groupId || 'none'}`);
        this.log(`  Style: fontSize=${event.style.fontSize}, font=${event.style.fontFamily}`);
        this.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        // Broadcast to overlay
        if (this.broadcastCallback) {
            this.broadcastCallback('media:show', {
                mediaEvent: {
                    ...event,
                    caption: interpolatedCaption
                },
                context: payload.context
            });
        }
    }

    private interpolateCaption(template: string, context: MediaEventContext): string {
        let result = template;

        // Common variables
        result = result.replace(/\$\{user\}/g, context.user || '');

        // Trigger variables
        result = result.replace(/\$\{target\}/g, context.target || '');
        result = result.replace(/\$\{reward\}/g, context.reward || '');
        result = result.replace(/\$\{reward_cost\}/g, String(context.rewardCost || ''));
        result = result.replace(/\$\{raider\}/g, context.raider || '');
        result = result.replace(/\$\{viewers\}/g, String(context.viewers || ''));

        // Gacha variables
        result = result.replace(/\$\{item\}/g, context.item || '');
        result = result.replace(/\$\{rarity\}/g, String(context.rarity || ''));
        result = result.replace(/\$\{stars\}/g, context.stars || '');
        result = result.replace(/\$\{pullNumber\}/g, String(context.pullNumber || ''));

        // Handle args[N]
        result = result.replace(/\$\{args\[(\d+)\]\}/g, (_, index) => {
            const i = parseInt(index, 10);
            return context.args?.[i] || '';
        });

        return result;
    }

    private log(message: string): void {
        console.log(`[MediaEvents] ${message}`);
        this.logService.logMessage(`[MediaEvents] ${message}`);
    }
}
