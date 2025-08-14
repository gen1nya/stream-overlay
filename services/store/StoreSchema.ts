export interface StoreSchema {
    themes: {
        default: ThemeConfig;
        theme1: ThemeConfig;
        [key: string]: ThemeConfig;
    };
    currentTheme: string;
    bots: { [key: string]: BotConfig };
    currentBot?: string | null;
    audio: AudioConfig;
    youtube: YoutubeConfig;
}

export interface AudioConfig {
    fft: {
        enabled: boolean;
        device?: AudioDevice | null;
        dbFloor: number;
        masterGain: number;
        tilt: number;
    };
    gsm: {
        enabled: boolean;
    };
}

export interface AudioDevice {
    id: string;
    name: string;
    flow: 'render' | 'capture';
}

export interface YoutubeConfig {
    enabled: boolean,
    channelId: string,
    videoId: string,
}

// Font configuration interface
export interface FontConfig {
    family: string;
    url: string;
    color?: string;
    alpha?: string;
    shadowColor?: string;
    shadowOpacity?: string;
    shadowRadius?: string;
}

// Message font configuration (extends FontConfig with additional properties)
export interface MessageFontConfig extends FontConfig {
    color: string;
    alpha: string;
    shadowColor: string;
    shadowOpacity: string;
    shadowRadius: string;
}

// Border radius configuration (can be number or object with specific corners)
export interface BorderRadiusConfig {
    topLeft?: string;
    topRight?: string;
    bottomLeft?: string;
    bottomRight?: string;
}

// Base message configuration
export interface BaseMessageConfig {
    backgroundColor: string;
    borderColor: string;
    shadowColor: string;
    shadowOpacity: string;
    shadowRadius: string;
    direction: 'row' | 'column';
    backgroundOpacity: string;
    borderOpacity: string;
    borderRadius: string | number;
    marginH: string | number;
    marginV: string | number;
    paddingH: string | number;
    paddingV: string | number;
    fontSize: number;
    messageFont: MessageFontConfig;
}

// Chat message configuration
export interface ChatMessageConfig extends BaseMessageConfig {
    titleFontSize: number;
    titleFont: FontConfig;
}

// Follow message configuration (with template)
export interface FollowMessageConfig extends BaseMessageConfig {
    template: string;
}

// Redeem message configuration (with template and cost)
export interface RedeemMessageConfig extends BaseMessageConfig {
    template: string;
}

// Player text configuration
export interface PlayerTextConfig {
    textAlign: string;
    title: {
        fontSize: number;
        color: string;
        fontWeight: string;
    };
    artist: {
        fontSize: number;
        color: string;
        fontWeight: string;
    };
}

// Player configuration
export interface PlayerConfig {
    backgroundColor: string;
    backgroundOpacity: string;
    borderColor: string;
    borderOpacity: string;
    borderRadius: BorderRadiusConfig;
    shadowColor: string;
    shadowOpacity: string;
    diskShadowColor: string;
    diskShadowOpacity: string;
    shadowRadius: number;
    text: PlayerTextConfig;
}

// All messages global configuration
export interface AllMessagesConfig {
    lifetime: number;
    textColor: string;
    textOpacity: string;
    blurRadius: string;
    textShadowColor: string;
    textShadowOpacity: string;
    textShadowRadius: string;
    textShadowXPosition: number;
    textShadowYPosition: number;
}

// Overlay configuration
export interface OverlayConfig {
    backgroundType: 'none' | 'color' | 'image';
    backgroundColor: string | null;
    backgroundImage: string | null;
}

// Main theme configuration interface
export interface ThemeConfig {
    chatMessage: ChatMessageConfig;
    followMessage: FollowMessageConfig[];
    redeemMessage: RedeemMessageConfig[];
    player: PlayerConfig;
    allMessages: AllMessagesConfig;
    overlay: OverlayConfig;
    bot: BotConfig;
}

// Bot command trigger configuration
export interface CommandTriggerConfig {
    type: 'text' | 'regex';
    value: string;
    flags?: string; // для regex
}

// Ping-pong command configuration
export interface PingPongCommandConfig {
    enabled: boolean;
    name: string;
    triggers: CommandTriggerConfig[];
    responses: string[];
    triggerType: 'exact' | 'start' | 'contains';
}

// Roulette bot configuration
export interface RouletteBotConfig {
    enabled: boolean;
    allowToBanEditors: boolean;
    commands: string[];
    survivalMessages: string[];
    deathMessages: string[];
    cooldownMessage: string[];
    protectedUsersMessages: string[];
    muteDuration: number;
    commandCooldown: number;
    chance: number;
}

// Custom bot configuration
export interface CustomBotConfig {
    enabled: boolean;
    // можешь добавить дополнительные поля по необходимости
}

// Ping-pong bot configuration
export interface PingPongBotConfig {
    enabled: boolean;
    commands: PingPongCommandConfig[];
}

// Main bot configuration interface
export interface BotConfig {
    roulette: RouletteBotConfig;
    custom: CustomBotConfig;
    pingpong: PingPongBotConfig;
}