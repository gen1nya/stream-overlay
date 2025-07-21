import React, {useMemo} from 'react';
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import SeekbarComponent from "../../utils/SeekbarComponent";
import {Row} from "../SettingsComponent";
import {SettingsBlockFull, SettingsBlockTitle} from "./SettingBloks";
import ColorSelectorButton from "./ColorSelectorButton";
import {Spacer} from "../../utils/Separator";
import {mergeWithDefaults} from "../../utils/defaultBotConfig";

export default function AllMessagesSettings({current, onChange, openColorPopup}) {

    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme)
    }

    const { allMessages } = current;

    return (
        <SettingsBlockFull>
            <SettingsBlockTitle>Настройки для всех типов сообщений</SettingsBlockTitle>
            <Row align="center" gap="0.5rem">
                <ColorSelectorButton
                    title={"Цвет текста:"}
                    hex={allMessages?.textColor ?? "#000000"}
                    alpha={allMessages?.textOpacity ?? 1}
                    openColorPopup={openColorPopup}
                    onColorChange={
                        (e) => {
                            handleChange(prev => ({
                                ...prev,
                                allMessages: {
                                    ...prev.allMessages,
                                    textColor: e.color,
                                    textOpacity: e.alpha,
                                },
                            }));
                        }
                    }/>
                <NumericEditorComponent
                    title={"Время жизни(сек):"}
                    value={allMessages?.lifetime ?? 10}
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
                    value={allMessages?.maxCount ?? 30}
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
                    value={allMessages?.blurRadius ?? 0}
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
                    hex={allMessages?.textShadowColor ?? "#000000"}
                    alpha={allMessages?.textShadowOpacity ?? 1}
                    openColorPopup={openColorPopup}
                    onColorChange={(e) => {
                            handleChange(prev => ({
                                ...prev,
                                allMessages: {
                                    ...prev.allMessages,
                                    textShadowColor: e.color,
                                    textShadowOpacity: e.alpha,
                                },
                            }));
                    }}
                />
                <NumericEditorComponent
                    title={"Положение по X:"}
                    value={allMessages?.textShadowXPosition ?? 0}
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
                    value={allMessages?.textShadowYPosition ?? 0}
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
                    title={`Радиус тени: ${allMessages?.textShadowRadius ?? 5}`}
                    min="0"
                    max="20"
                    value={allMessages?.textShadowRadius ?? 5}
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
