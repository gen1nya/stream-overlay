export interface CustomRewardData {
    broadcaster_name: string;
    broadcaster_login: string;
    broadcaster_id: string; // Twitch ID of the broadcaster
    id: string; // Unique identifier for the custom reward
    image: string | null; // URL of the custom image for the reward (if set)
    background_color: string; // Background color for the reward card
    is_enabled: boolean; // Indicates if the reward is currently enabled
    cost: number; // Cost of the reward in channel points
    title: string; // Title of the custom reward
    prompt: string; // Prompt shown to users when redeeming the reward
    is_user_input_required: boolean; // Indicates if user input is required for redemption
    max_per_stream_setting: {
        is_enabled: boolean; // Indicates if max per stream setting is enabled
        max_per_stream: number; // Maximum number of times the reward can be redeemed per stream
    };
    max_per_user_per_stream_setting: {
        is_enabled: boolean; // Indicates if max per user per stream setting is enabled
        max_per_user_per_stream: number; // Maximum number of times a single user can redeem the reward per stream
    };
    global_cooldown_setting: {
        is_enabled: boolean; // Indicates if global cooldown is enabled
        global_cooldown_seconds: number; // Cooldown period in seconds
    };
    is_paused: boolean; // Indicates if the reward is currently paused
    is_in_stock: boolean; // Indicates if the reward is in stock (for limited rewards)
    default_image: {
        url_1x: string; // URL for the 1x resolution default image
        url_2x: string; // URL for the 2x resolution default image
        url_4x: string; // URL for the 4x resolution default image
    };
    should_redemptions_skip_request_queue: boolean; // Indicates if redemptions should skip the request queue
    redemptions_redeemed_current_stream: number | null; // Number of redemptions in the current stream (null if not tracked)
    cooldown_expires_at: string | null; // Timestamp when the cooldown expires (null if no cooldown)
}

export interface CustomRewardResponse {
    data: CustomRewardData[];
}