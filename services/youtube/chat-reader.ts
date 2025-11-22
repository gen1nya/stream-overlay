import { request } from 'node:https';
import { setTimeout as sleep } from 'timers/promises';
import { ProxyService } from '../ProxyService';
import type { ChatMessage, YouTubeConfig, Message } from './types';

export class YouTubeChatReader {
    private continuation: string | null = null;
    isRunning = false;
    private config: YouTubeConfig | null = null;
    private videoId: string | null = null;
    private consentCookies: string | null = null;
    private proxyService?: ProxyService;

    constructor(
        private onMessage: (message: Message) => void,
        private ytCookie?: string,
        proxyService?: ProxyService
    ) {
        this.proxyService = proxyService;
    }

    // Method to handle consent
    setConsentCookies(cookies: string): void {
        this.consentCookies = cookies;
        console.log(`[DEBUG] Consent cookies set`);
    }

    async start(videoId: string, config?: YouTubeConfig): Promise<void> {
        if (this.isRunning) {
            throw new Error('Chat reader is already running');
        }

        this.videoId = videoId;
        this.isRunning = true;

        try {
            // Get YouTube config if not provided
            if (config) {
                this.config = config;
            } else {
                this.config = await this.getYouTubeConfig();
            }

            this.continuation = await this.getInitialContinuation();
            this.onMessage({
                type: 'system',
                event: 'connected',
                message: `Connected to chat for video ${videoId}`
            });

            await this.pollLoop();
        } catch (error) {
            this.isRunning = false;
            this.onMessage({
                type: 'system',
                event: 'error',
                message: 'Chat reader failed to start',
                error: error as Error
            });
            throw error;
        }
    }

    stop(): void {
        this.isRunning = false;
        this.onMessage({
            type: 'system',
            event: 'disconnected',
            message: 'Chat reader stopped'
        });
    }

    private async pollLoop(): Promise<void> {
        let lastMessageTime = Date.now();

        while (this.isRunning && this.continuation) {
            try {
                const url = `https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?prettyPrint=false&key=${this.config!.key}`;

                const response = await this.fetchJSON(url, {
                    method: 'POST',
                    body: { context: this.config!.context, continuation: this.continuation }
                });

                const actions = response?.actions || response?.continuationContents?.liveChatContinuation?.actions || [];

                for (const action of actions) {
                    const mapped = this.mapAction(action);
                    if (mapped) {
                        lastMessageTime = Date.now();
                        this.onMessage(mapped);
                    }
                }

                // Update continuation and timeout
                let timeout = 1500;
                const continuations = response?.continuationContents?.liveChatContinuation?.continuations || [];

                for (const cont of continuations) {
                    this.continuation =
                        cont?.invalidationContinuationData?.continuation ||
                        cont?.timedContinuationData?.continuation ||
                        cont?.reloadContinuationData?.continuation ||
                        this.continuation;

                    timeout =
                        cont?.invalidationContinuationData?.timeoutMs ||
                        cont?.timedContinuationData?.timeoutMs ||
                        cont?.reloadContinuationData?.timeoutMs ||
                        timeout;
                }

                // Heartbeat if no messages for too long
                if (Date.now() - lastMessageTime > 15000) {
                    this.onMessage({
                        type: 'system',
                        event: 'connected',
                        message: 'Heartbeat - chat is still active'
                    });
                    lastMessageTime = Date.now();
                }

                await sleep(Math.max(500, Number(timeout) || 1500));

            } catch (error) {
                if (this.isRunning) {
                    this.onMessage({
                        type: 'system',
                        event: 'error',
                        message: 'Error during chat polling',
                        error: error as Error
                    });

                    // Try to recover after a short delay
                    await sleep(5000);
                }
            }
        }
    }

    private async getYouTubeConfig(): Promise<YouTubeConfig> {
        const liveChatURL = `https://www.youtube.com/live_chat?is_popout=1&v=${encodeURIComponent(this.videoId!)}`;
        const response = await this.fetchText(liveChatURL);

        // Check for consent redirect
        if (response.isConsent && response.finalUrl) {
            this.onMessage({
                type: 'system',
                event: 'consent_required',
                message: 'YouTube requires consent to access content',
                consentUrl: response.finalUrl
            });
            throw new Error('Consent required');
        }

        const { text: html } = response;
        const match = html.match(/ytcfg\.set\s*\(\s*({.+?})\s*\)\s*;/s);
        if (!match) throw new Error('ytcfg not found');

        const ytcfg = JSON.parse(match[1]);
        const key = ytcfg?.INNERTUBE_API_KEY;
        const context = ytcfg?.INNERTUBE_CONTEXT;

        if (!key || !context) {
            throw new Error('INNERTUBE configuration missing');
        }

        return { key, context };
    }

    private async getInitialContinuation(): Promise<string> {
        // First try to get from live chat popup
        const liveChatURL = `https://www.youtube.com/live_chat?is_popout=1&v=${encodeURIComponent(this.videoId!)}`;
        const { text: html } = await this.fetchText(liveChatURL);

        const fromHtml = this.tryExtractInitialContinuationFromHtml(html);
        if (fromHtml) return fromHtml;

        // Fallback to next API
        const url = `https://www.youtube.com/youtubei/v1/next?prettyPrint=false&key=${this.config!.key}`;
        const response = await this.fetchJSON(url, {
            method: 'POST',
            body: { context: this.config!.context, videoId: this.videoId }
        });

        const continuations =
            response?.contents?.twoColumnWatchNextResults?.conversationBar?.liveChatRenderer?.continuations ||
            response?.continuationContents?.liveChatContinuation?.continuations ||
            [];

        for (const cont of continuations) {
            const continuation =
                cont?.invalidationContinuationData?.continuation ||
                cont?.timedContinuationData?.continuation ||
                cont?.reloadContinuationData?.continuation;
            if (continuation) return continuation;
        }

        throw new Error('Could not get initial continuation');
    }

    private tryExtractInitialContinuationFromHtml(html: string): string | null {
        const patterns = [
            /(?:var |window\[")ytInitialData(?:"])?\s*=\s*({.+?});\s*<\/script>/s,
            /ytInitialData"\]\s*=\s*({.+?});/s,
            /ytInitialData\s*=\s*({.+?});/s
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                try {
                    const data = JSON.parse(match[1]);
                    const continuations =
                        data?.continuationContents?.liveChatRenderer?.continuations ||
                        data?.contents?.twoColumnWatchNextResults?.conversationBar?.liveChatRenderer?.continuations ||
                        [];

                    for (const cont of continuations) {
                        const continuation =
                            cont?.invalidationContinuationData?.continuation ||
                            cont?.timedContinuationData?.continuation ||
                            cont?.reloadContinuationData?.continuation;
                        if (continuation) return continuation;
                    }
                } catch {
                    continue;
                }
            }
        }
        return null;
    }

    private mapAction(action: any): ChatMessage | null {
        const add = action?.addChatItemAction;
        if (!add) return null;

        const item = add.item || {};
        const text = item?.liveChatTextMessageRenderer;
        const paid = item?.liveChatPaidMessageRenderer;
        const sticker = item?.liveChatPaidStickerRenderer;
        const member = item?.liveChatMembershipItemRenderer;

        if (text) {
            return {
                type: 'chat',
                kind: 'text',
                author: text?.authorName?.simpleText || this.getRunsText(text?.authorName?.runs) || '',
                timestamp: text?.timestampText?.simpleText || '',
                text: this.getRunsText(text?.message?.runs) || '',
                badges: (text?.authorBadges || []).map((b: any) => b?.tooltip).filter(Boolean)
            };
        }

        if (paid) {
            return {
                type: 'chat',
                kind: 'superchat',
                author: paid?.authorName?.simpleText || '',
                timestamp: paid?.timestampText?.simpleText || '',
                text: this.getRunsText(paid?.message?.runs) || '',
                amount: paid?.purchaseAmountText?.simpleText || this.getRunsText(paid?.purchaseAmountText?.runs) || '',
                header: this.getRunsText(paid?.headerText?.runs) || '',
                badges: (paid?.authorBadges || []).map((b: any) => b?.tooltip).filter(Boolean)
            };
        }

        if (sticker) {
            return {
                type: 'chat',
                kind: 'sticker',
                author: sticker?.authorName?.simpleText || '',
                timestamp: sticker?.timestampText?.simpleText || '',
                amount: sticker?.purchaseAmountText?.simpleText || '',
                sticker: sticker?.sticker?.accessibility?.accessibilityData?.label || 'sticker',
                badges: (sticker?.authorBadges || []).map((b: any) => b?.tooltip).filter(Boolean)
            };
        }

        if (member) {
            return {
                type: 'chat',
                kind: 'membership',
                author: member?.authorName?.simpleText || '',
                timestamp: member?.timestampText?.simpleText || '',
                header: this.getRunsText(member?.headerSubtext?.runs) || this.getRunsText(member?.headerPrimaryText?.runs) || '',
                badges: (member?.authorBadges || []).map((b: any) => b?.tooltip).filter(Boolean)
            };
        }

        return null;
    }

    private getRunsText(runs: any[]): string {
        if (!Array.isArray(runs)) return '';
        return runs.map(r => r.text || '').join('');
    }

    private async fetchText(url: string, options: any = {}, maxRedirects = 5): Promise<{ status: number; text: string; finalUrl?: string; isConsent?: boolean }> {
        // Если у нас есть ProxyService, используем его
        if (this.proxyService) {
            console.log(`[CHAT-READER] Using ProxyService for: ${url}`);

            // Добавляем cookies к options
            const headers = { ...options.headers };

            // Build cookie string
            let cookieString = '';
            if (this.consentCookies) {
                cookieString = this.consentCookies;
            }
            if (this.ytCookie) {
                cookieString = cookieString ? `${cookieString}; ${this.ytCookie}` : this.ytCookie;
            }
            if (cookieString) {
                headers['cookie'] = cookieString;
            }

            return this.proxyService.fetchYouTube(url, {
                ...options,
                headers
            }, maxRedirects);
        }

        // Иначе используем оригинальную логику
        console.log(`[CHAT-READER] Using direct connection for: ${url}`);

        return new Promise((resolve, reject) => {
            const makeRequest = (currentUrl: string, redirectCount: number) => {
                if (redirectCount > maxRedirects) {
                    reject(new Error(`Too many redirects (${redirectCount})`));
                    return;
                }

                const u = new URL(currentUrl);
                const headers = {
                    'accept': '*/*',
                    'accept-language': 'en-US,en;q=0.8',
                    'origin': 'https://www.youtube.com',
                    'referer': 'https://www.youtube.com/',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
                    ...options.headers
                };

                // Build cookie string
                let cookieString = '';
                if (this.consentCookies) {
                    cookieString = this.consentCookies;
                }
                if (this.ytCookie) {
                    cookieString = cookieString ? `${cookieString}; ${this.ytCookie}` : this.ytCookie;
                }
                if (cookieString) {
                    headers['cookie'] = cookieString;
                }

                if (options.body) headers['content-type'] = 'application/json';

                const req = request({
                    hostname: u.hostname,
                    path: u.pathname + u.search,
                    method: options.method || 'GET',
                    headers
                }, res => {
                    // Handle redirects
                    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
                        const location = res.headers.location;
                        if (location) {
                            console.log(`[DEBUG] Redirecting to: ${location}`);

                            // Check if this is a consent redirect
                            if (location.includes('consent.youtube.com')) {
                                console.log(`[DEBUG] Consent redirect detected`);
                                resolve({
                                    status: res.statusCode || 0,
                                    text: '',
                                    finalUrl: location,
                                    isConsent: true
                                });
                                return;
                            }

                            const redirectUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
                            makeRequest(redirectUrl, redirectCount + 1);
                            return;
                        }
                    }

                    let chunks = '';
                    res.setEncoding('utf8');
                    res.on('data', d => chunks += d);
                    res.on('end', () => {
                        console.log(`[DEBUG] Response received, length: ${chunks.length}`);
                        resolve({
                            status: res.statusCode || 0,
                            text: chunks,
                            finalUrl: currentUrl
                        });
                    });
                });

                req.on('error', reject);
                if (options.body) {
                    req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
                }
                req.end();
            };

            makeRequest(url, 0);
        });
    }

    private async fetchJSON(url: string, options?: any): Promise<any> {
        const { status, text } = await this.fetchText(url, options);
        if (status >= 400) {
            throw new Error(`HTTP ${status}: ${text?.slice(0, 200)}`);
        }
        try {
            return JSON.parse(text);
        } catch {
            throw new Error('Invalid JSON response');
        }
    }
}