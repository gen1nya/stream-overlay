import Database from 'better-sqlite3';
import { UserRepository } from './UserRepository';
import { ActionRepository } from './ActionRepository';
import { PityRepository } from './PityRepository';
import { LotteryRepository } from './LotteryRepository';
import { TriggerRepository } from './TriggerRepository';
import { RouletteRepository } from './RouletteRepository';
import fs from "fs";
import path from "path";

export class DbRepository {
    private static instance: DbRepository;
    private db: Database.Database;
    private readonly user: string;
    private static dbPath: string = './data';

    public users: UserRepository;
    public actions: ActionRepository;
    public pity: PityRepository;
    public lottery: LotteryRepository;
    public triggers: TriggerRepository;
    public roulette: RouletteRepository;

    private constructor(user: string) {
        this.user = user;

        if (!fs.existsSync(DbRepository.dbPath)) {
            fs.mkdirSync(DbRepository.dbPath, { recursive: true });
        }

        const dbFilePath = path.join(DbRepository.dbPath, `${user}_twitch.db`);
        this.db = new Database(dbFilePath);
        this._initSchema();

        this.users = new UserRepository(this.db);
        this.actions = new ActionRepository(this.db);
        this.pity = new PityRepository(this.db);
        this.lottery = new LotteryRepository(this.db);
        this.triggers = new TriggerRepository(this.db);
        this.roulette = new RouletteRepository(this.db);
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

        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS user_pity (
                user_id TEXT PRIMARY KEY,
                user_name TEXT DEFAULT 'unknown',
                pulls_since_5_star INTEGER DEFAULT 0,
                pulls_since_4_star INTEGER DEFAULT 0,
                pity_4_star_failed_rate_up INTEGER DEFAULT 0,
                is_guaranteed_5_star INTEGER DEFAULT 0
            )
        `).run();

        // Lottery tables
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS lottery_draws (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                child_user TEXT NOT NULL,
                initiator_id TEXT NOT NULL,
                initiator_name TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                ended_at INTEGER NOT NULL,
                winner_id TEXT,
                winner_name TEXT,
                participant_count INTEGER NOT NULL DEFAULT 0,
                status TEXT DEFAULT 'pending'
            )
        `).run();

        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS lottery_used_subjects (
                child_user TEXT PRIMARY KEY,
                draw_id INTEGER NOT NULL,
                used_at INTEGER NOT NULL,
                FOREIGN KEY (draw_id) REFERENCES lottery_draws(id)
            )
        `).run();

        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS lottery_stats (
                user_id TEXT PRIMARY KEY,
                user_name TEXT NOT NULL,
                total_entries INTEGER DEFAULT 0,
                total_wins INTEGER DEFAULT 0,
                total_initiated INTEGER DEFAULT 0,
                last_win_at INTEGER,
                updated_at INTEGER NOT NULL
            )
        `).run();

        // Trigger system tables
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS trigger_executions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trigger_id TEXT NOT NULL,
                trigger_name TEXT NOT NULL,
                event_type TEXT NOT NULL,
                event_id TEXT,
                source_user_id TEXT NOT NULL,
                source_user_name TEXT NOT NULL,
                target_user_id TEXT,
                target_user_name TEXT,
                context_args TEXT,
                context_input TEXT,
                status TEXT DEFAULT 'active',
                created_at INTEGER NOT NULL,
                completed_at INTEGER,
                cancelled_at INTEGER,
                cancel_reason TEXT
            )
        `).run();

        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS scheduled_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                execution_id INTEGER NOT NULL,
                action_type TEXT NOT NULL,
                action_params TEXT,
                target_user_id TEXT NOT NULL,
                target_user_name TEXT,
                execute_at INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                executed_at INTEGER,
                error_message TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (execution_id) REFERENCES trigger_executions(id)
            )
        `).run();

        // Index for efficient pending action queries
        this.db.prepare(`
            CREATE INDEX IF NOT EXISTS idx_scheduled_actions_pending
            ON scheduled_actions(execute_at) WHERE status = 'pending'
        `).run();

        // Roulette tables
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS roulette_plays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                result TEXT NOT NULL,
                was_muted INTEGER DEFAULT 1,
                created_at INTEGER NOT NULL
            )
        `).run();

        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS roulette_stats (
                user_id TEXT PRIMARY KEY,
                user_name TEXT NOT NULL,
                total_plays INTEGER DEFAULT 0,
                survivals INTEGER DEFAULT 0,
                deaths INTEGER DEFAULT 0,
                current_streak INTEGER DEFAULT 0,
                max_survival_streak INTEGER DEFAULT 0,
                max_death_streak INTEGER DEFAULT 0,
                last_play_at INTEGER NOT NULL
            )
        `).run();

        // Index for efficient play history queries
        this.db.prepare(`
            CREATE INDEX IF NOT EXISTS idx_roulette_plays_user
            ON roulette_plays(user_id, created_at)
        `).run();
    }
}