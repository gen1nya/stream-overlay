/*
*  Позволяет настроить поведение для всех сообщений:
* - время жизни сообщений
* - максимальное количество сообщений
* - блюр фона
* - цвет текста и тени от текста
* */

import React from 'react';
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import SeekbarComponent from "../../utils/SeekbarComponent";
import {Row} from "../SettingsComponent";
import {SettingsBlockFull, SettingsBlockTitle} from "./SettingBloks";
import ColorSelectorButton from "./ColorSelectorButton";
import {Spacer} from "../../utils/Separator";

export default function AllMessagesSettings({current, onChange, openColorPopup}) {

    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme)
    }

    return (
        <SettingsBlockFull>
            <SettingsBlockTitle>Настройки для всех типов сообщений</SettingsBlockTitle>
            <Row align="center" gap="0.5rem">
                <ColorSelectorButton
                    title={"Цвет текста:"}
                    hex={current.allMessages?.textColor ?? "#000000"}
                    alpha={current.allMessages?.textOpacity ?? 1}
                    onClick={() => {
                        openColorPopup({
                            initialColor: current.allMessages?.textColor ?? "#ffffff",
                            initialAlpha: current.allMessages?.textOpacity ?? 1,
                            title: 'Цвет текста',
                            onChange: (e) => {
                                handleChange(prev => ({
                                    ...prev,
                                    allMessages: {
                                        ...prev.allMessages,
                                        textColor: e.color,
                                        textOpacity: e.alpha,
                                    },
                                }));
                            }
                        })
                    }
                    }/>
                <NumericEditorComponent
                    title={"Время жизни(сек):"}
                    value={current.allMessages?.lifetime ?? 10}
                    max={60}
                    min={-1}
                    width={"150px"}
                    onChange={value => {
                        handleChange(prev => ({
                            ...prev,
                            allMessages: {
                                ...prev.allMessages,
                                lifetime: value,
                            },
                        }));
                    }}
                />
                <NumericEditorComponent
                    title={"Кол-во сообщений:"}
                    value={current.allMessages?.maxCount ?? 30}
                    max={30}
                    min={1}
                    width={"150px"}
                    onChange={value => {
                        handleChange(prev => ({
                            ...prev,
                            allMessages: {
                                ...prev.allMessages,
                                maxCount: value,
                            },
                        }));
                    }}
                />
                <Spacer/>
                <SeekbarComponent
                    title={"Блюр фона:"}
                    min="0"
                    max="20"
                    value={current.allMessages?.blurRadius ?? 0}
                    step="1"
                    width={"300px"}
                    onChange={e =>
                        handleChange(prev => ({
                            ...prev,
                            allMessages: {
                                ...prev.allMessages,
                                blurRadius: e,
                            },
                        }))
                    }
                />

            </Row>
            <Row>
                <ColorSelectorButton
                    title={"Цвет тени текста:"}
                    hex={current.allMessages?.textShadowColor ?? "#000000"}
                    alpha={current.allMessages?.textShadowOpacity ?? 1}
                    onClick={() => {
                        openColorPopup({
                            initialColor: current.allMessages.textShadowColor ?? "#ffffff",
                            initialAlpha: current.allMessages.textShadowOpacity ?? 1,
                            title: 'Цвет текста',
                            onChange: (e) => {
                                handleChange(prev => ({
                                    ...prev,
                                    allMessages: {
                                        ...prev.allMessages,
                                        textShadowColor: e.color,
                                        textShadowOpacity: e.alpha,
                                    },
                                }));
                            }
                        })
                    }}
                />
                <NumericEditorComponent
                    title={"Положение по X:"}
                    value={current.allMessages?.textShadowXPosition ?? 0}
                    max={20}
                    min={-20}
                    width={"150px"}
                    onChange={value => {
                        handleChange(prev => ({
                            ...prev,
                            allMessages: {
                                ...prev.allMessages,
                                textShadowXPosition: value,
                            },
                        }));
                    }}
                />
                <NumericEditorComponent
                    title={"Положение по Y:"}
                    value={current.allMessages?.textShadowYPosition ?? 0}
                    max={20}
                    min={-20}
                    width={"150px"}
                    onChange={value => {
                        handleChange(prev => ({
                            ...prev,
                            allMessages: {
                                ...prev.allMessages,
                                textShadowYPosition: value,
                            },
                        }));
                    }}
                />
                <Spacer/>
                <SeekbarComponent
                    title={`Радиус тени: ${current.allMessages?.textShadowRadius ?? 5}`}
                    min="0"
                    max="20"
                    value={current.allMessages?.textShadowRadius ?? 5}
                    step="1"
                    width={"300px"}
                    onChange={e =>
                        handleChange(prev => ({
                            ...prev,
                            allMessages: {
                                ...prev.allMessages,
                                textShadowRadius: e,
                            },
                        }))
                    }
                />
            </Row>
        </SettingsBlockFull>
    );
}
