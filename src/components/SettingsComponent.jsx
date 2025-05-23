// Settings.js
import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { setRemoteTheme } from '../services/api';

const Panel = styled.div`
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    height: 100vh;
    padding: 0px;
    background: #171717;
    color: #f6f6f6;
    box-shadow: -4px 0 8px #0002;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Seekbar = styled.input`
    width: 100px;
    height: 24px
`

const RadioGroup = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.5rem; /* расстояние между кнопками */
`;

const SettingsBlock = styled.div`
    width: 33%;
    flex-direction: column;
    display: flex;
    gap: 12px;
`

const Toolbar = styled.div`
    width: 100%;
    height: 60px;
`

const Content = styled.div`
    display: flex;
`

export default function Settings({ current, onChange }) {
    const navigate = useNavigate();

    /** Единая «точка входа» для всех изменений темы */
    const apply = updaterOrTheme => {
        // 1) локально меняем тему (главное окно)
        onChange(updaterOrTheme);

        // 2) вычисляем «чистый» объект темы
        const nextTheme =
            typeof updaterOrTheme === 'function'
                ? updaterOrTheme(current) // превращаем updater-функцию в объект
                : updaterOrTheme;

        // 3) отправляем наружу (IPC / WS скрыт в setRemoteTheme)
        setRemoteTheme(nextTheme);
    };

    const handleBackButton = () => navigate('/', { replace: true });

    return (
        <Panel>

            <Toolbar>
                <button onClick={handleBackButton}>Назад</button>
            </Toolbar>


            <Content>
                <SettingsBlock>


                {/* цвет фона обычного сообщения */}
                    <label>
                        Цвет фона&nbsp;«обычных»&nbsp;сообщений:
                        <input
                            type="color"
                            value={current.chatMessage.backgroundColor}
                            onChange={e =>
                                apply(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        backgroundColor: e.target.value,
                                    },
                                }))
                            }
                        />
                    </label>

                    <label>
                        Цвет обводки&nbsp;«обычных»&nbsp;сообщений:
                        <input
                            type="color"
                            value={current.chatMessage.borderColor}
                            onChange={e =>
                                apply(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        borderColor: e.target.value,
                                    },
                                }))
                            }
                        />
                    </label>

                    <label>
                        Цвет тени &nbsp;«обычных»&nbsp;сообщений:
                        <input
                            type="color"
                            value={current.chatMessage.shadowColor}
                            onChange={e =>
                                apply(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        shadowColor: e.target.value,
                                    },
                                }))
                            }
                        />
                    </label>

                    <label>
                        Прозрачность тени &nbsp;«обычных»&nbsp;сообщений:
                        <Seekbar
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={current.chatMessage.shadowOpacity ?? 0}
                            onChange={e =>
                                apply(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        shadowOpacity: e.target.value,
                                    },
                                }))
                            }
                        />
                    </label>

                    <label>
                        Радиус тени &nbsp;«обычных»&nbsp;сообщений:
                        <Seekbar
                            type="range"
                            min="0"
                            max="20"
                            step="1"
                            value={current.chatMessage.shadowRadius ?? 0}
                            onChange={e =>
                                apply(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        shadowRadius: e.target.value,
                                    },
                                }))
                            }
                        />
                    </label>


                    <RadioGroup>
                        <label key="row">
                            <input
                                type="radio"
                                name="myRadio"
                                value="row"
                                checked={current.chatMessage.direction === "row"}
                                onChange={e =>
                                    apply(prev => ({
                                        ...prev,
                                        chatMessage: {
                                            ...prev.chatMessage,
                                            direction: "row",
                                        },
                                    }))
                                }
                            />
                            row
                        </label>
                        <label key="column">
                            <input
                                type="radio"
                                name="myRadio"
                                value="column"
                                checked={current.chatMessage.direction === "column"}
                                onChange={e =>
                                    apply(prev => ({
                                        ...prev,
                                        chatMessage: {
                                            ...prev.chatMessage,
                                            direction: "column",
                                        },
                                    }))
                                }
                            />
                            column
                        </label>
                    </RadioGroup>

                    <label>
                        Радиус скругления &nbsp;«обычных»&nbsp;сообщений:
                        <Seekbar
                            type="range"
                            min="0"
                            max="20"
                            step="1"
                            value={current.chatMessage.borderRadius ?? 0}
                            onChange={e =>
                                apply(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        borderRadius: e.target.value,
                                    },
                                }))
                            }
                        />
                    </label>

                    <label>
                        Отступ по горизонтали:
                        <Seekbar
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={current.chatMessage.marginH ?? 0}
                            onChange={e =>
                                apply(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        marginH: e.target.value,
                                    },
                                }))
                            }
                        />
                    </label>

                    <label>
                        Отступ по вертикали:
                        <Seekbar
                            type="range"
                            min="0"
                            max="50"
                            step="1"
                            value={current.chatMessage.marginV ?? 0}
                            onChange={e =>
                                apply(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        marginV: e.target.value,
                                    },
                                }))
                            }
                        />
                    </label>

                </SettingsBlock>
            </Content>
        </Panel>
    );
}
