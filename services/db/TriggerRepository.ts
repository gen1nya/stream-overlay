import type Database from 'better-sqlite3';

// ============================================
// Trigger Execution Types
// ============================================

export interface TriggerExecution {
    id?: number;
    triggerId: string;
    triggerName: string;

    // Event context
    eventType: string;
    eventId?: string;

    // Source user (who triggered)
    sourceUserId: string;
    sourceUserName: string;

    // Target user (may differ from source, e.g. arg_user)
    targetUserId?: string;
    targetUserName?: string;

    // Command arguments / reward text
    contextArgs?: string;    // JSON array
    contextInput?: string;

    // Status
    status: 'active' | 'completed' | 'cancelled';
    createdAt: number;
    completedAt?: number;
    cancelledAt?: number;
    cancelReason?: string;
}

export interface CreateExecutionData {
    triggerId: string;
    triggerName: string;
    eventType: string;
    eventId?: string;
    sourceUserId: string;
    sourceUserName: string;
    targetUserId?: string;
    targetUserName?: string;
    contextArgs?: string[];
    contextInput?: string;
}

// ============================================
// Scheduled Action Types
// ============================================

export interface ScheduledAction {
    id?: number;
    executionId: number;

    // Action details
    actionType: string;
    actionParams?: string;   // JSON

    // Target
    targetUserId: string;
    targetUserName?: string;

    // Scheduling
    executeAt: number;

    // Status
    status: 'pending' | 'executed' | 'cancelled' | 'failed';
    executedAt?: number;
    errorMessage?: string;

    createdAt: number;
}

export interface ScheduleActionData {
    executionId: number;
    actionType: string;
    actionParams?: string;
    targetUserId: string;
    targetUserName?: string;
    executeAt: number;
}

// ============================================
// Query Result Types
// ============================================

export interface ActiveVip {
    userId: string;
    userName: string;
    expiresAt: number;
    actionId: number;
    executionId: number;
}

export interface ScheduledActionWithExecution extends ScheduledAction {
    triggerId?: string;
    triggerName?: string;
    sourceUserName?: string;
}

// ============================================
// Repository Implementation
// ============================================

export class TriggerRepository {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    // ============================================
    // Executions
    // ============================================

    createExecution(data: CreateExecutionData): number {
        const result = this.db.prepare(`
            INSERT INTO trigger_executions (
                trigger_id, trigger_name, event_type, event_id,
                source_user_id, source_user_name,
                target_user_id, target_user_name,
                context_args, context_input,
                status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
        `).run(
            data.triggerId,
            data.triggerName,
            data.eventType,
            data.eventId ?? null,
            data.sourceUserId,
            data.sourceUserName,
            data.targetUserId ?? null,
            data.targetUserName ?? null,
            data.contextArgs ? JSON.stringify(data.contextArgs) : null,
            data.contextInput ?? null,
            Date.now()
        );

        return result.lastInsertRowid as number;
    }

    getExecution(id: number): TriggerExecution | null {
        const row = this.db.prepare(`
            SELECT
                id, trigger_id as triggerId, trigger_name as triggerName,
                event_type as eventType, event_id as eventId,
                source_user_id as sourceUserId, source_user_name as sourceUserName,
                target_user_id as targetUserId, target_user_name as targetUserName,
                context_args as contextArgs, context_input as contextInput,
                status, created_at as createdAt,
                completed_at as completedAt, cancelled_at as cancelledAt,
                cancel_reason as cancelReason
            FROM trigger_executions WHERE id = ?
        `).get(id) as TriggerExecution | undefined;

        return row ?? null;
    }

    updateExecutionStatus(id: number, status: 'completed' | 'cancelled', reason?: string): void {
        if (status === 'completed') {
            this.db.prepare(`
                UPDATE trigger_executions
                SET status = 'completed', completed_at = ?
                WHERE id = ?
            `).run(Date.now(), id);
        } else {
            this.db.prepare(`
                UPDATE trigger_executions
                SET status = 'cancelled', cancelled_at = ?, cancel_reason = ?
                WHERE id = ?
            `).run(Date.now(), reason ?? null, id);
        }
    }

    getActiveExecutions(triggerId?: string): TriggerExecution[] {
        if (triggerId) {
            return this.db.prepare(`
                SELECT
                    id, trigger_id as triggerId, trigger_name as triggerName,
                    event_type as eventType, event_id as eventId,
                    source_user_id as sourceUserId, source_user_name as sourceUserName,
                    target_user_id as targetUserId, target_user_name as targetUserName,
                    context_args as contextArgs, context_input as contextInput,
                    status, created_at as createdAt
                FROM trigger_executions
                WHERE status = 'active' AND trigger_id = ?
                ORDER BY created_at DESC
            `).all(triggerId) as TriggerExecution[];
        }

        return this.db.prepare(`
            SELECT
                id, trigger_id as triggerId, trigger_name as triggerName,
                event_type as eventType, event_id as eventId,
                source_user_id as sourceUserId, source_user_name as sourceUserName,
                target_user_id as targetUserId, target_user_name as targetUserName,
                context_args as contextArgs, context_input as contextInput,
                status, created_at as createdAt
            FROM trigger_executions
            WHERE status = 'active'
            ORDER BY created_at DESC
        `).all() as TriggerExecution[];
    }

    getExecutions(options?: { limit?: number; triggerId?: string; offset?: number }): TriggerExecution[] {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;

        if (options?.triggerId) {
            return this.db.prepare(`
                SELECT
                    id, trigger_id as triggerId, trigger_name as triggerName,
                    event_type as eventType, event_id as eventId,
                    source_user_id as sourceUserId, source_user_name as sourceUserName,
                    target_user_id as targetUserId, target_user_name as targetUserName,
                    context_args as contextArgs, context_input as contextInput,
                    status, created_at as createdAt,
                    completed_at as completedAt, cancelled_at as cancelledAt
                FROM trigger_executions
                WHERE trigger_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `).all(options.triggerId, limit, offset) as TriggerExecution[];
        }

        return this.db.prepare(`
            SELECT
                id, trigger_id as triggerId, trigger_name as triggerName,
                event_type as eventType, event_id as eventId,
                source_user_id as sourceUserId, source_user_name as sourceUserName,
                target_user_id as targetUserId, target_user_name as targetUserName,
                context_args as contextArgs, context_input as contextInput,
                status, created_at as createdAt,
                completed_at as completedAt, cancelled_at as cancelledAt
            FROM trigger_executions
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `).all(limit, offset) as TriggerExecution[];
    }

    // ============================================
    // Scheduled Actions
    // ============================================

    scheduleAction(data: ScheduleActionData): number {
        const result = this.db.prepare(`
            INSERT INTO scheduled_actions (
                execution_id, action_type, action_params,
                target_user_id, target_user_name,
                execute_at, status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        `).run(
            data.executionId,
            data.actionType,
            data.actionParams ?? null,
            data.targetUserId,
            data.targetUserName ?? null,
            data.executeAt,
            Date.now()
        );

        return result.lastInsertRowid as number;
    }

    getPendingActions(now: number): ScheduledAction[] {
        return this.db.prepare(`
            SELECT
                id, execution_id as executionId,
                action_type as actionType, action_params as actionParams,
                target_user_id as targetUserId, target_user_name as targetUserName,
                execute_at as executeAt, status,
                executed_at as executedAt, error_message as errorMessage,
                created_at as createdAt
            FROM scheduled_actions
            WHERE status = 'pending' AND execute_at <= ?
            ORDER BY execute_at ASC
        `).all(now) as ScheduledAction[];
    }

    getAllPendingActions(): ScheduledActionWithExecution[] {
        return this.db.prepare(`
            SELECT
                sa.id, sa.execution_id as executionId,
                sa.action_type as actionType, sa.action_params as actionParams,
                sa.target_user_id as targetUserId, sa.target_user_name as targetUserName,
                sa.execute_at as executeAt, sa.status,
                sa.created_at as createdAt,
                te.trigger_id as triggerId, te.trigger_name as triggerName,
                te.source_user_name as sourceUserName
            FROM scheduled_actions sa
            LEFT JOIN trigger_executions te ON sa.execution_id = te.id
            WHERE sa.status = 'pending'
            ORDER BY sa.execute_at ASC
        `).all() as ScheduledActionWithExecution[];
    }

    markActionExecuted(id: number): void {
        this.db.prepare(`
            UPDATE scheduled_actions
            SET status = 'executed', executed_at = ?
            WHERE id = ?
        `).run(Date.now(), id);

        // Check if all actions for this execution are done
        this._checkExecutionCompletion(id);
    }

    markActionFailed(id: number, error: string): void {
        this.db.prepare(`
            UPDATE scheduled_actions
            SET status = 'failed', executed_at = ?, error_message = ?
            WHERE id = ?
        `).run(Date.now(), error, id);
    }

    cancelAction(id: number, reason?: string): void {
        this.db.prepare(`
            UPDATE scheduled_actions
            SET status = 'cancelled', error_message = ?
            WHERE id = ? AND status = 'pending'
        `).run(reason ?? 'Cancelled by user', id);
    }

    cancelByExecution(executionId: number, reason?: string): void {
        this.db.prepare(`
            UPDATE scheduled_actions
            SET status = 'cancelled', error_message = ?
            WHERE execution_id = ? AND status = 'pending'
        `).run(reason ?? 'Execution cancelled', executionId);

        this.updateExecutionStatus(executionId, 'cancelled', reason);
    }

    cancelByUserAndType(targetUserId: string, actionType: string, reason?: string): number {
        const result = this.db.prepare(`
            UPDATE scheduled_actions
            SET status = 'cancelled', error_message = ?
            WHERE target_user_id = ? AND action_type = ? AND status = 'pending'
        `).run(reason ?? 'Cancelled', targetUserId, actionType);

        return result.changes;
    }

    // ============================================
    // UI Queries
    // ============================================

    getScheduledActionsForUser(userId: string): ScheduledActionWithExecution[] {
        return this.db.prepare(`
            SELECT
                sa.id, sa.execution_id as executionId,
                sa.action_type as actionType, sa.action_params as actionParams,
                sa.target_user_id as targetUserId, sa.target_user_name as targetUserName,
                sa.execute_at as executeAt, sa.status,
                sa.created_at as createdAt,
                te.trigger_id as triggerId, te.trigger_name as triggerName,
                te.source_user_name as sourceUserName
            FROM scheduled_actions sa
            LEFT JOIN trigger_executions te ON sa.execution_id = te.id
            WHERE sa.target_user_id = ? AND sa.status = 'pending'
            ORDER BY sa.execute_at ASC
        `).all(userId) as ScheduledActionWithExecution[];
    }

    getActiveVips(): ActiveVip[] {
        return this.db.prepare(`
            SELECT
                target_user_id as userId,
                target_user_name as userName,
                execute_at as expiresAt,
                id as actionId,
                execution_id as executionId
            FROM scheduled_actions
            WHERE action_type = 'remove_vip' AND status = 'pending'
            ORDER BY execute_at ASC
        `).all() as ActiveVip[];
    }

    getActiveMods(): ActiveVip[] {
        return this.db.prepare(`
            SELECT
                target_user_id as userId,
                target_user_name as userName,
                execute_at as expiresAt,
                id as actionId,
                execution_id as executionId
            FROM scheduled_actions
            WHERE action_type = 'remove_mod' AND status = 'pending'
            ORDER BY execute_at ASC
        `).all() as ActiveVip[];
    }

    getScheduledRemoveForUser(targetUserId: string, actionType: 'remove_vip' | 'remove_mod'): ScheduledAction | null {
        const row = this.db.prepare(`
            SELECT
                id, execution_id as executionId,
                action_type as actionType, action_params as actionParams,
                target_user_id as targetUserId, target_user_name as targetUserName,
                execute_at as executeAt, status, created_at as createdAt
            FROM scheduled_actions
            WHERE target_user_id = ? AND action_type = ? AND status = 'pending'
            ORDER BY execute_at DESC
            LIMIT 1
        `).get(targetUserId, actionType) as ScheduledAction | undefined;

        return row ?? null;
    }

    extendScheduledAction(id: number, newExecuteAt: number): void {
        this.db.prepare(`
            UPDATE scheduled_actions
            SET execute_at = ?
            WHERE id = ? AND status = 'pending'
        `).run(newExecuteAt, id);
    }

    // ============================================
    // Private Helpers
    // ============================================

    private _checkExecutionCompletion(actionId: number): void {
        // Get execution ID for this action
        const action = this.db.prepare(`
            SELECT execution_id as executionId FROM scheduled_actions WHERE id = ?
        `).get(actionId) as { executionId: number } | undefined;

        if (!action) return;

        // Check if all actions for this execution are completed
        const pending = this.db.prepare(`
            SELECT COUNT(*) as count FROM scheduled_actions
            WHERE execution_id = ? AND status = 'pending'
        `).get(action.executionId) as { count: number };

        if (pending.count === 0) {
            this.updateExecutionStatus(action.executionId, 'completed');
        }
    }
}
