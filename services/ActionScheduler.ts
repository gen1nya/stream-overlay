import { TriggerRepository, ScheduledAction } from './db/TriggerRepository';
import { LogService } from './logService';
import * as helixApi from './twitch/authorizedHelixApi';

interface SendMessageFunc {
    (message: string): Promise<void>;
}

interface ActionSchedulerDependencies {
    getRepository: () => TriggerRepository | null;
    logService: LogService;
    sendMessage: SendMessageFunc;
}

export class ActionScheduler {
    private intervalId: NodeJS.Timeout | null = null;
    private readonly POLL_INTERVAL = 30_000; // 30 seconds
    private readonly deps: ActionSchedulerDependencies;
    private isRunning = false;

    constructor(deps: ActionSchedulerDependencies) {
        this.deps = deps;
    }

    start(): void {
        if (this.intervalId) {
            return; // Already running
        }

        this.deps.logService.logMessage('[ActionScheduler] Starting scheduler');
        this.intervalId = setInterval(() => this.tick(), this.POLL_INTERVAL);

        // Run immediately on start
        this.tick();
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.deps.logService.logMessage('[ActionScheduler] Stopped scheduler');
        }
    }

    isActive(): boolean {
        return this.intervalId !== null;
    }

    /**
     * Force an immediate check for pending actions
     */
    async forceCheck(): Promise<void> {
        await this.tick();
    }

    private async tick(): Promise<void> {
        // Prevent concurrent execution
        if (this.isRunning) {
            return;
        }

        const repository = this.deps.getRepository();
        if (!repository) {
            return; // No user logged in yet
        }

        this.isRunning = true;

        try {
            const now = Date.now();
            const pendingActions = repository.getPendingActions(now);

            if (pendingActions.length > 0) {
                this.deps.logService.logMessage(
                    `[ActionScheduler] Found ${pendingActions.length} pending action(s)`
                );
            }

            for (const action of pendingActions) {
                await this.executeAction(action, repository);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.deps.logService.logMessage(
                `[ActionScheduler] Error during tick: ${errorMessage}`
            );
        } finally {
            this.isRunning = false;
        }
    }

    private async executeAction(action: ScheduledAction, repository: TriggerRepository): Promise<void> {
        const actionId = action.id!;
        const targetName = action.targetUserName || action.targetUserId;

        try {
            switch (action.actionType) {
                case 'remove_vip':
                    await helixApi.removeVip(action.targetUserId);
                    this.deps.logService.logMessage(
                        `[ActionScheduler] Removed VIP from ${targetName}`
                    );
                    break;

                case 'remove_mod':
                    await helixApi.removeModerator(action.targetUserId);
                    this.deps.logService.logMessage(
                        `[ActionScheduler] Removed moderator from ${targetName}`
                    );
                    break;

                case 'add_vip':
                    await helixApi.addVip(action.targetUserId);
                    this.deps.logService.logMessage(
                        `[ActionScheduler] Added VIP to ${targetName}`
                    );
                    break;

                case 'add_mod':
                    await helixApi.addModerator(action.targetUserId);
                    this.deps.logService.logMessage(
                        `[ActionScheduler] Added moderator to ${targetName}`
                    );
                    break;

                case 'send_message':
                    if (action.actionParams) {
                        const params = JSON.parse(action.actionParams);
                        if (params.message) {
                            await this.deps.sendMessage(params.message);
                            this.deps.logService.logMessage(
                                `[ActionScheduler] Sent scheduled message`
                            );
                        }
                    }
                    break;

                case 'timeout':
                    if (action.actionParams) {
                        const params = JSON.parse(action.actionParams);
                        await helixApi.timeoutUser(
                            action.targetUserId,
                            params.duration,
                            params.reason || 'Scheduled timeout'
                        );
                        this.deps.logService.logMessage(
                            `[ActionScheduler] Timed out ${targetName} for ${params.duration}s`
                        );
                    }
                    break;

                case 'delete_message':
                    if (action.actionParams) {
                        const params = JSON.parse(action.actionParams);
                        if (params.messageId) {
                            await helixApi.deleteMessage(params.messageId);
                            this.deps.logService.logMessage(
                                `[ActionScheduler] Deleted message ${params.messageId}`
                            );
                        }
                    }
                    break;

                default:
                    this.deps.logService.logMessage(
                        `[ActionScheduler] Unknown action type: ${action.actionType}`
                    );
                    repository.markActionFailed(actionId, `Unknown action type: ${action.actionType}`);
                    return;
            }

            // Mark as successfully executed
            repository.markActionExecuted(actionId);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            this.deps.logService.logMessage(
                `[ActionScheduler] Failed to execute ${action.actionType} for ${targetName}: ${errorMessage}`
            );

            repository.markActionFailed(actionId, errorMessage);
        }
    }
}
