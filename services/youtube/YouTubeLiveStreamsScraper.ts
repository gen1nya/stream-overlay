import {ipcMain} from "electron";
import ElectronStore from "electron-store";
import {StoreSchema} from "../store/StoreSchema";
import {YouTubeChatReader} from "./chat-reader";
import type {Message} from "./types";

interface LiveStream {
    title: string;
    videoId: string;
    url: string;
    thumbnailUrl: string;
    isLive: boolean;
    viewerCount?: string;
    scheduledStartTime?: string;
}

interface ChannelInfo {
    channelId: string;
    channelName: string;
    channelUrl: string;
}

interface YouTubeTab {
    tabRenderer?: {
        title?: string;
        selected?: boolean;
        endpoint?: {
            commandMetadata?: {
                webCommandMetadata?: {
                    url?: string;
                };
            };
        };
        content?: {
            richGridRenderer?: {
                contents?: any[];
            };
            sectionListRenderer?: {
                contents?: Array<{
                    itemSectionRenderer?: {
                        contents?: any[];
                    };
                }>;
            };
        };
    };
}

class YouTubeLiveStreamsScraper {
    private readonly baseUrl = 'https://www.youtube.com';
    private channelId: string | null = null;
    private liveStreams: LiveStream[] = [];
    private chatReaders = new Map<string, YouTubeChatReader>();
    private store: ElectronStore<StoreSchema>;
    private updater: NodeJS.Timeout | null = null;
    private isFetching = false;
    private readonly pollingMs = 60_000;
    private onMessage: (message: Message) => void;

    constructor(
        store: ElectronStore<StoreSchema>,
        onMessage: (message: Message) => void
    ) {
        this.store = store;
        this.channelId = this.store.get('youtube')?.channelId || null;

        this.onMessage = onMessage;
        // сразу один проход
        this.fetchLiveStreams();

        // периодический опрос
        this.updater = setInterval(() => {
            void this.fetchLiveStreams();
        }, this.pollingMs);
    }

    setupIPCs() {
        ipcMain.handle('youtube:setChannelName', async (_event, channelId: string) => {
            this.channelId = channelId;
            this.store.set('youtube.channelId', channelId);
            console.log(`Канал установлен: ${channelId}`);
            // триггернем обновление сразу
            void this.fetchLiveStreams();
            return true;
        });

        ipcMain.handle('youtube:getLiveStreams', async () => {
            return this.liveStreams;
        });

        ipcMain.handle('youtube:enableScraper', async (_event, enable: boolean) => {
            console.log(`YouTube scraper ${enable ? 'включен' : 'выключен'}`);
            this.store.set('youtube.enabled', enable);
            if (enable) {
                if (!this.updater) {
                    this.updater = setInterval(() => void this.fetchLiveStreams(), this.pollingMs);
                }
                void this.fetchLiveStreams();
            } else {
                this.dispose();
            }
            return true;
        });

        ipcMain.handle('youtube:getConfig', async () => {
            return this.store.get('youtube');
        });
    }

    dispose() {
        if (this.updater) {
            console.log('Остановка YouTube Live Streams Scraper');
            clearInterval(this.updater);
            this.updater = null;
        }
        this.stopAllChats();
    }

    private stopAllChats() {
        for (const reader of this.chatReaders.values()) {
            try {
                reader.stop?.();
            } catch (e) {
                console.error('Ошибка при остановке чата:', e);
            }
        }
        this.chatReaders.clear();
    }

    private async fetchLiveStreams() {
        if (!this.channelId) {
            console.warn('Канал не установлен, пропускаем обновление трансляций');
            return;
        }
        if (!this.store.get('youtube.enabled')) return
        if (this.isFetching) return; // анти-гонка
        this.isFetching = true;
        try {
            console.log(`Обновление трансляций для канала: ${this.channelId}`);
            const streams = await this.getLiveStreamsByChannelName(this.channelId);

            if (!this.store.get('youtube.enabled')) return;

            this.liveStreams = streams;
            console.log(`Найдено ${streams.length} трансляций для канала "${this.channelId}"`);

            // Берём только живые
            const live = streams.filter(s => s.isLive);
            const liveIds = new Set(live.map(s => s.videoId));

            // 1) Запускаем новые/остановленные чаты
            for (const stream of live) {
                const id = stream.videoId;
                const existing = this.chatReaders.get(id);

                if (!existing) {
                    console.log(`Создание нового чата для видео: ${id}`);
                    const chatReader = new YouTubeChatReader((message) => {
                        this.onMessage(message)
                    });
                    this.chatReaders.set(id, chatReader);
                    try {
                        chatReader.start(id)
                            .then(() => console.log(`Обработка чата завершена для видео: ${id}`))
                            .catch(err => {
                                console.error(`Ошибка при запуске чата для видео ${id}:`, err);
                                this.chatReaders.delete(id);
                            });
                    } catch (error) {
                        console.error(`Ошибка при запуске чата для видео ${id}:`, error);
                        // если не стартанул — выпиливаем, чтобы попробовать потом снова
                        this.chatReaders.delete(id);
                    }
                } else {
                    if (!existing.isRunning) {
                        console.log(`Перезапуск чата для видео: ${id}`);
                        existing.start(id).catch(e => console.error(e));
                    } else {
                         console.log(`Чат уже запущен для видео: ${id}`);
                    }
                }
            }

            const ids = Array.from(this.chatReaders.keys());
            for (const id of ids) {
                if (!liveIds.has(id)) {
                    console.log(`Остановка чата: ${id} (стрим больше не live)`);
                    try { this.chatReaders.get(id)?.stop?.(); } catch (e) { console.error(e); }
                    this.chatReaders.delete(id);
                }
            }
        } catch (error) {
            console.error('Ошибка при обновлении трансляций:', error);
        } finally {
            this.isFetching = false;
        }
    }

    /**
     * Получает список трансляций канала по имени канала
     */
    async getLiveStreamsByChannelName(channelName: string): Promise<LiveStream[]> {
        try {
            // Сначала находим канал по имени
            const channelInfo = await this.findChannelByName(channelName);
            if (!channelInfo) {
                throw new Error(`Канал с именем "${channelName}" не найден`);
            }

            // Затем получаем трансляции
            return await this.getLiveStreamsByChannelId(channelInfo.channelId);
        } catch (error) {
            console.error('Ошибка при получении трансляций:', error);
            throw error;
        }
    }

    /**
     * Ищет канал по имени через поиск YouTube
     */
    private async findChannelByName(channelName: string): Promise<ChannelInfo | null> {
        const searchUrl = `${this.baseUrl}/results?search_query=${encodeURIComponent(channelName)}&sp=EgIQAg%253D%253D`; // sp параметр фильтрует только каналы

        try {
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();

            // Извлекаем данные из JavaScript объекта на странице
            const scriptRegex = /var ytInitialData = ({.+?});/;
            const match = html.match(scriptRegex);

            if (!match) {
                throw new Error('Не удалось найти данные на странице поиска');
            }

            const data = JSON.parse(match[1]);
            const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;

            if (!contents) {
                return null;
            }

            // Ищем первый канал в результатах
            for (const item of contents) {
                if (item.channelRenderer) {
                    const channel = item.channelRenderer;
                    return {
                        channelId: channel.channelId,
                        channelName: channel.title.simpleText,
                        channelUrl: `${this.baseUrl}/channel/${channel.channelId}`
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Ошибка при поиске канала:', error);
            return null;
        }
    }

    /**
     * Получает список трансляций по ID канала
     */
    async getLiveStreamsByChannelId(channelId: string): Promise<LiveStream[]> {
        // Используем страницу "Live" канала
        const liveUrl = `${this.baseUrl}/channel/${channelId}/streams`;

        try {
            const response = await fetch(liveUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();
            return this.parseStreamsFromHtml(html);

        } catch (error) {
            console.error('Ошибка при получении страницы трансляций:', error);
            throw error;
        }
    }

    /**
     * Парсит HTML страницы и извлекает информацию о трансляциях
     */
    private parseStreamsFromHtml(html: string): LiveStream[] {
        const streams: LiveStream[] = [];

        try {
            // Извлекаем ytInitialData
            const scriptRegex = /var ytInitialData = ({.+?});/;
            const match = html.match(scriptRegex);

            if (!match) {
                console.warn('Не удалось найти ytInitialData');
                return streams;
            }

            const data = JSON.parse(match[1]);

            // Навигируемся по структуре данных YouTube
            const tabs: YouTubeTab[] = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];

            if (!tabs || tabs.length === 0) {
                return streams;
            }

            // Ищем вкладку с трансляциями (обычно это последняя вкладка)
            let streamTab: any = null;
            for (const tab of tabs) {
                // Проверяем, что tab и tabRenderer существуют
                if (tab && tab.tabRenderer) {
                    const tabRenderer = tab.tabRenderer;
                    if (tabRenderer.title === 'Live' ||
                        tabRenderer.selected ||
                        tabRenderer.endpoint?.commandMetadata?.webCommandMetadata?.url?.includes('/streams')) {
                        streamTab = tab;
                        break;
                    }
                }
            }

            if (!streamTab || !streamTab.tabRenderer) {
                return streams;
            }

            const contents = streamTab.tabRenderer.content?.richGridRenderer?.contents ||
                streamTab.tabRenderer.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;

            if (!contents) {
                return streams;
            }

            // Парсим каждое видео
            for (const item of contents) {
                const videoRenderer = item.richItemRenderer?.content?.videoRenderer || item.videoRenderer;

                if (videoRenderer && videoRenderer.videoId) {
                    const stream = this.parseVideoRenderer(videoRenderer);
                    if (stream) {
                        streams.push(stream);
                    }
                }
            }

        } catch (error) {
            console.error('Ошибка при парсинге HTML:', error);
        }

        return streams;
    }

    /**
     * Парсит данные отдельного видео
     */
    private parseVideoRenderer(videoRenderer: any): LiveStream | null {
        try {
            const videoId = videoRenderer.videoId;
            const title = videoRenderer.title?.runs?.[0]?.text || videoRenderer.title?.simpleText || 'Без названия';

            // Множественные способы определения live статуса
            let isLive = false;

            // Способ 1: Проверяем badges
            const badges = videoRenderer.badges || [];
            const badgeIsLive = badges.some((badge: any) => {
                const label = badge.metadataBadgeRenderer?.label;
                const style = badge.metadataBadgeRenderer?.style;
                return label === 'LIVE' ||
                    label === 'В ЭФИРЕ' ||
                    style === 'BADGE_STYLE_TYPE_LIVE_NOW' ||
                    style === 'LIVE';
            });

            // Способ 2: Проверяем thumbnailOverlays - у активных трансляций style === 'LIVE'
            const thumbnailOverlays = videoRenderer.thumbnailOverlays || [];
            const overlayIsLive = thumbnailOverlays.some((overlay: any) => {
                const style = overlay.thumbnailOverlayTimeStatusRenderer?.style;
                return style === 'LIVE';
            });

            // Способ 3: Проверяем viewCountText - у завершенных трансляций есть слово "προβολές" (просмотры)
            const viewCountText = videoRenderer.viewCountText?.simpleText || videoRenderer.viewCountText?.runs?.[0]?.text || '';
            const isFinishedStream = viewCountText.includes('προβολές') ||
                viewCountText.includes('просмотров') ||
                viewCountText.includes('views') ||
                viewCountText.includes('visualizações');

            // Способ 4: Проверяем publishedTimeText - у завершенных трансляций есть дата публикации
            const hasPublishedTime = videoRenderer.publishedTimeText?.simpleText;

            // Способ 5: Проверяем lengthText - у завершенных трансляций есть длительность
            const hasLength = videoRenderer.lengthText?.simpleText;

            // Способ 6: Проверяем upcomingEventData для будущих трансляций
            const isUpcoming = !!videoRenderer.upcomingEventData;

            // Окончательное решение: трансляция активна если:
            // 1. У неё есть overlay со стилем 'LIVE' И
            // 2. В viewCount НЕТ слова "просмотры" И
            // 3. НЕТ даты публикации И
            // 4. НЕТ длительности И
            // 5. Это не запланированная трансляция
            isLive = overlayIsLive &&
                !isFinishedStream &&
                !hasPublishedTime &&
                !hasLength &&
                !isUpcoming;

            // Получаем информацию о просмотрах/зрителях
            let viewerCount: string | undefined = undefined;
            if (videoRenderer.viewCountText?.simpleText) {
                const rawCount = videoRenderer.viewCountText.simpleText;
                viewerCount = this.extractNumber(rawCount)?.toString() ?? "0"
            } else if (videoRenderer.viewCountText?.runs?.[0]?.text) {
                const rawCount = videoRenderer.viewCountText.runs[0].text;
                viewerCount = this.extractNumber(rawCount)?.toString() ?? "0"
            }

            // Получаем время начала для запланированных трансляций
            let scheduledStartTime = undefined;
            if (videoRenderer.upcomingEventData?.startTime) {
                scheduledStartTime = videoRenderer.upcomingEventData.startTime;
            }

            // Получаем превью
            const thumbnails = videoRenderer.thumbnail?.thumbnails || [];
            const thumbnailUrl = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : '';

            // Дебаг информация
            console.log(`Видео: ${title}`);
            console.log(`  - Badges:`, badges.map((b: any) => ({
                label: b.metadataBadgeRenderer?.label,
                style: b.metadataBadgeRenderer?.style
            })));
            console.log(`  - ThumbnailOverlays:`, thumbnailOverlays.map((o: any) => ({
                style: o.thumbnailOverlayTimeStatusRenderer?.style,
                text: o.thumbnailOverlayTimeStatusRenderer?.text?.simpleText
            })));
            console.log(`  - ViewCount: "${viewCountText}"`);
            console.log(`  - PublishedTime: "${hasPublishedTime}"`);
            console.log(`  - Length: "${hasLength}"`);
            console.log(`  - IsUpcoming: ${isUpcoming}`);
            console.log(`  - Final isLive: ${isLive}\n`);

            return {
                title,
                videoId,
                url: `${this.baseUrl}/watch?v=${videoId}`,
                thumbnailUrl,
                isLive,
                viewerCount,
                scheduledStartTime
            };

        } catch (error) {
            console.error('Ошибка при парсинге видео:', error);
            return null;
        }
    }

    /**
     * Альтернативный метод через RSS канала (только для публичных каналов)
     */
    async getLiveStreamsViaRSS(channelId: string): Promise<LiveStream[]> {
        const rssUrl = `${this.baseUrl}/feeds/videos.xml?channel_id=${channelId}`;

        try {
            const response = await fetch(rssUrl);
            const xmlText = await response.text();

            // Простой парсер XML для извлечения видео
            const videoRegex = /<entry>[\s\S]*?<yt:videoId>(.*?)<\/yt:videoId>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<\/entry>/g;
            const streams: LiveStream[] = [];

            let match;
            while ((match = videoRegex.exec(xmlText)) !== null) {
                const [, videoId, title] = match;

                // Дополнительно проверяем, является ли видео трансляцией
                const isLiveStream = await this.checkIfVideoIsLive(videoId);

                if (isLiveStream) {
                    streams.push({
                        title: title.replace(/<!\[CDATA\[|\]\]>/g, ''),
                        videoId,
                        url: `${this.baseUrl}/watch?v=${videoId}`,
                        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                        isLive: true
                    });
                }
            }

            return streams;

        } catch (error) {
            console.error('Ошибка при получении RSS:', error);
            return [];
        }
    }

    /**
     * Проверяет, является ли видео активной трансляцией
     */
    private async checkIfVideoIsLive(videoId: string): Promise<boolean> {
        try {
            const videoUrl = `${this.baseUrl}/watch?v=${videoId}`;
            const response = await fetch(videoUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const html = await response.text();

            // Ищем индикаторы живой трансляции
            return html.includes('"isLiveContent":true') ||
                html.includes('LIVE') ||
                html.includes('"liveBroadcastDetails"');

        } catch (error) {
            console.error('Ошибка при проверке видео:', error);
            return false;
        }
    }

    private extractNumber(str: string | null): number | null {
        if (!str) return null;
        const match = str.match(/\d+/);
        return match ? Number(match[0]) : null;
    }
}

export { YouTubeLiveStreamsScraper, LiveStream, ChannelInfo };