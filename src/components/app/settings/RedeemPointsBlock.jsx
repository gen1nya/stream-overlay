import React from 'react';
import styled from 'styled-components';
import {Accordion} from "../../utils/AccordionComponent";
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import ColorSelectorComponent from "../../utils/ColorSelectorComponent";
import SeekbarComponent from "../../utils/SeekbarComponent";
import {Row} from "../SettingsComponent";
import Separator from "../../utils/Separator";
import {TemplateEditor} from "../../utils/TemplateEditor";
import {SettingsBlockFull, SettingsBlockTitle} from "./SettingBloks";

export default function RedeemPointsBlock({ current, onChange }) {

    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme)
    }

    return (
        <SettingsBlockFull>
            <SettingsBlockTitle>Сообщения наград за балы</SettingsBlockTitle>
            <Accordion title = "Текст">
                <NumericEditorComponent
                    title={"Шрифт сообщений:"}
                    value={current.redeemMessage.fontSize} max={82} min={9} onChange={ value => {
                    handleChange(prev => ({
                        ...prev,
                        redeemMessage: {
                            ...prev.redeemMessage,
                            fontSize: value,
                        },
                    }));
                } } />

                <TemplateEditor
                    hint={"Доступные плейсхолдеры: {userName}, {cost}, {title}"}
                    label="Шаблон для баллов канала"
                    value={current.redeemMessage?.template ?? "🎉 {userName} потратил {cost} балов на {title}"}
                    onChange={(newValue) =>
                        handleChange((prev) => ({
                            ...prev,
                            redeemMessage: {
                                ...prev.redeemMessage,
                                template: newValue,
                            },
                        }))
                    }
                    placeholders={["userName", "cost", "title"]}
                />

            </Accordion>

            <Accordion title={"Цвета"}>
                <Row>
                    <ColorSelectorComponent
                        title="Цвет фона:"
                        valueOpacity={ current.redeemMessage?.backgroundOpacity ?? 1.0 }
                        valueColor={ current.redeemMessage?.backgroundColor ?? "#3e837c" }
                        onChange={ values =>
                            handleChange(prev => ({
                                ...prev,
                                redeemMessage: {
                                    ...prev.redeemMessage,
                                    backgroundOpacity: values.o,
                                    backgroundColor: values.color,
                                },
                            }))
                        }
                    />

                    <ColorSelectorComponent
                        title="Цвет обводки"
                        valueOpacity={current.redeemMessage?.borderOpacity ?? 1.0}
                        valueColor={current.redeemMessage?.borderColor ?? "#00ffe3"}
                        onChange={value => handleChange(prev => ({
                            ...prev,
                            redeemMessage: {
                                ...prev.redeemMessage,
                                borderOpacity: value.o,
                                borderColor: value.color,
                            },
                        }))}
                    />
                    <ColorSelectorComponent
                        title="Цвет тени"
                        valueOpacity={current.redeemMessage?.shadowOpacity ?? 0.5}
                        valueColor={current.redeemMessage?.shadowColor ?? "#000"}
                        onChange={value => handleChange(prev => ({
                            ...prev,
                            redeemMessage: {
                                ...prev.redeemMessage,
                                shadowOpacity: value.o,
                                shadowColor: value.color,
                            },
                        }))}
                    />
                </Row>
            </Accordion>

            <Accordion title={"Внешний вид"}>
                <Row>
                    <SeekbarComponent
                        title="Радиус тени"
                        min="0"
                        max="20"
                        value={current.redeemMessage?.shadowRadius ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                redeemMessage: {
                                    ...prev.redeemMessage,
                                    shadowRadius: e,
                                },
                            }))
                        }
                    />

                    <SeekbarComponent
                        title="Радиус скругления:"
                        min="0"
                        max="20"
                        value={current.redeemMessage?.borderRadius ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                redeemMessage: {
                                    ...prev.redeemMessage,
                                    borderRadius: e,
                                },
                            }))
                        }
                    />
                </Row>

                <span>Отступы снаружи:</span>
                <Row align="center" gap="0.5rem">
                    <SeekbarComponent
                        title={"По горизонтали:"}
                        min="0"
                        max="100"
                        value={current.redeemMessage?.marginH ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                redeemMessage: {
                                    ...prev.redeemMessage,
                                    marginH: e,
                                },
                            }))
                        }
                    />

                    <SeekbarComponent
                        title={"По вертикали:"}
                        min="0"
                        max="50"
                        value={current.redeemMessage?.marginV ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                redeemMessage: {
                                    ...prev.redeemMessage,
                                    marginV: e,
                                },
                            }))
                        }
                    />
                </Row>

                <span>Отступы внутри:</span>
                <Row align="center" gap="0.5rem">
                    <SeekbarComponent
                        title={"По горизонтали:"}
                        min="0"
                        max="100"
                        value={current.redeemMessage?.paddingH ?? 0}
                        step="1"
                        onChange={ e =>
                            handleChange(prev => ({
                                ...prev,
                                redeemMessage: {
                                    ...prev.redeemMessage,
                                    paddingH: e,
                                },
                            }))
                        }
                    />

                    <SeekbarComponent
                        title={"По вертикали:"}
                        min="0"
                        max="50"
                        value={current.redeemMessage?.paddingV ?? 0}
                        step="1"
                        onChange={ e =>
                            handleChange(prev => ({
                                ...prev,
                                redeemMessage: {
                                    ...prev.redeemMessage,
                                    paddingV: e,
                                },
                            }))
                        }
                    />
                </Row>

            </Accordion>

        </SettingsBlockFull>
    )
}