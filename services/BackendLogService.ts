import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface BackendLogEntry {
    timestamp: string;
    level: 'log' | 'info' | 'warn' | 'error' | 'debug';
    message: string;
    args?: any[];
}

export interface BackendLogConfig {
    enabled: boolean;
    broadcastViaWebSocket: boolean;
    writeToFile: boolean;
    maxBufferSize: number;
    logFilePath?: string;
}

type LogBroadcastCallback = (logs: BackendLogEntry[]) => void;

export class BackendLogService {
    private config: BackendLogConfig;
    private buffer: BackendLogEntry[] = [];
    private originalConsole: {
        log: typeof console.log;
        info: typeof console.info;
        warn: typeof console.warn;
        error: typeof console.error;
        debug: typeof console.debug;
    };
    private broadcastCallback?: LogBroadcastCallback;
    private fileStream?: fs.WriteStream;

    constructor(config?: Partial<BackendLogConfig>) {
        this.config = {
            enabled: true,
            broadcastViaWebSocket: true,
            writeToFile: false,
            maxBufferSize: 1000,
            logFilePath: path.join(app.getPath('userData'), 'backend-logs.txt'),
            ...config
        };

        this.originalConsole = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
            debug: console.debug
        };

        if (this.config.enabled) {
            this.interceptConsole();
        }

        if (this.config.writeToFile && this.config.logFilePath) {
            this.initFileStream();
        }
    }

    private interceptConsole(): void {
        const createInterceptor = (level: BackendLogEntry['level'], original: Function) => {
            return (...args: any[]) => {
                original.apply(console, args);

                if (this.config.enabled) {
                    this.addLog(level, args);
                }
            };
        };

        console.log = createInterceptor('log', this.originalConsole.log);
        console.info = createInterceptor('info', this.originalConsole.info);
        console.warn = createInterceptor('warn', this.originalConsole.warn);
        console.error = createInterceptor('error', this.originalConsole.error);
        console.debug = createInterceptor('debug', this.originalConsole.debug);
    }

    private addLog(level: BackendLogEntry['level'], args: any[]): void {
        const entry: BackendLogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message: args.map(arg => {
                if (typeof arg === 'string') return arg;
                if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack}`;
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            }).join(' '),
            args
        };

        this.buffer.push(entry);

        if (this.buffer.length > this.config.maxBufferSize) {
            this.buffer.shift();
        }

        if (this.config.writeToFile && this.fileStream) {
            this.writeToFile(entry);
        }

        if (this.config.broadcastViaWebSocket && this.broadcastCallback) {
            this.broadcastCallback([entry]);
        }
    }

    private initFileStream(): void {
        if (!this.config.logFilePath) return;

        try {
            this.fileStream = fs.createWriteStream(this.config.logFilePath, { flags: 'a' });
            this.fileStream.on('error', (err) => {
                this.originalConsole.error('Failed to write to log file:', err);
            });
        } catch (err) {
            this.originalConsole.error('Failed to create log file stream:', err);
        }
    }

    private writeToFile(entry: BackendLogEntry): void {
        if (!this.fileStream) return;

        const logLine = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}\n`;
        this.fileStream.write(logLine);
    }

    public setBroadcastCallback(callback: LogBroadcastCallback): void {
        this.broadcastCallback = callback;
    }

    public getBuffer(): BackendLogEntry[] {
        return [...this.buffer];
    }

    public clearBuffer(): void {
        this.buffer = [];
        if (this.broadcastCallback) {
            this.broadcastCallback([]);
        }
    }

    public updateConfig(newConfig: Partial<BackendLogConfig>): void {
        const wasFileWritingEnabled = this.config.writeToFile;

        this.config = {
            ...this.config,
            ...newConfig
        };

        if (!wasFileWritingEnabled && this.config.writeToFile) {
            this.initFileStream();
        } else if (wasFileWritingEnabled && !this.config.writeToFile) {
            this.closeFileStream();
        }

        if (this.config.writeToFile && this.config.logFilePath && wasFileWritingEnabled) {
            this.closeFileStream();
            this.initFileStream();
        }
    }

    public getConfig(): BackendLogConfig {
        return { ...this.config };
    }

    private closeFileStream(): void {
        if (this.fileStream) {
            this.fileStream.end();
            this.fileStream = undefined;
        }
    }

    public destroy(): void {
        console.log = this.originalConsole.log;
        console.info = this.originalConsole.info;
        console.warn = this.originalConsole.warn;
        console.error = this.originalConsole.error;
        console.debug = this.originalConsole.debug;

        this.closeFileStream();
        this.buffer = [];
        this.broadcastCallback = undefined;
    }
}
