import type * as Database from 'better-sqlite3';

export interface User {
    id: string;
    name: string;
    displayName?: string | null;
    twitchType?: string | null;
    isFollower?: boolean;
    isVip?: boolean;
    isEditor?: boolean;
    isMod?: boolean;
    lastSeen?: number | null; // unix ms, can be null
    updatedAt?: number | null; // unix ms, can be null
    followedAt?: string | null; // ISO date string, can be null
}

/**
 * UserRepository — обёртка над better-sqlite3 для таблицы users.
 * Тут есть:
 *  - UPSERT, который не перетирает значения NULL-ами (COALESCE)
 *  - Безопасная пагинация и сортировка по last_seen (NULL → в конец)
 *  - Корректное сопоставление snake_case → camelCase
 */
export class UserRepository {
    private db: Database.Database;

    // Поля, алиаснутые под интерфейс User
    private readonly USER_SELECT = `
        id,
        name,
        display_name AS displayName,
        twitch_type  AS twitchType,
        is_follower  AS isFollower,
        is_vip       AS isVip,
        is_editor    AS isEditor,
        is_mod       AS isMod,
        last_seen    AS lastSeen,
        updated_at   AS updatedAt,
        followed_at AS followedAt
      `;

    // Безопасная сортировка: NULLы — в конец, потом по времени, затем стабилизируем по id
    private readonly ORDER_BY_SAFE = `
        CASE WHEN last_seen IS NULL THEN 1 ELSE 0 END,
        CAST(last_seen AS INTEGER) DESC,
        id ASC
      `;

    constructor(db: Database.Database) {
        this.db = db;
    }

    /** Обновляет поле last_seen и updated_at для пользователя. */
    updateLastSeen(userId: string, timestamp: number) {
        const query = `
          UPDATE users
          SET last_seen = @last_seen,
              updated_at = @updated_at
          WHERE id = @id
        `;
        this.db
            .prepare(query)
            .run({ id: String(userId), last_seen: timestamp, updated_at: Date.now() });
    }

    /** Обновляет поле last_seen и updated_at для пользователя по имени (регистр не важен). */
    updateLastSeenByName(userName: string, timestamp: number) {
        const query = `
          UPDATE users
          SET last_seen = @last_seen,
              updated_at = @updated_at
          WHERE LOWER(name) = LOWER(@name)
        `;
        this.db
            .prepare(query)
            .run({ name: userName, last_seen: timestamp, updated_at: Date.now() });
    }

    /**
     * Вставляет/обновляет пачку пользователей.
     * Если какое-то поле пришло как undefined → передаём NULL, а в DO UPDATE используем COALESCE,
     * чтобы NULL не перетирал имеющееся значение в БД.
     */
    upsertUsers(users: User[]) {
        const query = `
      INSERT INTO users (
        id, name, display_name, twitch_type,
        is_follower, is_vip, is_editor, is_mod,
        last_seen, updated_at, followed_at
      ) VALUES (
        @id, @name, @display_name, @twitch_type,
        @is_follower, @is_vip, @is_editor, @is_mod,
        @last_seen, @updated_at, @followed_at
      )
      ON CONFLICT(id) DO UPDATE SET
        name         = COALESCE(excluded.name,         users.name),
        display_name = COALESCE(excluded.display_name, users.display_name),
        twitch_type  = COALESCE(excluded.twitch_type,  users.twitch_type),
        is_follower  = COALESCE(excluded.is_follower,  users.is_follower),
        is_vip       = COALESCE(excluded.is_vip,       users.is_vip),
        is_editor    = COALESCE(excluded.is_editor,    users.is_editor),
        is_mod       = COALESCE(excluded.is_mod,       users.is_mod),
        last_seen    = COALESCE(excluded.last_seen,    users.last_seen),
        updated_at   = COALESCE(excluded.updated_at,   users.updated_at),
        followed_at   = COALESCE(excluded.followed_at,   users.followed_at)
    `;

        const stmt = this.db.prepare(query);

        const toBind = (u: User) => ({
            id: String(u.id),
            name: u.name ?? null,
            display_name: u.displayName ?? null,
            twitch_type: u.twitchType ?? null,
            // boolean -> 0/1; undefined -> NULL (=> не затирать при апдейте)
            is_follower: u.isFollower === undefined ? null : Number(u.isFollower),
            is_vip:      u.isVip      === undefined ? null : Number(u.isVip),
            is_editor:   u.isEditor   === undefined ? null : Number(u.isEditor),
            is_mod:      u.isMod      === undefined ? null : Number(u.isMod),
            last_seen:   u.lastSeen   ?? null,
            updated_at:  u.updatedAt  ?? null,
            followed_at: u.followedAt ?? null,
        });

        const tx = this.db.transaction((arr: User[]) => {
            for (const u of arr) stmt.run(toBind(u));
        });

        tx(users);
    }

    upsertUser(user: User) {
        this.upsertUsers([user]);
    }

    /** Возвращает количество пользователей. */
    getUsersLength(): number {
        // pluck() отдаёт скаляр напрямую
        return this.db.prepare(`SELECT COUNT(*) FROM users`).pluck().get() as number;
    }

    /** Маппинг строки БД → модель User (конвертируем 0/1 → boolean). */
    private rowToUser(r: any): User {
        return {
            id: String(r.id),
            name: r.name,
            displayName: r.displayName ?? null,
            twitchType: r.twitchType ?? null,
            isFollower: !!r.isFollower,
            isVip: !!r.isVip,
            isEditor: !!r.isEditor,
            isMod: !!r.isMod,
            lastSeen: r.lastSeen ?? null,
            updatedAt: r.updatedAt ?? null,
            followedAt: r.followedAt ?? null,
        };
    }

    /** Простой поиск по name/display_name с регистронезависимым сравнением. */
    searchUsers(query: string, offset: number, limit = 20): User[] {
        const like = `%${(transliterateRuToEn(query) ?? '').trim()}%`;
        const rows = this.db
            .prepare(
                `
        SELECT ${this.USER_SELECT}
        FROM users
        WHERE name LIKE @q COLLATE NOCASE
           OR display_name LIKE @q COLLATE NOCASE
        ORDER BY ${this.ORDER_BY_SAFE}
        LIMIT CAST(@limit AS INTEGER) OFFSET CAST(@offset AS INTEGER)
      `,
            )
            .all({ q: like, limit: toInt(limit, 20), offset: toInt(offset, 0) });

        return (rows as any[]).map((r) => this.rowToUser(r));
    }

    /** Получение страницы пользователей с детерминированной сортировкой. */
    getUsers(offset: number, limit = 20): User[] {
        const rows = this.db
            .prepare(
                `
        SELECT ${this.USER_SELECT}
        FROM users
        ORDER BY ${this.ORDER_BY_SAFE}
        LIMIT CAST(@limit AS INTEGER) OFFSET CAST(@offset AS INTEGER)
      `,
            )
            .all({ limit: toInt(limit, 20), offset: toInt(offset, 0) });
        return (rows as any[]).map((r) => this.rowToUser(r));
    }
}

// Вспомогательная функция для безопасного преобразования в целое (неотрицательное)
function toInt(x: unknown, def = 0): number {
    const n = Number.parseInt(String(x), 10);
    return Number.isFinite(n) && n >= 0 ? n : def;
}

export type TransliterateOptions = {
    slug?: boolean;
    lower?: boolean;
};

const CYRILLIC_RE =
    /[\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F\u1C80-\u1C8F]/;
// если у тебя среда поддерживает Unicode property escapes:
// const CYRILLIC_RE = /\p{Script=Cyrillic}/u;


export function transliterateRuToEn(input: string, opts: TransliterateOptions = {}): string {
    // ранний выход: нет кириллицы → вернуть без изменений
    if (!CYRILLIC_RE.test(input)) return input;

    const map: Record<string, string> = {
        'а': 'a','б': 'b','в': 'v','г': 'g','д': 'd',
        'е': 'e','ё': 'yo','ж': 'zh','з': 'z','и': 'i',
        'й': 'y','к': 'k','л': 'l','м': 'm','н': 'n',
        'о': 'o','п': 'p','р': 'r','с': 's','т': 't',
        'у': 'u','ф': 'f','х': 'kh','ц': 'ts','ч': 'ch',
        'ш': 'sh','щ': 'shch','ъ': '','ы': 'y','ь': '',
        'э': 'e','ю': 'yu','я': 'ya'
    };

    const vowels = new Set(['а','е','ё','и','о','у','ы','э','ю','я']);
    const softHard = new Set(['ь','ъ']);

    let out = '';
    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        const lower = ch.toLowerCase();

        let piece: string;
        if (lower === 'е') {
            const prev = i > 0 ? input[i - 1].toLowerCase() : '';
            const useYe = i === 0 || vowels.has(prev) || softHard.has(prev);
            piece = useYe ? 'ye' : 'e';
        } else if (map.hasOwnProperty(lower)) {
            piece = map[lower];
        } else {
            piece = ch; // оставляем прочие символы как есть
        }

        // сохраняем капс
        if (piece && ch !== lower) {
            piece = piece.charAt(0).toUpperCase() + piece.slice(1);
        }

        out += piece;
    }

    if (opts.lower) out = out.toLowerCase();

    if (opts.slug) {
        out = out
            .normalize('NFKD')
            .replace(/[^A-Za-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        if (opts.lower !== false) out = out.toLowerCase();
    }

    return out;
}