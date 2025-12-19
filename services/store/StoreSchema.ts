import {GachaStoreSchema} from "../middleware/gacha/types";
import {LotteryBotConfig} from "../middleware/lottery/types";


export interface ChatWindowConfig {
    x?: number;
    y?: number;
    width: number;
    height: number;
    gameMode: boolean;
}

export interface StoreSchema {
    themes: {
        default: ThemeConfig;
        theme1: ThemeConfig;
        [key: string]: ThemeConfig;
    };
    locale: string;
    currentTheme: string;
    bots: { [key: string]: BotConfig };
    currentBot?: string | null;
    audio: AudioConfig;
    youtube: YoutubeConfig;
    irc: IrcConfig;
    chatWindow: ChatWindowConfig;
}

export interface IrcConfig {
    useWebSocket: boolean;
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
    // Individual padding mode support
    paddingMode?: 'grouped' | 'individual';
    paddingTop?: string | number;
    paddingRight?: string | number;
    paddingBottom?: string | number;
    paddingLeft?: string | number;
    // Color background container padding (margin from container edges)
    colorBgPaddingMode?: 'grouped' | 'individual';
    colorBgPaddingH?: string | number;
    colorBgPaddingV?: string | number;
    colorBgPaddingTop?: string | number;
    colorBgPaddingRight?: string | number;
    colorBgPaddingBottom?: string | number;
    colorBgPaddingLeft?: string | number;
    // Gradient background layer padding
    gradientPaddingMode?: 'grouped' | 'individual';
    gradientPaddingH?: string | number;
    gradientPaddingV?: string | number;
    gradientPaddingTop?: string | number;
    gradientPaddingRight?: string | number;
    gradientPaddingBottom?: string | number;
    gradientPaddingLeft?: string | number;
    // Image background layer padding
    imagePaddingMode?: 'grouped' | 'individual';
    imagePaddingH?: string | number;
    imagePaddingV?: string | number;
    imagePaddingTop?: string | number;
    imagePaddingRight?: string | number;
    imagePaddingBottom?: string | number;
    imagePaddingLeft?: string | number;
    fontSize: number;
    messageFont: MessageFontConfig;
}

// Chat message configuration
export interface ChatMessageConfig extends BaseMessageConfig {
    titleFontSize: number;
    titleFont: FontConfig;
    titleBackgroundMode: 'none' | 'solid' | undefined;
    titleBackgroundColorConfig: TitleBackgroundColorConfig | undefined;
}

// Title background color configuration for dark and light themes
export interface TitleBackgroundColorConfig {
    dark: TitleBackgroundColorTheme;
    light: TitleBackgroundColorTheme;
}

// Title background color theme configuration
export interface TitleBackgroundColorTheme {
    color: string;
    opacity: string;
    borderColor: string;
    borderOpacity: string;
    borderRadius: string;
    shadowColor: string;
    shadowOpacity: string;
    shadowRadius: string;
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
    // Stats command
    statsCommands: string[];
    statsMessages: string[];  // ${user}, ${plays}, ${survivals}, ${deaths}, ${rate}, ${streak}
    // Leaderboard command
    leaderboardCommands: string[];
    leaderboardMessages: string[];  // ${top} - formatted leaderboard
    leaderboardSize: number;  // number of players to show (default: 5)
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

// ============================================
// Trigger System Types
// ============================================

// Text matching configuration for trigger conditions
export interface TriggerTextMatch {
    type: 'exact' | 'starts' | 'contains' | 'regex';
    value: string;
    caseSensitive?: boolean;
}

// User role filter for trigger conditions
export interface TriggerUserRoleFilter {
    include?: ('broadcaster' | 'mod' | 'vip' | 'sub')[];
    exclude?: ('broadcaster' | 'mod' | 'vip' | 'sub')[];
}

// Trigger condition ("IF" part)
export interface TriggerCondition {
    eventType: 'message' | 'redemption' | 'follow' | 'command' | 'raid';

    // For message/command - text matching
    textMatch?: TriggerTextMatch;

    // For redemption - reward ID and title
    rewardId?: string;
    rewardTitle?: string;

    // Filter by sender roles
    userRoles?: TriggerUserRoleFilter;
}

// Delay configuration for trigger actions
export interface TriggerActionDelay {
    value: number;
    unit: 'seconds' | 'minutes' | 'hours' | 'days';
}

// Trigger action parameters
export interface TriggerActionParams {
    message?: string;      // For send_message (supports ${user}, ${target}, ${args[N]})
    duration?: number;     // For timeout (seconds)
    reason?: string;       // For timeout
}

// Trigger action ("THEN" part)
export interface TriggerAction {
    id: string;            // UUID for UI identification
    type: 'send_message' | 'add_vip' | 'remove_vip' |
          'add_mod' | 'remove_mod' | 'timeout' | 'delete_message' | 'shoutout';

    // Action target
    target: 'sender' | 'arg_user';  // sender = message author, arg_user = from argument
    argIndex?: number;              // Which argument to parse (default: 0)

    // Action parameters
    params: TriggerActionParams;

    // Delayed execution
    delay?: TriggerActionDelay;
}

// Trigger rule configuration
export interface TriggerRule {
    id: string;                      // UUID
    name: string;                    // Display name
    enabled: boolean;

    // Condition ("IF")
    condition: TriggerCondition;

    // Actions ("THEN")
    actions: TriggerAction[];

    // Settings
    cooldown?: number;               // Seconds
    cooldownScope?: 'global' | 'per_user';
    stopPropagation?: boolean;       // Stop middleware chain
}

// Triggers bot configuration
export interface TriggersBotConfig {
    enabled: boolean;
    rules: TriggerRule[];
}

// ============================================
// Timer System Types
// ============================================

// Individual timer configuration
export interface TimerConfig {
    id: string;              // UUID
    enabled: boolean;
    name: string;            // Display name for UI
    message: string;         // Message text to send
    minMessages: number;     // Min chat messages between sends (0 = ignore)
    minIntervalSec: number;  // Min seconds between sends
}

// Timers bot configuration
export interface TimerBotConfig {
    enabled: boolean;
    timers: TimerConfig[];
}

// Main bot configuration interface
export interface BotConfig {
    roulette: RouletteBotConfig;
    custom: CustomBotConfig;
    pingpong: PingPongBotConfig;
    gacha: GachaStoreSchema;
    lottery: LotteryBotConfig;
    triggers: TriggersBotConfig;
    timers: TimerBotConfig;
}