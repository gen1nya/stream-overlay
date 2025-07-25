export const defaultTheme = {
    chatMessage: {
        backgroundColor: "#422434",
        borderColor: "#0af0d5",
        shadowColor: "#ffffff",
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
        titleFont: {
            family: "Roboto",
            url: "https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmTggvWl0Qn.ttf",
        },
        messageFont: {
            family: "Roboto",
            url: "https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmTggvWl0Qn.ttf",
            color: "#ffffff",
            alpha: "1",
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
            }
        }
    ],
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
    bot: {
        roulette: {
            enabled: false,
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