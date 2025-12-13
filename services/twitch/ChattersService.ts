import { fetchAllChatters, Chatter } from './authorizedHelixApi';

export interface ChatterInfo {
    userId: string;
    login: string;
    displayName: string;
    joinedAt: number;
}

/**
 * In-memory сервис для отслеживания пользователей в чате.
 *
 * Загружает начальный список через Helix API,
 * затем обновляется по JOIN/PART событиям из IRC.
 */
export class ChattersService {
    private static instance: ChattersService | null = null;

    // Map<user_login (lowercase), ChatterInfo>
    private chatters: Map<string, ChatterInfo> = new Map();
    private initialized: boolean = false;
    private lastRefresh: number = 0;
    private refreshIntervalMs: number = 5 * 60 * 1000; // 5 минут

    private constructor() {}

    static getInstance(): ChattersService {
        if (!ChattersService.instance) {
            ChattersService.instance = new ChattersService();
        }
        return ChattersService.instance;
    }

    /**
     * Инициализация - загрузка списка из Helix API
     */
    async initialize(): Promise<void> {
        if (this.initialized && Date.now() - this.lastRefresh < this.refreshIntervalMs) {
            return;
        }

        try {
            console.log('🔄 ChattersService: Загрузка списка пользователей чата...');
            const chatters = await fetchAllChatters();

            this.chatters.clear();
            const now = Date.now();

            for (const chatter of chatters) {
                this.chatters.set(chatter.user_login.toLowerCase(), {
                    userId: chatter.user_id,
                    login: chatter.user_login,
                    displayName: chatter.user_name,
                    joinedAt: now
                });
            }

            this.initialized = true;
            this.lastRefresh = now;
            console.log(`✅ ChattersService: Загружено ${this.chatters.size} пользователей`);
        } catch (error: any) {
            console.error('❌ ChattersService: Ошибка загрузки chatters:', error?.message || error);
            // Не бросаем ошибку - продолжаем работать с пустым списком
            // JOIN/PART события будут постепенно наполнять список
        }
    }

    /**
     * Обработка JOIN события
     */
    onUserJoin(login: string, displayName?: string): void {
        const key = login.toLowerCase();
        if (!this.chatters.has(key)) {
            this.chatters.set(key, {
                userId: '', // Не знаем ID из JOIN события
                login: login,
                displayName: displayName || login,
                joinedAt: Date.now()
            });
            // console.log(`👋 ChattersService: ${login} joined (total: ${this.chatters.size})`);
        }
    }

    /**
     * Обработка PART события
     */
    onUserPart(login: string): void {
        const key = login.toLowerCase();
        if (this.chatters.has(key)) {
            this.chatters.delete(key);
            // console.log(`👋 ChattersService: ${login} left (total: ${this.chatters.size})`);
        }
    }

    /**
     * Обработка сообщения в чате - добавляем пользователя если его нет
     */
    onUserMessage(userId: string, login: string, displayName: string): void {
        const key = login.toLowerCase();
        if (!this.chatters.has(key)) {
            this.chatters.set(key, {
                userId: userId,
                login: login,
                displayName: displayName,
                joinedAt: Date.now()
            });
        } else {
            // Обновляем userId если он был пустой
            const existing = this.chatters.get(key)!;
            if (!existing.userId && userId) {
                existing.userId = userId;
            }
        }
    }

    /**
     * Проверка присутствия пользователя в чате
     */
    isUserInChat(login: string): boolean {
        return this.chatters.has(login.toLowerCase());
    }

    /**
     * Получение информации о пользователе
     */
    getChatter(login: string): ChatterInfo | null {
        return this.chatters.get(login.toLowerCase()) || null;
    }

    /**
     * Получение списка всех пользователей в чате
     */
    getAllChatters(): ChatterInfo[] {
        return Array.from(this.chatters.values());
    }

    /**
     * Поиск пользователей по частичному совпадению логина
     */
    searchChatters(query: string, limit: number = 10): ChatterInfo[] {
        const lowerQuery = query.toLowerCase();
        const results: ChatterInfo[] = [];

        for (const chatter of this.chatters.values()) {
            if (chatter.login.toLowerCase().includes(lowerQuery) ||
                chatter.displayName.toLowerCase().includes(lowerQuery)) {
                results.push(chatter);
                if (results.length >= limit) break;
            }
        }

        return results;
    }

    /**
     * Получение случайного пользователя из чата
     * @param excludeUserId - исключить пользователя по userId (опционально)
     * @returns login случайного пользователя или null
     */
    getRandomChatter(excludeUserId?: string): string | null {
        let chatters = this.getAllChatters();

        // Исключаем пользователя если указан excludeUserId
        if (excludeUserId) {
            chatters = chatters.filter(c => c.userId !== excludeUserId);
        }

        if (chatters.length === 0) return null;

        const randomChatter = chatters[Math.floor(Math.random() * chatters.length)];
        return randomChatter.login;
    }

    /**
     * Количество пользователей в чате
     */
    get count(): number {
        return this.chatters.size;
    }

    /**
     * Очистка (при дисконнекте)
     */
    clear(): void {
        this.chatters.clear();
        this.initialized = false;
        console.log('🧹 ChattersService: Список очищен');
    }
}
