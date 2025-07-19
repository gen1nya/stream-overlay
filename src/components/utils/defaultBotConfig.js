import {defaultTheme} from "../../theme";

export const defaultBotConfig = {
    bot: {
        roulette: defaultTheme.bot.roulette,
        custom: defaultTheme.bot.custom,
        pingpong: defaultTheme.bot.pingpong
    },
};

export function mergeWithDefaults(config) {
    const input = config || {};

    return {
        ...input, // Preserve any top-level properties from the input
        bot: {
            ...defaultBotConfig.bot,
            ...(input.bot || {}),
            roulette: {
                ...defaultBotConfig.bot.roulette,
                ...(input.bot?.roulette || {}),
            },
            custom:
                input.bot?.custom !== undefined
                    ? input.bot.custom
                    : defaultBotConfig.bot.custom,
            pingpong:
                input.bot?.pingpong !== undefined
                    ? input.bot.pingpong
                    : defaultBotConfig.bot.pingpong,
        },
    };
}