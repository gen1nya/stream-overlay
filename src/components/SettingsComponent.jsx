// Settings.js
import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {openPreview, setRemoteTheme} from '../services/api';
import SeekbarComponent from "./SeekbarComponent";
import ColorSelectorComponent from "./ColorSelectorComponent";
import RadioGroupComponent from "./RadioGroupComponent";
import NumericEditorComponent from "./NumericEditorComponent";
import {Accordion} from "./AccordionComponent";

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

const SettingsBlock = styled.div`
    padding: 0px 12px;
    width: 100%;
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

    const handleBackButton = () => navigate(-1);
    const handlePreviewButton = async () => {
        await openPreview()
    };

    return (
        <Panel>
            <Toolbar>
                <button onClick={handleBackButton}>Назад</button>
                <button onClick={handlePreviewButton}>Превью</button>
            </Toolbar>


            <Content>
                <SettingsBlock>


                    <Accordion title = "Шрифт сообщений">
                        <NumericEditorComponent
                            title={"Шрифт сообщений:"}
                            value={14} max={82} min={9} onChange={ value => {
                            apply(prev => ({
                                ...prev,
                                chatMessage: {
                                    ...prev.chatMessage,
                                    fontSize: value,
                                },
                            }));
                        } } />

                        <NumericEditorComponent
                            title={"Шрифт заголовка:"}
                            value={14} max={82} min={9} onChange={ value => {
                            apply(prev => ({
                                ...prev,
                                chatMessage: {
                                    ...prev.chatMessage,
                                    titleFontSize: value,
                                },
                            }));
                        } } />
                    </Accordion>

                    <Accordion title={"Цвета сообщений"}>
                        {/* цвет фона обычного сообщения */}
                        <ColorSelectorComponent
                            title="Цвет фона обычного сообщения:"
                            valueOpacity={current.chatMessage.backgroundOpacity}
                            valueColor={current.chatMessage.backgroundColor}
                            onChange={ values =>
                                apply(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        backgroundOpacity: values.o,
                                        backgroundColor: values.color,
                                    },
                                }))
                            }
                        />

                        {/*Цвет обводки&nbsp;«обычных»&nbsp;сообщений:*/}
                        <ColorSelectorComponent
                            title="Цвет обводки обычного сообщения:"
                            valueOpacity={current.chatMessage.borderOpacity}
                            valueColor={current.chatMessage.borderColor}
                            onChange={value => apply(prev => ({
                                ...prev,
                                chatMessage: {
                                    ...prev.chatMessage,
                                    borderOpacity: value.o,
                                    borderColor: value.color,
                                },
                            }))}
                        />

                        <ColorSelectorComponent
                            title="Цвет тени &nbsp;«обычных»&nbsp;сообщений:"
                            valueOpacity={current.chatMessage.shadowOpacity}
                            valueColor={current.chatMessage.shadowColor}
                            onChange={value => apply(prev => ({
                                ...prev,
                                chatMessage: {
                                    ...prev.chatMessage,
                                    shadowOpacity: value.o,
                                    shadowColor: value.color,
                                },
                            }))}
                        />
                    </Accordion>

                    <Accordion title={"Параметры сообщений"}>
                        <SeekbarComponent
                            title="Радиус тени &nbsp;«обычных»&nbsp;сообщений:"
                            min="0"
                            max="20"
                            value={current.chatMessage.shadowRadius ?? 0}
                            step="1"
                            onChange={ e =>
                                apply(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        shadowRadius: e,
                                    },
                                }))
                            }
                        />

                        <RadioGroupComponent
                            title="Направление&nbsp;«обычных»&nbsp;сообщений:"
                            options={[
                                { value: "row", label: "По горизонтали" },
                                { value: "column", label: "По вертикали" },
                            ]}
                            selected={current.chatMessage.direction}
                            onChange={value =>
                                apply(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        direction: value,
                                    },
                                }))
                            }
                        />

                        <SeekbarComponent
                            title="Радиус скругления &nbsp;«обычных»&nbsp;сообщений:"
                            min="0"
                            max="20"
                            value={current.chatMessage.borderRadius ?? 0}
                            step="1"
                            onChange={ e =>
                                apply(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        borderRadius: e,
                                    },
                                }))
                            }
                        />

                        <SeekbarComponent title={"Отступ по горизонтали:"}
                                          min="0"
                                          max="100"
                                          value={current.chatMessage.marginH ?? 0}
                                          step="1"
                                          onChange={ e =>
                                              apply(prev => ({
                                                  ...prev,
                                                  chatMessage: {
                                                      ...prev.chatMessage,
                                                      marginH: e,
                                                  },
                                              }))
                                          }
                        />

                        <SeekbarComponent
                            title={"Отступ по вертикали:"}
                            min="0"
                            max="50"
                            value={current.chatMessage.marginV ?? 0}
                            step="1"
                            onChange={ e =>
                                apply(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        marginV: e,
                                    },
                                }))
                            }
                        />
                    </Accordion>

                </SettingsBlock>
            </Content>
        </Panel>
    );
}
