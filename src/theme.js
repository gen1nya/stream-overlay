// Window Mode Theme (Dark) - Focused on readability and UX
export const windowModeThemeDark = {
    chatMessage: {
        backgroundColor: "#1a1a1a",
        borderColor: "#3a3a3a",
        shadowColor: "#000000",
        shadowOpacity: "0",
        shadowRadius: "0",
        direction: "column",
        borderRadius: "6",
        marginH: "4",
        marginV: "2",
        backgroundOpacity: "1",
        borderOpacity: "0.3",
        paddingH: "12",
        paddingV: "8",
        fontSize: 16,
        titleFontSize: 16,
        titleBackgroundMode: "none",
        titleBackgroundColorConfig: {
            dark: {
                color: "#000000",
                opacity: "0.3",
                borderColor: "#ffffff",
                borderOpacity: "0",
                borderRadius: "4",
                shadowColor: "#000000",
                shadowOpacity: "0",
                shadowRadius: "0"
            },
            light: {
                color: "#ffffff",
                opacity: "0.3",
                borderColor: "#ffffff",
                borderOpacity: "0",
                borderRadius: "4",
                shadowColor: "#000000",
                shadowOpacity: "0",
                shadowRadius: "0"
            }
        },
        titleFont: {
            family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            url: null,
        },
        messageFont: {
            family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            url: null,
            color: "#e0e0e0",
            alpha: "1",
            shadowColor: "#000000",
            shadowOpacity: "0",
            shadowRadius: "0"
        }
    },
    followMessage: [
        {
            backgroundColor: "#1e5631",
            borderColor: "#2d7a45",
            shadowColor: "#000",
            shadowOpacity: "0",
            shadowRadius: "0",
            direction: "column",
            backgroundOpacity: "1",
            borderOpacity: "0.5",
            borderRadius: "6",
            marginH: "4",
            marginV: "2",
            paddingH: "12",
            paddingV: "8",
            fontSize: 16,
            template: "🎉 {userName} подписался!",
            messageFont: {
                family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                url: null,
                color: "#ffffff",
                alpha: "1",
                shadowColor: "#000000",
                shadowOpacity: "0",
                shadowRadius: "0"
            }
        }
    ],
    redeemMessage: [
        {
            backgroundColor: "#3a2d5a",
            borderColor: "#5a4a7a",
            shadowColor: "#000",
            shadowOpacity: "0",
            shadowRadius: "0",
            direction: "column",
            backgroundOpacity: "1",
            borderRadius: "6",
            paddingV: "8",
            paddingH: "12",
            marginV: "2",
            marginH: "4",
            borderOpacity: "0.5",
            fontSize: 16,
            template: "🎉 {userName} потратил {cost} балов на {title}",
            messageFont: {
                family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                url: null,
                color: "#ffffff",
                alpha: "1",
                shadowColor: "#000000",
                shadowOpacity: "0",
                shadowRadius: "0"
            }
        }
    ],
    allMessages: {
        lifetime: 60,
        textColor: "#e0e0e0",
        textOpacity: "1",
        blurRadius: "0",
        textShadowColor: "#000000",
        textShadowOpacity: "0",
        textShadowRadius: "0",
        textShadowXPosition: 0,
        textShadowYPosition: 0
    },
    overlay: {
        backgroundType: "none",
        backgroundColor: null,
        backgroundImage: null
    }
};

// Window Mode Theme (Light) - Focused on readability and UX
export const windowModeThemeLight = {
    chatMessage: {
        backgroundColor: "#ffffff",
        borderColor: "#d0d0d0",
        shadowColor: "#000000",
        shadowOpacity: "0",
        shadowRadius: "0",
        direction: "column",
        borderRadius: "6",
        marginH: "4",
        marginV: "2",
        backgroundOpacity: "1",
        borderOpacity: "0.4",
        paddingH: "12",
        paddingV: "8",
        fontSize: 16,
        titleFontSize: 16,
        titleBackgroundMode: "none",
        titleBackgroundColorConfig: {
            dark: {
                color: "#000000",
                opacity: "0.1",
                borderColor: "#000000",
                borderOpacity: "0",
                borderRadius: "4",
                shadowColor: "#000000",
                shadowOpacity: "0",
                shadowRadius: "0"
            },
            light: {
                color: "#ffffff",
                opacity: "0.3",
                borderColor: "#000000",
                borderOpacity: "0",
                borderRadius: "4",
                shadowColor: "#000000",
                shadowOpacity: "0",
                shadowRadius: "0"
            }
        },
        titleFont: {
            family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            url: null,
        },
        messageFont: {
            family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            url: null,
            color: "#1a1a1a",
            alpha: "1",
            shadowColor: "#000000",
            shadowOpacity: "0",
            shadowRadius: "0"
        }
    },
    followMessage: [
        {
            backgroundColor: "#d4f4dd",
            borderColor: "#7bc993",
            shadowColor: "#000",
            shadowOpacity: "0",
            shadowRadius: "0",
            direction: "column",
            backgroundOpacity: "1",
            borderOpacity: "0.6",
            borderRadius: "6",
            marginH: "4",
            marginV: "2",
            paddingH: "12",
            paddingV: "8",
            fontSize: 16,
            template: "🎉 {userName} подписался!",
            messageFont: {
                family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                url: null,
                color: "#1a4d2e",
                alpha: "1",
                shadowColor: "#000000",
                shadowOpacity: "0",
                shadowRadius: "0"
            }
        }
    ],
    redeemMessage: [
        {
            backgroundColor: "#e8e0f5",
            borderColor: "#9b74ff",
            shadowColor: "#000",
            shadowOpacity: "0",
            shadowRadius: "0",
            direction: "column",
            backgroundOpacity: "1",
            borderRadius: "6",
            paddingV: "8",
            paddingH: "12",
            marginV: "2",
            marginH: "4",
            borderOpacity: "0.6",
            fontSize: 16,
            template: "🎉 {userName} потратил {cost} балов на {title}",
            messageFont: {
                family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                url: null,
                color: "#3a2d5a",
                alpha: "1",
                shadowColor: "#000000",
                shadowOpacity: "0",
                shadowRadius: "0"
            }
        }
    ],
    allMessages: {
        lifetime: 60,
        textColor: "#1a1a1a",
        textOpacity: "1",
        blurRadius: "0",
        textShadowColor: "#000000",
        textShadowOpacity: "0",
        textShadowRadius: "0",
        textShadowXPosition: 0,
        textShadowYPosition: 0
    },
    overlay: {
        backgroundType: "none",
        backgroundColor: null,
        backgroundImage: null
    }
};

// Legacy export for backward compatibility
export const windowModeTheme = windowModeThemeDark;

// Game Mode Theme - Minimal, transparent, readable over any background
export const gameModeTheme = {
    chatMessage: {
        backgroundColor: "#000000",
        borderColor: "#ffffff",
        shadowColor: "#000000",
        shadowOpacity: "0",
        shadowRadius: "0",
        direction: "column",
        borderRadius: "0",
        marginH: "0",
        marginV: "0",
        backgroundOpacity: "0",
        borderOpacity: "0.2",
        paddingH: "4",
        paddingV: "6",
        fontSize: 16,
        titleFontSize: 16,
        titleBackgroundMode: "none",
        titleFont: {
            family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            url: null,
        },
        messageFont: {
            family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            url: null,
            color: "#ffffff",
            opacity: "1",
            shadowColor: "#000000",
            shadowOpacity: "1",
            shadowRadius: "2"
        }
    },
    followMessage: [
        {
            backgroundColor: "#000000",
            borderColor: "#4caf50",
            shadowColor: "#000",
            shadowOpacity: "0",
            shadowRadius: "0",
            direction: "row",
            backgroundOpacity: "0",
            borderOpacity: "0.3",
            borderRadius: "0",
            marginH: "0",
            marginV: "0",
            paddingH: "4",
            paddingV: "6",
            fontSize: 16,
            template: "🎉 {userName} подписался!",
            messageFont: {
                family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                url: null,
                color: "#4caf50",
                opacity: "1",
                shadowColor: "#000000",
                shadowOpacity: "1",
                shadowRadius: "2"
            }
        }
    ],
    redeemMessage: [
        {
            backgroundColor: "#000000",
            borderColor: "#9c27b0",
            shadowColor: "#000",
            shadowOpacity: "0",
            shadowRadius: "0",
            direction: "row",
            backgroundOpacity: "0",
            borderRadius: "0",
            paddingV: "6",
            paddingH: "4",
            marginV: "0",
            marginH: "0",
            borderOpacity: "0.3",
            fontSize: 16,
            template: "💎 {userName} потратил {cost} на {title}",
            messageFont: {
                family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                url: null,
                color: "#ce93d8",
                opacity: "1",
                shadowColor: "#000000",
                shadowOpacity: "1",
                shadowRadius: "2"
            }
        }
    ],
    allMessages: {
        lifetime: 60,
        textColor: "#ffffff",
        textOpacity: "1",
        blurRadius: "0",
        textShadowColor: "#000000",
        textShadowOpacity: "1",
        textShadowRadius: "2",
        textShadowXPosition: 1,
        textShadowYPosition: 1
    },
    overlay: {
        backgroundType: "none",
        backgroundColor: null,
        backgroundImage: null
    }
};

export const defaultTheme = {
    chatMessage: {
        backgroundColor: "#422434",
        borderColor: "#0af0d5",
        shadowColor: "#88aeb2",
        shadowOpacity: "1",
        shadowRadius: "5",
        direction: "column",
        borderRadius: "12",
        marginH: "10",
        marginV: "3",
        backgroundOpacity: "0.77",
        borderOpacity: "1",
        paddingH: "8",
        paddingV: "7",
        fontSize: 24,
        titleFontSize: 20,
        titleBackgroundMode: "none", // solid, none
        titleBackgroundColorConfig: {
            dark: {
                color: "#000000",
                opacity: "0.5",
                borderColor: "#ffffff",
                borderOpacity: "1",
                borderRadius: "8",
                shadowColor: "#000000",
                shadowOpacity: "0",
                shadowRadius: "0"
            },
            light: {
                color: "#ffffff",
                opacity: "0.5",
                borderColor: "#ffffff",
                borderOpacity: "1",
                borderRadius: "8",
                shadowColor: "#000000",
                shadowOpacity: "0",
                shadowRadius: "0"
            }
        },
        titleFont: {
            family: "Roboto",
            url: "https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmTggvWl0Qn.ttf",
        },
        messageFont: {
            family: "Roboto",
            url: "https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmTggvWl0Qn.ttf",
            color: "#ffffff",
            alpha: "1",
            shadowColor: "#000000",
            shadowOpacity: "0",
            shadowRadius: "0"
        }
    },
    followMessage: [
        {
            backgroundColor: "#22a554",
            borderColor: "#00ffe3",
            shadowColor: "#000",
            shadowOpacity: "1",
            shadowRadius: "5",
            direction: "column",
            backgroundOpacity: "0.79",
            borderOpacity: "1",
            borderRadius: "16",
            marginH: "10",
            marginV: "4",
            paddingH: "10",
            paddingV: "3",
            fontSize: 25,
            template: "🎉 {userName} just followed!",
            messageFont: {
                family: "Roboto",
                url: "https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmTggvWl0Qn.ttf",
                color: "#ffffff",
                alpha: "1",
                shadowColor: "#000000",
                shadowOpacity: "0",
                shadowRadius: "0"
            }
        }
    ],
    redeemMessage: [
        {
            backgroundColor: "#6968b1",
            borderColor: "#00ffe3",
            shadowColor: "#b65454",
            shadowOpacity: "1",
            shadowRadius: "5",
            direction: "row",
            backgroundOpacity: "0.79",
            borderRadius: "20",
            paddingV: "6",
            paddingH: "6",
            marginV: "6",
            marginH: "7",
            borderOpacity: "1",
            fontSize: 24,
            template: "🎉 {userName} потратил {cost} балов на {title}",
            messageFont: {
                family: "Roboto",
                url: "https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmTggvWl0Qn.ttf",
                color: "#ffffff",
                alpha: "1",
                shadowColor: "#000000",
                shadowOpacity: "0",
                shadowRadius: "0"
            }
        }
    ],
    modernPlayer: {
        mode: "compact", // compact, expanded
        backgroundTint: "#000000",
        backgroundTintOpacity: "0.3",
        backgroundOpacity: "0.94",
        borderOpacity: "1",
        borderRadius: 16,
        shadowOpacity: "0.26",
        shadowColor: "#818181",
        shadowRadius: 20,
        widthCompact: 300,
        widthExpanded: 400,
        heightCompact: 64,
        heightExpanded: 151,
        text: {
            textAlign: "left",
            title: {
                fontSize: 16,
                family: "Roboto",
                url: "https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmTggvWl0Qn.ttf",
                color: "#ffffff",
                fontWeight: "bold"
            },
            artist: {
                fontSize: 14,
                family: "Roboto",
                url: "https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmTggvWl0Qn.ttf",
                color: "#858585",
                fontWeight: "normal"
            }
        },
        image: {
            position: "left", // right
            show: true,
            compact: {
                size: 48,
            },
            extended: {
                size: 120,
            }
        }
    },
    player: {
        backgroundColor: "#4c243d",
        backgroundOpacity: "0.94",
        borderColor: "#00ffe3",
        borderOpacity: "1",
        borderRadius: {
            topLeft: "145",
            topRight: "145",
            bottomLeft: "24",
            bottomRight: "150"
        },
        shadowColor: "#00ffcc",
        shadowOpacity: "0.26",
        diskShadowColor: "#00ffaa",
        diskShadowOpacity: "0.44",
        shadowRadius: 20,
        text: {
            textAlign: "left",
            title: {
                fontSize: 16,
                color: "#ffffff",
                fontWeight: "bold"
            },
            artist: {
                fontSize: 14,
                color: "#858585",
                fontWeight: "normal"
            }
        }
    },
    allMessages: {
        lifetime: 60,
        textColor: "#ffffff",
        textOpacity: "1",
        blurRadius: "0",
        textShadowColor: "#000000",
        textShadowOpacity: "1",
        textShadowRadius: "2",
        textShadowXPosition: 0,
        textShadowYPosition: 0
    },
    overlay: {
        backgroundType: "none",
        backgroundColor: null,
        backgroundImage: null
    },
    followersGoal: {
        // Основные настройки
        target: 1000,
        title: 'Цель по фоловерам',
        completedMessage: '🎉 Цель достигнута!',
        goalText: null, // null = автоматически "Осталось: X"

        // Размеры и отступы
        width: 400,
        padding: 16,
        spacing: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(155, 116, 255, 0.55)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',

        // Прогресс-бар
        barHeight: 24,
        barBorderRadius: 12,
        barBackground: 'rgba(255, 255, 255, 0.1)',
        barBorderColor: 'rgba(255, 255, 255, 0.2)',
        barGradient: 'linear-gradient(90deg, #9b74ff 0%, #7c4dff 100%)',
        completedGradient: 'linear-gradient(90deg, #00ff88 0%, #00cc6a 100%)',
        barGlow: true,
        animateOnComplete: true,

        // Шрифты и цвета
        titleFont: {
            family: 'Arial',
            size: 18,
            weight: 700,
            url: null
        },
        titleColor: '#fff',
        titleGlow: true,

        counterFont: {
            family: 'Arial',
            size: 20,
            weight: 700,
            url: null
        },
        counterColor: '#9b74ff',

        percentageFont: {
            family: 'Arial',
            size: 14,
            weight: 600,
            url: null
        },
        percentageColor: '#fff',

        goalFont: {
            family: 'Arial',
            size: 14,
            weight: 400,
            url: null
        },
        goalColor: 'rgba(255, 255, 255, 0.7)',
        goalTextMargin: 4,

        completedFont: {
            family: 'Arial',
            size: 16,
            weight: 700,
            url: null
        },
        completedColor: '#00ff88'
    },
    bot: {
        roulette: {
            enabled: false,
            allowToBanEditors: false,
            commands: [
                "!roulette", "!рулетка"
            ],
            survivalMessages: [
                `@{user} still alive! 🎲`,
                '@${user} Не пробил!',
                '@${user} Need one more pull; Just one more!',
            ],
            deathMessages: [
                '@${user} Победил и хранится в темном прохладном месте. 🔇',
                '@${user} *А разве Макаровым играют в рулетку?* 🔇'
            ],
            cooldownMessage: [
                '@${user}, Привет... Чем могу помочь?',
                '@${user}, Привет... Чем могу [PEKO]?',
                '@${user}, от факапа до факапа 30 секунд. ⏳',
                'WAAAAAAAAGH!!!!11!',
            ],
            protectedUsersMessages: [
                "@${user}, Редактор не участвует в фестивале"
            ],
            muteDuration: 120000,
            commandCooldown: 30000,
            chance: 0.18,
        },
        custom: { enabled: false },
        pingpong: {
            enabled: false,
            commands: [
                {
                    enabled: true,
                    name: "ping",
                    triggers: [
                        { type: "text", value: "!ping" },
                        { type: "text", value: "!пинг" }
                    ],
                    responses: ["pong"],
                    triggerType: "exact"
                },
                {
                    enabled: true,
                    name: "Привет...",
                    triggers: [
                        {
                            type: "regex",
                            value: "^((здравствуй|здравствуйте|здорово|здарова|даров|дарова)[\\p{P}\\s]*|^здр[\\p{P}\\s]*)",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^(прив(ет|етик|етикос|етищ|етос)?)[\\p{P}\\s]*$",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^хай(ка|ушки|чик)?[\\p{P}\\s]*",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^добрый\\s+(день|вечер|утро)",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^доброго\\s+(времени|дня|вечера|утра)",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^hello\\b",
                            flags: "i"
                        },
                        {
                            type: "regex",
                            value: "^hi\\b",
                            flags: "i"
                        },
                        {
                            type: "regex",
                            value: "^hey\\b",
                            flags: "i"
                        }
                    ],
                    responses: ["Привет... чем могу помочь?"],
                    triggerType: "start"
                },
                {
                    enabled: true,
                    name: "Пиво",
                    triggers: [
                        {
                            type: "regex",
                            value: "^пиво[\\p{P}\\s]*$",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^пивко[\\p{P}\\s]*$",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^пивка[\\p{P}\\s]*$",
                            flags: "iu"
                        },
                        {
                            type: "regex",
                            value: "^пивчанский[\\p{P}\\s]*$",
                            flags: "iu"
                        }
                    ],
                    responses: ["🍺", "🍺🍺", "🍻"],
                    triggerType: "contains"
                }
            ]
        }
    }
};
