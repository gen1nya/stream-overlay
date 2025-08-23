import type Database from 'better-sqlite3';

export interface User {
    id: string;
    name: string;
    displayName?: string;
    twitchType?: string;
    isFollower?: boolean;
    isVip?: boolean;
    isEditor?: boolean;
    isMod?: boolean;
    lastSeen?: number;
    updatedAt?: number;
}

export class UserRepository {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

  upsertUsers(users: User[]) {
        const query = `
          INSERT INTO users (id, name, display_name, twitch_type, is_follower, is_vip, is_editor, is_mod, last_seen, updated_at)
          VALUES (@id, @name, @displayName, @twitchType, @isFollower, @isVip, @isEditor, @isMod, @lastSeen, @updatedAt)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            display_name = excluded.display_name,
            twitch_type = excluded.twitch_type,
            is_follower = excluded.is_follower,
            is_vip = excluded.is_vip,
            is_editor = excluded.is_editor,
            is_mod = excluded.is_mod,
            last_seen = excluded.last_seen,
            updated_at = excluded.updated_at
        `;
        const stmt = this.db.prepare(query);
        const transaction = this.db.transaction((users: User[]) => {
            users.forEach(user => stmt.run(user));
        });
        transaction(users);
    }

    upsertUser(user: User) {
        this.upsertUsers([user]);
    }

    getUserById(id: string): User | undefined {
        return this.db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as User | undefined;
    }

    getRecentUsers(limit = 50): User[] {
        return this.db.prepare(`
      SELECT * FROM users ORDER BY last_seen DESC LIMIT ?
    `).all(limit) as User[];
    }
}