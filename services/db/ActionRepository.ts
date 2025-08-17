import type Database from 'better-sqlite3';

export interface Action {
    id?: number;
    userId: string;
    actionType: string;
    params?: string;   // JSON
    status?: string;
    createdAt: number;
    executeAt: number;
    executedAt?: number;
}

export class ActionRepository {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    addAction(action: Action) {
        return this.db.prepare(`
      INSERT INTO actions (user_id, action_type, params, status, created_at, execute_at, executed_at)
      VALUES (@userId, @actionType, @params, @status, @createdAt, @executeAt, @executedAt)
    `).run(action);
    }

    getPendingActions(now: number): Action[] {
        return this.db.prepare(`
      SELECT * FROM actions
      WHERE status = 'pending' AND execute_at <= ?
    `).all(now) as Action[];
    }

    markAsDone(id: number) {
        this.db.prepare(`
      UPDATE actions SET status = 'done', executed_at = ? WHERE id = ?
    `).run(Date.now(), id);
    }
}