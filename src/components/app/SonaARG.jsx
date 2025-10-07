import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

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

// База пользователей (зашифрованные данные: имя пользователя -> уровень допуска)
const USERS_DB = {
    [encrypt('guest')]: 0,
    [encrypt('user')]: 1,
    [encrypt('admin')]: 2,
    [encrypt('root')]: 3,
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
            return `🔐 Секретное сообщение: Вы получили доступ к закрытым данным!\nЭта команда доступна только администраторам.`;
        }
    },
    shutdown: {
        description: 'Выключить систему (только для root)',
        accessLevel: 3,
        execute: () => {
            return `⚠️  ВНИМАНИЕ: Инициирована процедура выключения системы...\n>>> СИСТЕМА БУДЕТ ОСТАНОВЛЕНА <<<\n(это всего лишь эмуляция)`;
        }
    }
};

const TerminalContainer = styled.div`
    width: 100%;
    height: 100vh;
    background-color: ${COLORS.background};
    color: ${COLORS.text};
    font-family: 'Courier New', monospace;
    font-size: 14px;
    padding: 20px;
    box-sizing: border-box;
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

const TerminalHeader = styled.div`
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid ${COLORS.text};
    font-weight: bold;
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
`;

const Cursor = styled.span`
  position: absolute;
  left: ${props => props.position}ch;
  top: 0;
  display: inline-block;
  width: 8px;
  height: 16px;
  background-color: ${COLORS.text};
  animation: blink 1s step-end infinite;
  pointer-events: none;
  
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
`;

function Terminal() {
    const [userData, setUserData] = useState({ name: 'guest', level: 0 });
    const [history, setHistory] = useState([
        { type: 'output', content: 'Ретро Терминал v1.0 - Инициализация...' },
        { type: 'output', content: 'Система готова. Введите "help" для списка команд.' },
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
            // Проверка уровня доступа
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
        <TerminalContainer onClick={() => inputRef.current?.focus()}>
            <TerminalHeader>
                === RETRO TERMINAL ===
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
    );
}

export default Terminal;