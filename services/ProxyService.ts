import { ipcMain } from "electron";
import * as keytar from "keytar";
import { SocksProxyAgent } from "socks-proxy-agent";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import type { RequestOptions } from "node:https";

export type ProxyKind = 'socks5';

export interface ProxyConfig {
    enabled: boolean;
    kind: ProxyKind;
    host: string;
    port: number;
    username?: string;
    password?: string;
}

interface FetchOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string | object;
}

interface ProxyFetchResponse {
    status: number;
    text: string;
    finalUrl?: string;
    isConsent?: boolean;
}

class ProxyService {
    private static readonly SERVICE_NAME = 'youtube-scraper-app';
    private static readonly ACCOUNT_NAME = 'proxy-config';

    private proxyConfig: ProxyConfig | null = null;
    private agent: any = null;

    constructor() {
        this.initializeConfig();
        this.setupIPCs();
    }

    private async initializeConfig(): Promise<void> {
        try {
            const configJson = await keytar.getPassword(
                ProxyService.SERVICE_NAME,
                ProxyService.ACCOUNT_NAME
            );

            if (configJson) {
                this.proxyConfig = JSON.parse(configJson);
                this.updateAgent();
                console.log('Proxy config loaded from keytar');
            } else {
                // Default config
                this.proxyConfig = {
                    enabled: false,
                    kind: 'socks5',
                    host: '',
                    port: 0
                };
            }
        } catch (error) {
            console.error('Ошибка загрузки конфига прокси:', error);
            this.proxyConfig = {
                enabled: false,
                kind: 'socks5',
                host: '',
                port: 0
            };
        }
    }

    private setupIPCs(): void {
        ipcMain.handle('proxy:getConfig', async () => {
            return this.proxyConfig;
        });

        ipcMain.handle('proxy:setConfig', async (_event, config: ProxyConfig) => {
            try {
                await keytar.setPassword(
                    ProxyService.SERVICE_NAME,
                    ProxyService.ACCOUNT_NAME,
                    JSON.stringify(config)
                );

                this.proxyConfig = config;
                this.updateAgent();
                console.log('Proxy config saved to keytar');
                return true;
            } catch (error) {
                console.error('Ошибка сохранения конфига прокси:', error);
                throw error;
            }
        });

        ipcMain.handle('proxy:enable', async (_event, enable: boolean) => {
            if (!this.proxyConfig) return false;

            this.proxyConfig.enabled = enable;
            this.updateAgent();

            // Save updated config
            try {
                await keytar.setPassword(
                    ProxyService.SERVICE_NAME,
                    ProxyService.ACCOUNT_NAME,
                    JSON.stringify(this.proxyConfig)
                );
                console.log(`Proxy ${enable ? 'включен' : 'выключен'}`);
                return true;
            } catch (error) {
                console.error('Ошибка сохранения статуса прокси:', error);
                return false;
            }
        });

        ipcMain.handle('proxy:testConnection', async (_event, config: ProxyConfig) => {
            return this.testConnection(config);
        });
    }

    private updateAgent(): void {
        if (!this.proxyConfig?.enabled || !this.proxyConfig.host || !this.proxyConfig.port) {
            this.agent = null;
            return;
        }

        try {
            let proxyUrl = `${this.proxyConfig.kind}://${this.proxyConfig.host}:${this.proxyConfig.port}`;

            if (this.proxyConfig.username && this.proxyConfig.password) {
                proxyUrl = `${this.proxyConfig.kind}://${encodeURIComponent(this.proxyConfig.username)}:${encodeURIComponent(this.proxyConfig.password)}@${this.proxyConfig.host}:${this.proxyConfig.port}`;
            }

            if (this.proxyConfig.kind === 'socks5') {
                this.agent = new SocksProxyAgent(proxyUrl);
                console.log('SOCKS5 proxy agent создан:', `${this.proxyConfig.host}:${this.proxyConfig.port}`);
            }
        } catch (error) {
            console.error('Ошибка создания proxy agent:', error);
            this.agent = null;
        }
    }

    /**
     * Выполняет HTTP запрос через прокси (если включен) или напрямую
     */
    async fetch(url: string, options: FetchOptions = {}): Promise<Response> {
        const fetchOptions: RequestInit = {
            method: options.method || 'GET',
            headers: options.headers || {},
        };

        if (options.body) {
            if (typeof options.body === 'object') {
                fetchOptions.body = JSON.stringify(options.body);
                (fetchOptions.headers as Record<string, string>)['content-type'] = 'application/json';
            } else {
                fetchOptions.body = options.body;
            }
        }

        // Если прокси включен, используем его
        if (this.agent && this.proxyConfig?.enabled) {
            // Для fetch API с прокси агентом нужно использовать undici или node-fetch
            // Здесь используем базовую реализацию через https.request
            return this.fetchThroughProxy(url, fetchOptions);
        }

        // Обычный fetch
        return fetch(url, fetchOptions);
    }

    /**
     * Специальный метод для совместимости с существующим кодом chat-reader
     */
    async fetchText(url: string, options: FetchOptions = {}, maxRedirects = 5): Promise<ProxyFetchResponse> {
        if (this.agent && this.proxyConfig?.enabled) {
            return this.fetchTextThroughProxy(url, options, maxRedirects);
        }

        // Если прокси не используется, вызываем стандартную логику
        return this.fetchTextDirect(url, options, maxRedirects);
    }

    /**
     * Реализация fetch через прокси для совместимости с fetch API
     */
    private async fetchThroughProxy(url: string, options: RequestInit): Promise<Response> {
        return new Promise((resolve, reject) => {
            const u = new URL(url);
            const requestOptions: RequestOptions = {
                hostname: u.hostname,
                port: u.port || (u.protocol === 'https:' ? 443 : 80),
                path: u.pathname + u.search,
                method: options.method || 'GET',
                headers: options.headers as Record<string, string>,
                agent: this.agent
            };

            const requestFn = u.protocol === 'https:' ? httpsRequest : httpRequest;

            const req = requestFn(requestOptions, (res) => {
                let data = '';
                res.setEncoding('utf8');
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const response = new Response(data, {
                        status: res.statusCode || 200,
                        statusText: res.statusMessage || 'OK',
                        headers: new Headers(res.headers as Record<string, string>)
                    });
                    resolve(response);
                });
            });

            req.on('error', reject);

            if (options.body) {
                req.write(options.body);
            }

            req.end();
        });
    }

    /**
     * Реализация fetchText через прокси (совместимость с chat-reader)
     */
    private async fetchTextThroughProxy(url: string, options: FetchOptions = {}, maxRedirects = 5): Promise<ProxyFetchResponse> {
        console.log(`[PROXY] Fetching through proxy: ${url}`);

        return new Promise((resolve, reject) => {
            const makeRequest = (currentUrl: string, redirectCount: number) => {
                if (redirectCount > maxRedirects) {
                    reject(new Error(`Too many redirects (${redirectCount})`));
                    return;
                }

                const u = new URL(currentUrl);
                const headers = {
                    'accept': '*/*',
                    'accept-language': 'en-US,en;q=0.8',
                    'origin': 'https://www.youtube.com',
                    'referer': 'https://www.youtube.com/',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
                    ...options.headers
                };

                if (options.body) headers['content-type'] = 'application/json';

                const requestOptions: RequestOptions = {
                    hostname: u.hostname,
                    port: u.port || (u.protocol === 'https:' ? 443 : 80),
                    path: u.pathname + u.search,
                    method: options.method || 'GET',
                    headers,
                    agent: this.agent
                };

                const requestFn = u.protocol === 'https:' ? httpsRequest : httpRequest;

                const req = requestFn(requestOptions, res => {
                    // Handle redirects
                    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
                        const location = res.headers.location;
                        if (location) {
                            console.log(`[PROXY] Redirecting to: ${location}`);

                            // Check if this is a consent redirect
                            if (location.includes('consent.youtube.com')) {
                                console.log(`[PROXY] Consent redirect detected`);
                                resolve({
                                    status: res.statusCode || 0,
                                    text: '',
                                    finalUrl: location,
                                    isConsent: true
                                });
                                return;
                            }

                            const redirectUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
                            makeRequest(redirectUrl, redirectCount + 1);
                            return;
                        }
                    }

                    let chunks = '';
                    res.setEncoding('utf8');
                    res.on('data', d => chunks += d);
                    res.on('end', () => {
                        console.log(`[PROXY] Response received, length: ${chunks.length}`);
                        resolve({
                            status: res.statusCode || 0,
                            text: chunks,
                            finalUrl: currentUrl
                        });
                    });
                });

                req.on('error', reject);
                if (options.body) {
                    req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
                }
                req.end();
            };

            makeRequest(url, 0);
        });
    }

    /**
     * Обычный fetchText без прокси (совместимость с существующим кодом)
     */
    private async fetchTextDirect(url: string, options: FetchOptions = {}, maxRedirects = 5): Promise<ProxyFetchResponse> {
        console.log(`[DIRECT] Fetching: ${url}`);

        return new Promise((resolve, reject) => {
            const makeRequest = (currentUrl: string, redirectCount: number) => {
                if (redirectCount > maxRedirects) {
                    reject(new Error(`Too many redirects (${redirectCount})`));
                    return;
                }

                const u = new URL(currentUrl);
                const headers = {
                    'accept': '*/*',
                    'accept-language': 'en-US,en;q=0.8',
                    'origin': 'https://www.youtube.com',
                    'referer': 'https://www.youtube.com/',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
                    ...options.headers
                };

                if (options.body) headers['content-type'] = 'application/json';

                const req = httpsRequest({
                    hostname: u.hostname,
                    path: u.pathname + u.search,
                    method: options.method || 'GET',
                    headers
                }, res => {
                    // Handle redirects
                    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
                        const location = res.headers.location;
                        if (location) {
                            console.log(`[DIRECT] Redirecting to: ${location}`);

                            // Check if this is a consent redirect
                            if (location.includes('consent.youtube.com')) {
                                console.log(`[DIRECT] Consent redirect detected`);
                                resolve({
                                    status: res.statusCode || 0,
                                    text: '',
                                    finalUrl: location,
                                    isConsent: true
                                });
                                return;
                            }

                            const redirectUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
                            makeRequest(redirectUrl, redirectCount + 1);
                            return;
                        }
                    }

                    let chunks = '';
                    res.setEncoding('utf8');
                    res.on('data', d => chunks += d);
                    res.on('end', () => {
                        console.log(`[DIRECT] Response received, length: ${chunks.length}`);
                        resolve({
                            status: res.statusCode || 0,
                            text: chunks,
                            finalUrl: currentUrl
                        });
                    });
                });

                req.on('error', reject);
                if (options.body) {
                    req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
                }
                req.end();
            };

            makeRequest(url, 0);
        });
    }

    /**
     * Тестирует подключение к прокси
     */
    async testConnection(config: ProxyConfig): Promise<{ success: boolean; error?: string; responseTime?: number }> {
        if (!config.enabled || !config.host || !config.port) {
            return { success: false, error: 'Неверная конфигурация прокси' };
        }

        const startTime = Date.now();

        try {
            // Создаем временный agent для тестирования
            let proxyUrl = `${config.kind}://${config.host}:${config.port}`;

            if (config.username && config.password) {
                proxyUrl = `${config.kind}://${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@${config.host}:${config.port}`;
            }

            const testAgent = new SocksProxyAgent(proxyUrl);

            // Тестируем подключение к YouTube
            const testUrl = 'https://www.youtube.com';

            return new Promise((resolve) => {
                const u = new URL(testUrl);
                const req = httpsRequest({
                    hostname: u.hostname,
                    path: '/',
                    method: 'HEAD',
                    timeout: 10000,
                    agent: testAgent
                }, (res) => {
                    const responseTime = Date.now() - startTime;
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
                        resolve({ success: true, responseTime });
                    } else {
                        resolve({ success: false, error: `HTTP ${res.statusCode}` });
                    }
                });

                req.on('error', (error) => {
                    resolve({ success: false, error: error.message });
                });

                req.on('timeout', () => {
                    req.destroy();
                    resolve({ success: false, error: 'Timeout' });
                });

                req.end();
            });

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка'
            };
        }
    }

    /**
     * Получить текущий конфиг прокси
     */
    getConfig(): ProxyConfig | null {
        return this.proxyConfig;
    }

    /**
     * Проверить, включен ли прокси
     */
    isEnabled(): boolean {
        return this.proxyConfig?.enabled === true;
    }

    /**
     * Получить proxy agent (для внешнего использования если нужно)
     */
    getAgent(): any {
        return this.agent;
    }
}

export { ProxyService };