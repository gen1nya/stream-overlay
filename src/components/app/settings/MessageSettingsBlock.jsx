import React from 'react';
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import SeekbarComponent from "../../utils/SeekbarComponent";
import RadioGroupComponent from "../../utils/RadioGroupComponent";
import {Row} from "../SettingsComponent";
import {SettingsBlockFull, SettingsBlockTitle} from "./SettingBloks";
import ColorSelectorButton from "./ColorSelectorButton";
import {Spacer} from "../../utils/Separator";

export default function MessageSettingsBlock({current, onChange, openColorPopup}) {

    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme)
    }

    return (
        <SettingsBlockFull>
            <SettingsBlockTitle>Сообщения чатерсов</SettingsBlockTitle>

            <Row>
                <RadioGroupComponent
                    width={"150px"}
                    title="Заголовок:"
                    options={[
                        {value: "row", label: "слева"},
                        {value: "column", label: "сверху"},
                    ]}
                    selected={current.chatMessage.direction}
                    onChange={value =>
                        handleChange(prev => ({
                            ...prev,
                            chatMessage: {
                                ...prev.chatMessage,
                                direction: value,
                            },
                        }))
                    }
                />
                <Spacer/>
                <NumericEditorComponent
                    title={"Шрифт сообщений:"}
                    value={current.chatMessage.fontSize}
                    max={82}
                    min={9}
                    width={"150px"}
                    onChange={value => {
                        handleChange(prev => ({
                            ...prev,
                            chatMessage: {
                                ...prev.chatMessage,
                                fontSize: value,
                            },
                        }));
                    }}
                />

                <NumericEditorComponent
                    title={"Шрифт заголовка:"}
                    value={current.chatMessage.titleFontSize}
                    max={82}
                    min={9}
                    width={"150px"}
                    onChange={value => {
                        handleChange(prev => ({
                            ...prev,
                            chatMessage: {
                                ...prev.chatMessage,
                                titleFontSize: value,
                            },
                        }));
                    }}
                />
            </Row>

            <Row>
                <ColorSelectorButton
                    title={"Цвет фона:"}
                    hex={current.chatMessage?.backgroundColor ?? "#000000"}
                    alpha={current.chatMessage?.backgroundOpacity ?? 1}
                    onClick={() => {
                        openColorPopup({
                            initialColor: current.chatMessage.backgroundColor ?? "#ffffff",
                            initialAlpha: current.chatMessage.backgroundOpacity ?? 1,
                            title: 'Цвет текста',
                            onChange: (e) => {
                                handleChange(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        backgroundColor: e.color,
                                        backgroundOpacity: e.alpha,
                                    },
                                }));
                            }
                        })
                    }}
                />
                <Spacer/>
            </Row>

            <Row>
                <ColorSelectorButton
                    title={"Цвет обводки:"}
                    hex={current.chatMessage?.borderColor ?? "#000000"}
                    alpha={current.chatMessage?.borderOpacity ?? 1}
                    onClick={() => {
                        openColorPopup({
                            initialColor: current.chatMessage.borderColor ?? "#ffffff",
                            initialAlpha: current.chatMessage.borderOpacity ?? 1,
                            title: 'Цвет текста',
                            onChange: (e) => {
                                handleChange(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        borderColor: e.color,
                                        borderOpacity: e.alpha,
                                    },
                                }));
                            }
                        })
                    }}
                />
                <Spacer/>
                <SeekbarComponent
                    title="Радиус скругления"
                    min="0"
                    max="20"
                    value={current.chatMessage.borderRadius ?? 0}
                    step="1"
                    width={"320px"}
                    onChange={e =>
                        handleChange(prev => ({
                            ...prev,
                            chatMessage: {
                                ...prev.chatMessage,
                                borderRadius: e,
                            },
                        }))
                    }
                />
            </Row>

            <Row>
                <ColorSelectorButton
                    title={"Цвет тени:"}
                    hex={current.chatMessage?.shadowColor ?? "#000000"}
                    alpha={current.chatMessage?.shadowOpacity ?? 1}
                    onClick={() => {
                        openColorPopup({
                            initialColor: current.chatMessage.shadowColor ?? "#ffffff",
                            initialAlpha: current.chatMessage.shadowOpacity ?? 1,
                            title: 'Цвет текста',
                            onChange: (e) => {
                                handleChange(prev => ({
                                    ...prev,
                                    chatMessage: {
                                        ...prev.chatMessage,
                                        shadowColor: e.color,
                                        shadowOpacity: e.alpha,
                                    },
                                }));
                            }
                        })
                    }}
                />
                <Spacer/>
                <SeekbarComponent
                    title="Радиус тени"
                    min="0"
                    max="20"
                    value={current.chatMessage.shadowRadius ?? 0}
                    step="1"
                    width={"320px"}
                    onChange={e =>
                        handleChange(prev => ({
                            ...prev,
                            chatMessage: {
                                ...prev.chatMessage,
                                shadowRadius: e,
                            },
                        }))
                    }
                />
            </Row>

            <div>
                <span>Отступы снаружи:</span>
                <Row align="center" gap="0.5rem">
                    <SeekbarComponent
                        title={`По горизонтали (${current.chatMessage.marginH ?? 0}):`}
                        min="0"
                        max="100"
                        width={"150px"}
                        value={current.chatMessage.marginH ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                chatMessage: {
                                    ...prev.chatMessage,
                                    marginH: e,
                                },
                            }))
                        }
                    />

                    <SeekbarComponent
                        title={`По вертикали (${current.chatMessage.marginV ?? 0}):`}
                        min="0"
                        max="50"
                        width={"150px"}
                        value={current.chatMessage.marginV ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                chatMessage: {
                                    ...prev.chatMessage,
                                    marginV: e,
                                },
                            }))
                        }
                    />
                </Row>
            </div>

            <div>
                <span>Отступы внутри:</span>
                <Row>
                    <SeekbarComponent
                        title={`По горизонтали (${current.chatMessage.paddingH ?? 0}):`}
                        min="0"
                        max="100"
                        width={"150px"}
                        value={current.chatMessage.paddingH ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                chatMessage: {
                                    ...prev.chatMessage,
                                    paddingH: e,
                                },
                            }))
                        }
                    />

                    <SeekbarComponent
                        title={`По вертикали (${current.chatMessage.paddingV ?? 0}):`}
                        min="0"
                        max="50"
                        value={current.chatMessage.paddingV ?? 0}
                        step="1"
                        width={"150px"}
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                chatMessage: {
                                    ...prev.chatMessage,
                                    paddingV: e,
                                },
                            }))
                        }
                    />
                </Row>
            </div>

        </SettingsBlockFull>
    )
}