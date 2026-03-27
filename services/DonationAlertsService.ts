import axios from 'axios';
import WebSocket from 'ws';

interface GoalData {
    current: number;
    target: number;
    title: string;
    currency: string;
}

interface WidgetTokens {
    centrifugoToken: string;
    bearerToken: string;
    widgetId: string;
    goalId: string;
    userId: string;
}

/**
 * DonationAlertsService — pure Node.js implementation.
 *
 * Auth flow (reverse-engineered from widget):
 * 1. GET widget HTML → extract token_widget_streamer (Bearer), token_centrifugo_connect, IDs
 * 2. GET /api/v1/donationgoal/{goalId} with Bearer → initial data
 * 3. WS connect to centrifugo.donationalerts.com with centrifugo token
 * 4. POST /api/v1/centrifuge/subscribe with Bearer → channel subscription tokens
 * 5. Subscribe to channels via WS
 */
export class DonationAlertsService {
    private broadcast: (channel: string, payload: any) => void;
    private widgetUrl: string | null = null;
    private ws: WebSocket | null = null;
    private goalData: GoalData = { current: 0, target: 0, title: '', currency: '' };
    private tokens: WidgetTokens | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private pingTimer: NodeJS.Timeout | null = null;
    private msgId = 0;

    constructor(broadcast: (channel: string, payload: any) => void) {
        this.broadcast = broadcast;
    }

    async setWidgetUrl(url: string): Promise<void> {
        this.widgetUrl = url;
        await this.connect();
    }

    getGoalData(): GoalData {
        return { ...this.goalData };
    }

    getStatus(): { connected: boolean; goalTitle: string; widgetUrl: string } {
        return {
            connected: this.ws?.readyState === WebSocket.OPEN,
            goalTitle: this.goalData.title,
            widgetUrl: this.widgetUrl || '',
        };
    }

    private async connect(): Promise<void> {
        if (!this.widgetUrl) return;

        try {
            this.tokens = await this.parseWidgetPage(this.widgetUrl);
            console.log(`🎯 [DA] Parsed: goal=${this.tokens.goalId}, widget=${this.tokens.widgetId}, user=${this.tokens.userId}`);

            await this.fetchGoalData();
            this.connectCentrifugo();
        } catch (err: any) {
            console.error('❌ [DA] Connection failed:', err.message);
            this.scheduleReconnect();
        }
    }

    // ─── Step 1: Parse widget HTML ───────────────────────────────

    private async parseWidgetPage(url: string): Promise<WidgetTokens> {
        const { data: html } = await axios.get(url, { timeout: 10000 });

        const centrifugoToken = this.extractVar(html, 'token_centrifugo_connect');
        const bearerToken = this.extractVar(html, 'token_widget_streamer');
        const widgetId = this.extractVar(html, 'donation_goal_widget_id');

        if (!centrifugoToken || !bearerToken || !widgetId) {
            throw new Error('Failed to parse widget page');
        }

        const payload = JSON.parse(Buffer.from(centrifugoToken.split('.')[1], 'base64').toString());
        const userId = payload.sub?.replace('User:', '') || '';
        const goalIdMatch = url.match(/\/widget\/goal\/(\d+)/);
        const goalId = goalIdMatch?.[1] || '';

        return { centrifugoToken, bearerToken, widgetId, goalId, userId };
    }

    private extractVar(html: string, varName: string): string {
        const regex = new RegExp(`window\\.${varName}\\s*=\\s*"([^"]+)"`);
        return html.match(regex)?.[1] || '';
    }

    private get authHeaders() {
        return { Authorization: `Bearer ${this.tokens!.bearerToken}` };
    }

    // ─── Step 2: Fetch initial goal data ─────────────────────────

    private async fetchGoalData(): Promise<void> {
        if (!this.tokens) return;

        try {
            const { data } = await axios.get(
                `https://www.donationalerts.com/api/v1/donationgoal/${this.tokens.goalId}`,
                { params: { include_timestamps: 1 }, headers: this.authHeaders, timeout: 10000 }
            );

            if (data?.data) {
                const g = data.data;
                this.goalData = {
                    current: parseFloat(g.raised_amount ?? 0),
                    target: parseFloat(g.goal_amount ?? 0),
                    title: g.title || '',
                    currency: g.currency || '₽',
                };
                console.log(`🎯 [DA] Goal: ${this.goalData.current}/${this.goalData.target} ${this.goalData.currency} — "${this.goalData.title}"`);
                this.broadcast('da:goal-update', this.goalData);
            }
        } catch (err: any) {
            console.warn(`⚠️ [DA] Fetch goal failed: ${err.message}`);
        }
    }

    // ─── Step 3-5: Centrifugo raw protocol ───────────────────────

    private connectCentrifugo(): void {
        if (!this.tokens) return;
        this.disconnect();
        this.msgId = 0;

        this.ws = new WebSocket('wss://centrifugo.donationalerts.com/connection/websocket');

        this.ws.on('open', () => {
            console.log('🟢 [DA] WS opened');
            this.wsSend({
                params: { token: this.tokens!.centrifugoToken, name: 'js' },
                id: this.nextId(),
            });
        });

        this.ws.on('message', (raw: Buffer) => {
            for (const line of raw.toString().split('\n').filter(Boolean)) {
                try { this.handleMessage(JSON.parse(line)); } catch {}
            }
        });

        this.ws.on('close', (code, reason) => {
            console.log(`🔴 [DA] WS closed: ${code} ${reason}`);
            this.stopPing();
            this.scheduleReconnect();
        });

        this.ws.on('error', (err) => {
            console.error('❌ [DA] WS error:', err.message);
        });
    }

    private async handleMessage(msg: any): Promise<void> {
        // Connect response — has result.client
        if (msg.id && msg.result?.client) {
            console.log(`🟢 [DA] Centrifugo connected: ${msg.result.client}`);
            this.startPing();

            try {
                const subTokens = await this.fetchSubscriptionTokens(msg.result.client);
                for (const { channel, token } of subTokens) {
                    this.wsSend({ method: 1, params: { channel, token }, id: this.nextId() });
                    console.log(`📡 [DA] Subscribing to ${channel}`);
                }
            } catch (err: any) {
                console.error('❌ [DA] Subscribe tokens failed:', err.message);
            }
            return;
        }

        // Publication — no id, has result.channel + result.data
        if (!msg.id && msg.result?.data?.data) {
            const d = msg.result.data.data;
            // Skip join/leave notifications
            if (d.raised_amount !== undefined || d.goal_amount !== undefined || d.title !== undefined) {
                console.log(`📩 [DA] Goal update on ${msg.result.channel}`);
                this.handleGoalUpdate(d);
            }
            return;
        }
    }

    // ─── Step 4: Get subscription tokens ─────────────────────────

    private async fetchSubscriptionTokens(clientId: string): Promise<Array<{ channel: string; token: string }>> {
        const channels = [
            `$goals:goal_${this.tokens!.userId}`,
            `$widgets:goal_${this.tokens!.userId}`,
        ];

        const { data } = await axios.post(
            'https://www.donationalerts.com/api/v1/centrifuge/subscribe',
            { client: clientId, channels },
            { headers: this.authHeaders, timeout: 10000 }
        );

        return data.channels || [];
    }

    // ─── Goal data handling ──────────────────────────────────────

    private handleGoalUpdate(data: any): void {
        if (!data) return;
        let changed = false;

        if (data.raised_amount !== undefined) { this.goalData.current = parseFloat(data.raised_amount); changed = true; }
        if (data.goal_amount !== undefined) { this.goalData.target = parseFloat(data.goal_amount); changed = true; }
        if (data.title !== undefined) { this.goalData.title = data.title; changed = true; }
        if (data.currency !== undefined) { this.goalData.currency = data.currency; changed = true; }

        if (changed) {
            console.log(`🎯 [DA] Updated: ${this.goalData.current}/${this.goalData.target} ${this.goalData.currency}`);
            this.broadcast('da:goal-update', this.goalData);
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────

    private wsSend(data: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    private nextId(): number { return ++this.msgId; }

    private startPing(): void {
        this.stopPing();
        this.pingTimer = setInterval(() => {
            this.wsSend({ method: 7, id: this.nextId() });
        }, 25000);
    }

    private stopPing(): void {
        if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            console.log('🔄 [DA] Reconnecting...');
            this.connect();
        }, 15000);
    }

    private disconnect(): void {
        this.stopPing();
        if (this.ws) { this.ws.removeAllListeners(); this.ws.close(); this.ws = null; }
    }

    stop(): void {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.disconnect();
    }
}
