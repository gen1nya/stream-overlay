import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import Store from 'electron-store';
import { StoreSchema } from './store/StoreSchema';

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

function generateSessionLogFilename(): string {
    const now = new Date();
    const dateStr = now.toISOString()
        .replace(/:/g, '-')
        .replace(/\.\d{3}Z$/, '')
        .replace('T', '_');
    return `backend-logs_${dateStr}.txt`;
}

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
    private store?: Store<StoreSchema>;
    private readonly sessionLogFilename: string;

    constructor(config?: Partial<BackendLogConfig>, store?: Store<StoreSchema>) {
        this.store = store;
        this.sessionLogFilename = generateSessionLogFilename();

        // Load writeToFile from store if available
        const storedWriteToFile = store ? store.get('logging.writeToFile') === true : false;

        this.config = {
            enabled: true,
            broadcastViaWebSocket: true,
            writeToFile: storedWriteToFile,
            maxBufferSize: 1000,
            logFilePath: path.join(app.getPath('userData'), 'logs', this.sessionLogFilename),
            ...config,
        };

        // Store value takes precedence over config
        if (store) {
            this.config.writeToFile = storedWriteToFile;
        }

        this.originalConsole = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
            debug: console.debug
        };

        // Ensure logs directory exists
        const logsDir = path.join(app.getPath('userData'), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

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

    public flushSync(): void {
        if (this.fileStream && this.config.logFilePath) {
            try {
                this.fileStream.end();
                this.fileStream = undefined;
            } catch {
                // ignore
            }
        }
    }

    public logCrash(error: Error | unknown, label: string = 'CRASH'): void {
        const timestamp = new Date().toISOString();
        let message: string;

        if (error instanceof Error) {
            message = `${error.name}: ${error.message}\n${error.stack}`;
        } else {
            try {
                message = JSON.stringify(error, null, 2);
            } catch {
                message = String(error);
            }
        }

        const logLine = `[${timestamp}] [${label}] ${message}\n`;

        // Write synchronously to ensure it's saved before exit
        if (this.config.writeToFile && this.config.logFilePath) {
            try {
                fs.appendFileSync(this.config.logFilePath, logLine);
            } catch (err) {
                this.originalConsole.error('Failed to write crash log:', err);
            }
        }

        // Also add to buffer and broadcast
        const entry: BackendLogEntry = {
            timestamp,
            level: 'error',
            message: `[${label}] ${message}`
        };
        this.buffer.push(entry);

        if (this.broadcastCallback) {
            this.broadcastCallback([entry]);
        }
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

        // Persist writeToFile setting to store
        if (this.store && newConfig.writeToFile !== undefined) {
            this.store.set('logging.writeToFile', newConfig.writeToFile);
        }

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
