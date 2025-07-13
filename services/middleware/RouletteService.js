/*
* allow to temporary mute a user after specific command execution
* */

const { ActionTypes } = require("./ActionTypes");
const Middleware = require("./Middleware");

class RouletteService extends Middleware {
    constructor(
        muteDuration = 2 * 60 * 1000,
        commandCooldown = 30 * 1000,
        deathMessages = [
            "@${user} открыл сундук… и был моментально сожрён мимиком. 🪤",
            "Судьба не на твоей стороне, ${user}. Заклинание молчания активировано. 🔇",
            "${user} наступил на подозрительную плиту. Тишина… и только эхо. ⚰️",
            "В таверне загремела рулетка - и ${user} исчез в облаке пыли. Два круга тишины. 🍂",
            "${user}, не трогай *тот* артефакт... Ой. Поздно. Отдыхай в зале молчания. 🕯️"
        ],
        survivalMessages = [
            "@${user} метнул кость судьбы... и остался жив! 🎲 Удача на твоей стороне.",
            "@${user} увернулся от проклятия и выбежал из подвала со словами: \"Пф, легко!\" 💨",
            "@${user} нашёл пустой сундук. На этот раз - просто сундук. 😉",
            "@${user} прикрылся щитом сарказма и выстоял! 🛡️",
            "@${user} бросил кубик - и избежал зелья молчания. Гильдия гордится тобой! 🍀"
        ],
        cooldownMessages = [
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
        commands = [
            "!roulette",
            "!рулетка",
            "!stick",
            "!палочка",
        ]
    ) {
        super();
        this.mutedUsers = new Set();
        this.commands = commands;
        this.commandCooldown = commandCooldown;
        this.survivalMessages = survivalMessages;
        this.deathMessages = deathMessages;
        this.cooldownMessages = cooldownMessages;
        this.muteDuration = muteDuration;
        this.cooldowns = new Map(); // userId -> timestamp
    }

    processMessage(message) {
        if (!this.commands.includes(message.htmlMessage)) {
            return {
                accepted: false,
                message: { ...message },
                actions: []
            };
        }

        const now = Date.now();
        const lastUsed = this.cooldowns.get(message.userId) || 0;

        if (now - lastUsed < this.commandCooldown) {
            const cooldownMsg = this.getRandomMessage(this.cooldownMessages, message.username);
            return {
                accepted: false,
                message: { ...message },
                actions: [{
                    type: ActionTypes.SEND_MESSAGE,
                    payload: {
                        message: cooldownMsg,
                        forwardToUi: true
                    }
                }]
            };
        }

        // Обновляем время последнего использования команды
        this.cooldowns.set(message.userId, now);

        const actions = [];
        if (this.checkRouletteWin()) {
            const reason = this.getRandomMessage(this.deathMessages, message.username);
            actions.push(
                {
                    type: ActionTypes.SEND_MESSAGE,
                    payload: {
                        message: reason,
                        forwardToUi: true
                    }
                },
                {
                    type: ActionTypes.MUTE_USER,
                    payload: {
                        userId: message.userId,
                        reason: reason,
                        duration: this.muteDuration / 1000
                    }
                }
            );
        } else {
            const reason = this.getRandomMessage(this.survivalMessages, message.username);
            actions.push({
                type: ActionTypes.SEND_MESSAGE,
                payload: {
                    message: reason,
                    forwardToUi: true
                }
            });
        }

        return {
            accepted: true,
            message: { ...message },
            actions
        };
    }

    checkRouletteWin() {
        const ROULETTE_CHANCE = 6;
        return Math.floor(Math.random() * ROULETTE_CHANCE) + 1 === 1;
    }

    getRandomMessage(array, username) {
        const template = array[Math.floor(Math.random() * array.length)];
        return template.replace(/\$\{user\}/g, username);
    }
}

module.exports = RouletteService;