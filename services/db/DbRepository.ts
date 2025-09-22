import Database from 'better-sqlite3';
import { UserRepository } from './UserRepository';
import { ActionRepository } from './ActionRepository';

export class DbRepository {
    private static instance: DbRepository;
    private db: Database.Database;
    private readonly user: string;

    public users: UserRepository;
    public actions: ActionRepository;

    private constructor(
         user: string,
    ) {
        this.user = user;
        this.db = new Database(user + 'twitch.db');
        this._initSchema();

        this.users = new UserRepository(this.db);
        this.actions = new ActionRepository(this.db);
    }

    public static getInstance(user: string): DbRepository {
        if (!DbRepository.instance || DbRepository.instance.user !== user) {
            DbRepository.instance = new DbRepository(user);
        }
        return DbRepository.instance;
    }

    private _initSchema() {
        this.db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_name TEXT,
        twitch_type TEXT,
        is_follower INTEGER DEFAULT 1,
        is_vip INTEGER DEFAULT 0,
        is_editor INTEGER DEFAULT 0,
        is_mod INTEGER DEFAULT 0,
        last_seen INTEGER,
        updated_at INTEGER,
        followed_at TEXT
      )
    `).run();

        this.db.prepare(`
      CREATE TABLE IF NOT EXISTS actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        params TEXT,
        status TEXT DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        execute_at INTEGER NOT NULL,
        executed_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `).run();
    }
}