import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

// Цветовая схема
const COLORS = {
    background: '#0c0c0c',
    text: '#aa8c00',
    scrollbarTrack: '#1a1a1a',
};

// Ключ шифрования (используется XOR + Base64)
const CIPHER_KEY = 'TERMINAL_SECURE_KEY_2024';

// Функции шифрования
const encrypt = (text) => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ CIPHER_KEY.charCodeAt(i % CIPHER_KEY.length);
        result += String.fromCharCode(charCode);
    }
    return btoa(result);
};

const decrypt = (encrypted) => {
    try {
        const decoded = atob(encrypted);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            const charCode = decoded.charCodeAt(i) ^ CIPHER_KEY.charCodeAt(i % CIPHER_KEY.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    } catch {
        return null;
    }
};

// База пользователей (зашифрованные данные: имя пользователя -> уровень доступа)
const USERS_DB = {
    [encrypt('guest')]: 0,
};

// Конфигурация команд
const commandConfig = {
    help: {
        description: 'Показать список доступных команд',
        accessLevel: 0,
        execute: (args, config, userLevel) => {
            const commands = Object.keys(config)
                .filter(cmd => config[cmd].accessLevel <= userLevel)
                .map(cmd => `  ${cmd.padEnd(15)} - ${config[cmd].description}`)
                .join('\n');
            return `Доступные команды:\n${commands}`;
        }
    },
    login: {
        description: 'Авторизоваться в системе',
        accessLevel: 0,
        args: ['имя_пользователя'],
        execute: (args, config, userLevel, setUserData) => {
            if (args.length === 0) {
                return 'Использование: login <имя_пользователя>\nДоступные пользователи: guest, user, admin, root';
            }

            const username = args[0].toLowerCase();
            const encryptedUser = encrypt(username);

            if (USERS_DB[encryptedUser] !== undefined) {
                const newLevel = USERS_DB[encryptedUser];
                setUserData({ name: username, level: newLevel });
                return `Авторизация успешна!\nПользователь: ${username}\nУровень доступа: ${newLevel}\nВведите "help" для просмотра доступных команд.`;
            } else {
                return `Ошибка: пользователь "${username}" не найден.\nДоступные пользователи: guest, user, admin, root`;
            }
        }
    },
    clear: {
        description: 'Очистить экран',
        accessLevel: 0,
        execute: () => 'CLEAR_SCREEN'
    },
    echo: {
        description: 'Вывести текст',
        accessLevel: 0,
        args: ['текст'],
        execute: (args) => {
            return args.length > 0 ? args.join(' ') : 'Использование: echo <текст>';
        }
    },
    date: {
        description: 'Показать текущую дату и время',
        accessLevel: 0,
        execute: () => {
            return new Date().toLocaleString('ru-RU');
        }
    },
    calc: {
        description: 'Простой калькулятор',
        accessLevel: 1,
        args: ['выражение'],
        execute: (args) => {
            if (args.length === 0) return 'Использование: calc <выражение>';
            try {
                const result = eval(args.join(' '));
                return `Результат: ${result}`;
            } catch (e) {
                return `Ошибка: ${e.message}`;
            }
        }
    },
    hello: {
        description: 'Приветствие',
        accessLevel: 0,
        args: ['имя'],
        execute: (args) => {
            const name = args.length > 0 ? args.join(' ') : 'Гость';
            return `Привет, ${name}! Добро пожаловать в терминал.`;
        }
    },
    about: {
        description: 'Информация о терминале',
        accessLevel: 0,
        execute: () => {
            return `Ретро Терминал v1.0\nЭмулятор классического терминала\nДля помощи введите: help`;
        }
    },
    whoami: {
        description: 'Показать текущего пользователя',
        accessLevel: 0,
        execute: (args, config, userLevel, setUserData, userData) => {
            return `Пользователь: ${userData.name}\nУровень доступа: ${userData.level}`;
        }
    },
    secret: {
        description: 'Секретная команда высокого уровня',
        accessLevel: 2,
        execute: () => {
            return `🔒 Секретное сообщение: Вы получили доступ к закрытым данным!\nЭта команда доступна только администраторам.`;
        }
    },
    shutdown: {
        description: 'Выключить систему (только для root)',
        accessLevel: 3,
        execute: () => {
            return `⚠️ ВНИМАНИЕ: Инициирована процедура выключения системы...\n>>> СИСТЕМА БУДЕТ ОСТАНОВЛЕНА <<<\n(это всего лишь эмуляция)`;
        }
    }
};

// ============ ЭФФЕКТЫ СТАРОГО МОНИТОРА ============

// Анимация мерцания
const flicker = keyframes`
    0% { opacity: 0.97; }
    5% { opacity: 1; }
    10% { opacity: 0.98; }
    15% { opacity: 0.99; }
    20% { opacity: 1; }
    25% { opacity: 0.98; }
    30% { opacity: 0.99; }
    35% { opacity: 0.97; }
    40% { opacity: 1; }
    45% { opacity: 0.99; }
    50% { opacity: 0.98; }
    55% { opacity: 1; }
    60% { opacity: 0.97; }
    65% { opacity: 0.99; }
    70% { opacity: 1; }
    75% { opacity: 0.98; }
    80% { opacity: 0.99; }
    85% { opacity: 0.97; }
    90% { opacity: 1; }
    95% { opacity: 0.99; }
    100% { opacity: 0.98; }
`;

// Анимация помех/шума
const noise = keyframes`
    0%, 100% { transform: translate(0, 0); }
    10% { transform: translate(-1px, 1px); }
    20% { transform: translate(-2px, 0); }
    30% { transform: translate(1px, -1px); }
    40% { transform: translate(1px, 1px); }
    50% { transform: translate(-1px, 0); }
    60% { transform: translate(-2px, 1px); }
    70% { transform: translate(2px, 1px); }
    80% { transform: translate(-1px, -1px); }
    90% { transform: translate(1px, 0); }
`;

// Контейнер всего экрана с CRT эффектом
const CRTWrapper = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #000;
    overflow: hidden;
`;

// Слой с эффектом изгиба экрана
const CRTScreen = styled.div`
    width: 100%;
    height: 100%;
    position: relative;
    background: radial-gradient(ellipse at center, ${COLORS.background} 0%, #000 100%);

    /* Эффект изгиба ЭЛТ-экрана */
    &::before {
        content: "";
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(
                rgba(18, 16, 16, 0) 50%,
                rgba(0, 0, 0, 0.5) 50%
        );
        background-size: 100% 6px;
        z-index: 2;
        pointer-events: none;
    }

    /* Эффект виньетирования */
    &::after {
        content: "";
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%);
        z-index: 3;
        pointer-events: none;
    }
`;

// Слой со сканлайнами
const Scanlines = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 4;
    pointer-events: none;
    background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.3),
            rgba(0, 0, 0, 0.3) 2px,
            transparent 2px,
            transparent 4px
    );
    animation: ${flicker} 0.15s infinite;
`;

// Слой с эффектом свечения
const GlowLayer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
    background: ${COLORS.text};
    opacity: 0.08;
    filter: blur(8px);
    mix-blend-mode: screen;
`;

// Слой с шумом/помехами
const NoiseLayer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 5;
    pointer-events: none;
    opacity: 0.08;
    background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuNSIvPjwvc3ZnPg==');
    animation: ${noise} 0.2s infinite;
`;

// Основной контейнер терминала
const TerminalContainer = styled.div`
    width: 100%;
    height: 100vh;
    background-color: transparent;
    color: ${COLORS.text};
    font-family: 'Courier New', monospace;
    font-size: 14px;
    padding: 20px;
    box-sizing: border-box;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 10;

    /* Эффект свечения текста */
    text-shadow:
            0 0 8px ${COLORS.text},
            0 0 15px ${COLORS.text}80,
            0 0 20px ${COLORS.text}40;
`;

const TerminalHeader = styled.div`
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid ${COLORS.text};
    font-weight: bold;
    text-shadow:
            0 0 10px ${COLORS.text},
            0 0 20px ${COLORS.text}80,
            0 0 30px ${COLORS.text}60;
`;

const TerminalOutput = styled.div`
    flex: 1;
    overflow-y: auto;
    margin-bottom: 10px;

    &::-webkit-scrollbar {
        width: 10px;
    }

    &::-webkit-scrollbar-track {
        background: ${COLORS.scrollbarTrack};
    }

    &::-webkit-scrollbar-thumb {
        background: ${COLORS.text};
        border-radius: 5px;
        box-shadow:
                0 0 8px ${COLORS.text},
                0 0 15px ${COLORS.text}80;
    }
`;

const OutputLine = styled.div`
    margin: 2px 0;
    white-space: pre-wrap;
    word-wrap: break-word;
`;

const InputLine = styled.div`
    display: flex;
    align-items: center;
    position: relative;
`;

const Prompt = styled.span`
    color: ${COLORS.text};
    margin-right: 8px;
    font-weight: bold;
    flex-shrink: 0;
`;

const InputWrapper = styled.div`
    flex: 1;
    position: relative;
    display: inline-block;
`;

const Input = styled.input`
    background: transparent;
    border: none;
    color: ${COLORS.text};
    font-family: 'Courier New', monospace;
    font-size: 14px;
    outline: none;
    caret-color: transparent;
    width: 100%;
    min-width: 50px;
    text-shadow:
            0 0 8px ${COLORS.text},
            0 0 15px ${COLORS.text}80,
            0 0 20px ${COLORS.text}40;
`;

const Cursor = styled.span`
    position: absolute;
    left: ${props => props.position}ch;
    top: 0;
    display: inline-block;
    width: 8px;
    height: 16px;
    background-color: ${COLORS.text};
    box-shadow:
            0 0 10px ${COLORS.text},
            0 0 20px ${COLORS.text},
            0 0 30px ${COLORS.text}80;
    animation: blink 1s step-end infinite;
    pointer-events: none;

    @keyframes blink {
        50% {
            opacity: 0;
        }
    }
`;

function Terminal() {
    document.title = "NEPTUNE INTELLIGENZA TERMINAL";
    const [userData, setUserData] = useState({ name: 'guest', level: 0 });
    const [history, setHistory] = useState([
        { type: 'output', content: 'thin client v0.1 - init... ready' },
        { type: 'output', content: 'language: ru-RU' },
        { type: 'output', content: 'Состояние сети: 12 узлов доступно; Подключение; Отвергнуто консенсусом; Остановлен.' },
        { type: 'output', content: 'Для доступа к дополнительным функциям используйте: login <имя_пользователя>' },
        { type: 'output', content: '' }
    ]);
    const [input, setInput] = useState('');
    const [commandHistory, setCommandHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const inputRef = useRef(null);
    const outputRef = useRef(null);

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [history]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const processCommand = (cmd) => {
        const trimmed = cmd.trim();
        if (!trimmed) return null;

        const parts = trimmed.split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (commandConfig[command]) {
            if (commandConfig[command].accessLevel > userData.level) {
                return `Ошибка: недостаточно прав для выполнения команды "${command}".\nТребуемый уровень: ${commandConfig[command].accessLevel}\nВаш уровень: ${userData.level}`;
            }

            return commandConfig[command].execute(args, commandConfig, userData.level, setUserData, userData);
        } else {
            return `Команда не найдена: ${command}\nВведите "help" для списка команд.`;
        }
    };

    const handleSubmit = () => {
        if (!input.trim()) return;

        const newHistory = [
            ...history,
            { type: 'command', content: input }
        ];

        const output = processCommand(input);

        if (output === 'CLEAR_SCREEN') {
            setHistory([]);
        } else {
            if (output) {
                newHistory.push({ type: 'output', content: output });
            }
            newHistory.push({ type: 'output', content: '' });
            setHistory(newHistory);
        }

        setCommandHistory([...commandHistory, input]);
        setHistoryIndex(-1);
        setInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length > 0) {
                const newIndex = historyIndex === -1
                    ? commandHistory.length - 1
                    : Math.max(0, historyIndex - 1);
                setHistoryIndex(newIndex);
                setInput(commandHistory[newIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex !== -1) {
                const newIndex = historyIndex + 1;
                if (newIndex >= commandHistory.length) {
                    setHistoryIndex(-1);
                    setInput('');
                } else {
                    setHistoryIndex(newIndex);
                    setInput(commandHistory[newIndex]);
                }
            }
        }
    };

    return (
        <CRTWrapper>
            <CRTScreen>
                <GlowLayer />
                <Scanlines />
                <NoiseLayer />

                <TerminalContainer onClick={() => inputRef.current?.focus()}>
                    <TerminalHeader>
                        === NEPTUNE INTELLIGENZA TERMINAL ===
                    </TerminalHeader>

                    <TerminalOutput ref={outputRef}>
                        {history.map((item, index) => (
                            <OutputLine key={index}>
                                {item.type === 'command' && (
                                    <>
                                        <Prompt>{userData.name}@terminal {'>'}</Prompt>
                                        {item.content}
                                    </>
                                )}
                                {item.type === 'output' && item.content}
                            </OutputLine>
                        ))}
                    </TerminalOutput>

                    <InputLine>
                        <Prompt>{userData.name}@terminal {'>'}</Prompt>
                        <InputWrapper>
                            <Input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                            />
                            <Cursor position={input.length} />
                        </InputWrapper>
                    </InputLine>
                </TerminalContainer>
            </CRTScreen>
        </CRTWrapper>
    );
}

export default Terminal;