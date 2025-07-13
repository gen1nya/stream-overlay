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
        titleFontSize: 20
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
            template: "🎉 {userName} just followed!"
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
            template: "🎉 {userName} потратил {cost} балов на {title}"
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
            commands: [
                "!roulette",
                "!рулетка",
                "!stick",
                "!палочка"
            ],
            survivalMessages: [
                "@${user} метнул кость судьбы... и остался жив! 🎲 Удача на твоей стороне.",
                "@${user} увернулся от проклятия и выбежал из подвала со словами: \"Пф, легко!\" 💨",
                "@${user} нашёл пустой сундук. На этот раз - просто сундук. 😉",
                "@${user} прикрылся щитом сарказма и выстоял! 🛡️",
                "@${user} бросил кубик - и избежал зелья молчания. Гильдия гордится тобой! 🍀"
            ],
            deathMessages: [
                "@${user} открыл сундук… и был моментально сожрён мимиком. 🪤",
                "Судьба не на твоей стороне, ${user}. Заклинание молчания активировано. 🔇",
                "${user} наступил на подозрительную плиту. Тишина… и только эхо. ⚰️",
                "В таверне загремела рулетка - и ${user} исчез в облаке пыли. Два круга тишины. 🍂",
                "${user}, не трогай *тот* артефакт... Ой. Поздно. Отдыхай в зале молчания. 🕯️"
            ],
            cooldownMessage: [
                "@${user}, барабан ещё не перезаряжен. Подожди немного, судьба любит терпеливых. 🔄",
                "@${user}, жди свою очередь. Кости судьбы остывают после последнего броска. 🎲",
                "@${user}, артефакт рулетки ещё перезаряжается... Не стоит трогать его дважды. 💀",
                "@${user}, механизм снова заржавел. Смазка будет через пару секунд. 🛠️",
                "@${user}, ты слишком быстро тянешь за спусковой крюк. Подожди, герой. 😏",
                "@${user}, мимик ушёл перекусить. Вернётся с десертом через пару мгновений. 🍴",
                "@${user}, кости отдыхают в баре. Бросать можно будет чуть позже. 🍻",
                "@${user}, перезарядка идёт... Не зли бога рандома, он и так на грани. ⚡",
                "@${user}, снова нажать? Эй, дай другим покрутить! Подожди немного. ⏳",
                "@${user}, кузнец перезаряжает барабан удачи... Возвращайся через пару ударов молота (по лицу). 🔨",
                "@${user}, рулетка занята - кто-то только что подорвался. Прибереги судьбу. 💥",
                "@${user}, магическая энергия рулетки истощена. Жди, пока кристаллы снова засветятся. 🔮",
                "@${user}, жребий уже брошен - новые удары судьбы будут позже. Не торопи звёзды. ✨",
                "@${user}, очередь в лавку случайностей длинная. Возьми жетон и подожди вызова. 🪙",
                "Привет... чем могу помочь?",
                "WAAAAAAAAGH!!!!11!"
            ],
            muteDuration: 2 * 60 * 1000, // 2 minutes
            commandCooldown: 30 * 1000, // 30 seconds
            chance: 0.1
        },
        custom: {

        }
    }
};