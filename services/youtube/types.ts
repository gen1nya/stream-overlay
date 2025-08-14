export interface ChatMessage {
    type: 'chat';
    kind: 'text' | 'superchat' | 'sticker' | 'membership';
    author: string;
    timestamp: string;
    text?: string;
    amount?: string;
    header?: string;
    sticker?: string;
    badges: string[];
}

export type ProxyKind = 'socks5';

export interface ProxyConfig {
    enabled: boolean;
    kind: ProxyKind;
    host: string;
    port: number;
    username?: string;
    password?: string;
}

export interface SystemMessage {
    type: 'system';
    event: 'connected' | 'disconnected' | 'error' | 'consent_required';
    message: string;
    error?: Error;
    consentUrl?: string;
}

export type Message = ChatMessage | SystemMessage;

export interface YouTubeConfig {
    key: string;
    context: any;
}