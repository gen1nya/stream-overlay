import {DbRepository} from './db/DbRepository';
import {ChattersService} from './twitch/ChattersService';

interface ParticipantData {
    userName: string;
    messageCount: number;
    firstMessageAt: number;
    lastMessageAt: number;
}

export interface ChatStatsPayload {
    isStreamActive: boolean;
    streamStartedAt: number | null;
    totalMessages: number;
    messagesPerMinute: number;
    peakMessagesPerMinute: number;
    currentChatters: number;
    uniqueParticipants: number;
    topChatters: Array<{ userId: string; userName: string; messageCount: number }>;
}

export class ChatStatsService {
    private broadcast: (channel: string, payload: any) => void;
    private getDbRepository: () => DbRepository | null;

    private isTracking: boolean = false;
    private currentSessionId: number | null = null;
    private streamStartedAt: number | null = null;

    private totalMessages: number = 0;
    private messageTimestamps: number[] = [];
    private readonly MPM_WINDOW_MS = 60_000;

    private allTimeParticipants: Map<string, ParticipantData> = new Map();
    private peakMessagesPerMinute: number = 0;

    // Idle tracking (outside of stream)
    private idleMessageTimestamps: number[] = [];

    private flushInterval: ReturnType<typeof setInterval> | null = null;
    private broadcastInterval: ReturnType<typeof setInterval> | null = null;

    constructor(
        broadcast: (channel: string, payload: any) => void,
        getDbRepository: () => DbRepository | null,
    ) {
        this.broadcast = broadcast;
        this.getDbRepository = getDbRepository;

        // Always broadcast stats, even outside of stream
        this.broadcastInterval = setInterval(() => this.broadcastStats(), 5_000);
    }

    onStreamOnline(): void {
        if (this.isTracking) return;

        this.isTracking = true;
        this.streamStartedAt = Date.now();
        this.totalMessages = 0;
        this.messageTimestamps = [];
        this.allTimeParticipants.clear();
        this.peakMessagesPerMinute = 0;
        this.currentSessionId = null;

        try {
            const repo = this.getDbRepository();
            if (repo) {
                this.currentSessionId = repo.chatStats.createSession(this.streamStartedAt);
            }
        } catch (e) {
            console.error('ChatStatsService: failed to create session', e);
        }

        this.idleMessageTimestamps = [];
        this.flushInterval = setInterval(() => this.flushToDb(), 60_000);

        console.log('ChatStatsService: tracking started');
    }

    onStreamOffline(): void {
        if (!this.isTracking) return;

        this.flushToDb();

        try {
            const repo = this.getDbRepository();
            if (repo && this.currentSessionId) {
                repo.chatStats.endSession(this.currentSessionId, Date.now());
            }
        } catch (e) {
            console.error('ChatStatsService: failed to end session', e);
        }

        this.broadcastStats();
        this.clearFlushInterval();

        this.isTracking = false;
        this.currentSessionId = null;
        this.streamStartedAt = null;
        this.totalMessages = 0;
        this.messageTimestamps = [];
        this.allTimeParticipants.clear();
        this.peakMessagesPerMinute = 0;

        console.log('ChatStatsService: tracking stopped');
    }

    onChatMessage(msg: { userId: string | null; userName: string | null; type: string; timestamp: number }): void {
        if (msg.type !== 'chat' || !msg.userId) return;

        const now = msg.timestamp || Date.now();

        // Always track idle msg/min
        this.idleMessageTimestamps.push(now);

        if (!this.isTracking) return;

        this.totalMessages++;
        this.messageTimestamps.push(now);

        const userName = msg.userName || 'unknown';
        const existing = this.allTimeParticipants.get(msg.userId);
        if (existing) {
            existing.messageCount++;
            existing.lastMessageAt = now;
            if (userName !== 'unknown') {
                existing.userName = userName;
            }
        } else {
            this.allTimeParticipants.set(msg.userId, {
                userName,
                messageCount: 1,
                firstMessageAt: now,
                lastMessageAt: now,
            });
        }

        const currentMpm = this.pruneAndCount(this.messageTimestamps);
        if (currentMpm > this.peakMessagesPerMinute) {
            this.peakMessagesPerMinute = currentMpm;
        }
    }

    getStats(): ChatStatsPayload {
        let currentChatters = 0;
        try {
            currentChatters = ChattersService.getInstance().count;
        } catch {
            // ChattersService may not be initialized
        }

        const topChatters = Array.from(this.allTimeParticipants.entries())
            .sort((a, b) => b[1].messageCount - a[1].messageCount)
            .slice(0, 10)
            .map(([userId, p]) => ({ userId, userName: p.userName, messageCount: p.messageCount }));

        const mpm = this.isTracking
            ? this.pruneAndCount(this.messageTimestamps)
            : this.pruneAndCount(this.idleMessageTimestamps);

        return {
            isStreamActive: this.isTracking,
            streamStartedAt: this.streamStartedAt,
            totalMessages: this.totalMessages,
            messagesPerMinute: mpm,
            peakMessagesPerMinute: this.peakMessagesPerMinute,
            currentChatters,
            uniqueParticipants: this.allTimeParticipants.size,
            topChatters,
        };
    }

    stop(): void {
        if (this.isTracking) {
            this.flushToDb();
            try {
                const repo = this.getDbRepository();
                if (repo && this.currentSessionId) {
                    repo.chatStats.endSession(this.currentSessionId, Date.now());
                }
            } catch (e) {
                console.error('ChatStatsService: failed to end session on stop', e);
            }
        }
        this.clearAllIntervals();
    }

    private pruneAndCount(timestamps: number[]): number {
        const cutoff = Date.now() - this.MPM_WINDOW_MS;
        while (timestamps.length > 0 && timestamps[0] < cutoff) {
            timestamps.shift();
        }
        return timestamps.length;
    }

    private flushToDb(): void {
        if (!this.currentSessionId) return;

        try {
            const repo = this.getDbRepository();
            if (!repo) return;

            // Merge message senders with room participants
            const entries = new Map(
                Array.from(this.allTimeParticipants.entries()).map(([userId, data]) => [
                    userId,
                    {
                        userId,
                        userName: data.userName,
                        messageCount: data.messageCount,
                        firstMessageAt: data.firstMessageAt,
                        lastMessageAt: data.lastMessageAt,
                    },
                ])
            );

            // Add chatters who haven't sent messages
            try {
                const chatters = ChattersService.getInstance().getAllChatters();
                const now = Date.now();
                for (const chatter of chatters) {
                    if (chatter.userId && !entries.has(chatter.userId)) {
                        entries.set(chatter.userId, {
                            userId: chatter.userId,
                            userName: chatter.displayName || chatter.login,
                            messageCount: 0,
                            firstMessageAt: chatter.joinedAt || now,
                            lastMessageAt: chatter.joinedAt || now,
                        });
                    }
                }
            } catch {
                // ChattersService may not be initialized
            }

            const uniqueChatters = entries.size;

            repo.chatStats.upsertSessionStats(
                this.currentSessionId,
                this.totalMessages,
                uniqueChatters,
                this.peakMessagesPerMinute
            );

            if (entries.size > 0) {
                repo.chatStats.upsertUserStats(this.currentSessionId, Array.from(entries.values()));
            }
        } catch (e) {
            console.error('ChatStatsService: flush failed', e);
        }
    }

    private broadcastStats(): void {
        this.broadcast('chat-stats:update', this.getStats());
    }

    private clearFlushInterval(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
    }

    private clearAllIntervals(): void {
        this.clearFlushInterval();
        if (this.broadcastInterval) {
            clearInterval(this.broadcastInterval);
            this.broadcastInterval = null;
        }
    }
}
