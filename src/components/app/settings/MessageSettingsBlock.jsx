import React from 'react';
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import SeekbarComponent from "../../utils/SeekbarComponent";
import RadioGroupComponent from "../../utils/RadioGroupComponent";
import {Row} from "../SettingsComponent";
import {SettingsBlockFull, SettingsBlockTitle} from "./SettingBloks";
import ColorSelectorButton from "./ColorSelectorButton";
import {Spacer} from "../../utils/Separator";
import FontAndSizeEditor from "../../utils/FontAndSizeEditor";

export default function MessageSettingsBlock({current, onChange, openColorPopup}) {

    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme)
    }

    const { chatMessage } = current;
    console.log("chatMessage", JSON.stringify(chatMessage, null, 2));

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
                    selected={chatMessage.direction}
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
                <FontAndSizeEditor
                    title={"Шрифт сообщений:"}
                    fontSize={chatMessage.fontSize}
                    fontFamily={chatMessage.messageFont.family}
                    onFontChange={(newFont) =>
                        handleChange(prev => ({
                            ...prev,
                            chatMessage: {
                                ...prev.chatMessage,
                                messageFont: {
                                    ...prev.chatMessage.messageFont,
                                    family: newFont.family,
                                    url: newFont.url,
                                },
                            },
                        }))}
                    onFontSizeChange={value =>
                        handleChange(prev => ({
                            ...prev,
                            chatMessage: {
                                ...prev.chatMessage,
                                fontSize: value,
                            },
                        }))}
                />

                <FontAndSizeEditor
                    title={"Шрифт заголовка:"}
                    fontSize={chatMessage.titleFontSize}
                    fontFamily={chatMessage.titleFont.family}
                    onFontChange={(newFont) => handleChange(prev => ({
                        ...prev,
                        chatMessage: {
                            ...prev.chatMessage,
                            titleFont: {
                                ...prev.chatMessage.titleFont,
                                family: newFont.family,
                                url: newFont.url,
                            },
                        },
                    }))}
                    onFontSizeChange={value => {
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
                    hex={chatMessage?.backgroundColor ?? "#000000"}
                    alpha={chatMessage?.backgroundOpacity ?? 1}
                    openColorPopup={openColorPopup}
                    onColorChange={(e) => {
                        handleChange(prev => ({
                            ...prev,
                            chatMessage: {
                                ...prev.chatMessage,
                                backgroundColor: e.color,
                                backgroundOpacity: e.alpha,
                            },
                        }));
                    }}
                />
                <Spacer/>
            </Row>

            <Row>
                <ColorSelectorButton
                    title={"Цвет обводки:"}
                    hex={chatMessage?.borderColor ?? "#000000"}
                    alpha={chatMessage?.borderOpacity ?? 1}
                    openColorPopup={openColorPopup}
                    onColorChange={(e) => {
                        handleChange(prev => ({
                            ...prev,
                            chatMessage: {
                                ...prev.chatMessage,
                                borderColor: e.color,
                                borderOpacity: e.alpha,
                            },
                        }));
                    }}
                />
                <Spacer/>
                <SeekbarComponent
                    title={`Радиус скругления (${chatMessage.borderRadius ?? 0}):`}
                    min="0"
                    max="20"
                    value={chatMessage.borderRadius ?? 0}
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
                    hex={chatMessage?.shadowColor ?? "#000000"}
                    alpha={chatMessage?.shadowOpacity ?? 1}
                    openColorPopup={openColorPopup}
                    onColorChange={(e) => {
                        handleChange(prev => ({
                            ...prev,
                            chatMessage: {
                                ...prev.chatMessage,
                                shadowColor: e.color,
                                shadowOpacity: e.alpha,
                            },
                        }));
                    }}
                />
                <Spacer/>
                <SeekbarComponent
                    title={`Радиус тени (${chatMessage.shadowRadius ?? 0}):`}
                    min="0"
                    max="20"
                    value={chatMessage.shadowRadius ?? 0}
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
                        title={`По горизонтали (${chatMessage.marginH ?? 0}):`}
                        min="0"
                        max="100"
                        width={"150px"}
                        value={chatMessage.marginH ?? 0}
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
                        title={`По вертикали (${chatMessage.marginV ?? 0}):`}
                        min="0"
                        max="50"
                        width={"150px"}
                        value={chatMessage.marginV ?? 0}
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
                        title={`По горизонтали (${chatMessage.paddingH ?? 0}):`}
                        min="0"
                        max="100"
                        width={"150px"}
                        value={chatMessage.paddingH ?? 0}
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
                        title={`По вертикали (${chatMessage.paddingV ?? 0}):`}
                        min="0"
                        max="50"
                        value={chatMessage.paddingV ?? 0}
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