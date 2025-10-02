interface LogMessage {
    timestamp: string;
    message: string;
    userId?: string | null;
    userName?: string | null;
}

export class LogService {
    private readonly onLogsUpdated: (logs: LogMessage[]) => void;
    private readonly maxSize: number;
    private readonly buffer: (LogMessage | null)[];
    private head: number = 0;
    private count: number = 0;

    constructor(
        onLogsUpdated: (logs: LogMessage[]) => void,
        maxSize: number = 100
    ) {
        this.onLogsUpdated = onLogsUpdated;
        this.maxSize = maxSize;
        this.buffer = new Array(maxSize).fill(null);
    }

    log(message: LogMessage): void {
        this.buffer[this.head] = message;
        this.head = (this.head + 1) % this.maxSize;
        this.count = Math.min(this.count + 1, this.maxSize);

        this.onLogsUpdated(this.getLogs());
    }

    logMessage(message: string): void {
        this.log({
            timestamp: new Date().toISOString(),
            message,
            userId: null,
            userName: null
        });
    }

    getLogs(): LogMessage[] {
        const logs: LogMessage[] = [];
        for (let i = 0; i < this.count; i++) {
            const index = (this.head - this.count + i + this.maxSize) % this.maxSize;
            const log = this.buffer[index];
            if (log !== null) logs.push(log);
        }
        return logs;
    }
}