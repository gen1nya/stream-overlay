import React from 'react';
import styled from 'styled-components';
import {Accordion} from "../utils/AccordionComponent";
import NumericEditorComponent from "../NumericEditorComponent";
import ColorSelectorComponent from "../ColorSelectorComponent";
import SeekbarComponent from "../SeekbarComponent";
import RadioGroupComponent from "../RadioGroupComponent";
import {Row} from "../SettingsComponent";

const SettingsBlock = styled.div`
    padding: 0 12px;
    width: 48%;
    flex-direction: column;
    display: flex;
    gap: 12px;
`

export default function FollowSettingsBlock({ current, onChange }) {

    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme)
    }

    return (
        <SettingsBlock>
            <Accordion title = "Шрифт сообщений">
                <NumericEditorComponent
                    title={"Шрифт сообщений:"}
                    value={14} max={82} min={9} onChange={ value => {
                    handleChange(prev => ({
                        ...prev,
                        followMessage: {
                            ...prev.followMessage,
                            fontSize: value,
                        },
                    }));
                } } />

                <NumericEditorComponent
                    title={"Шрифт заголовка:"}
                    value={14} max={82} min={9} onChange={ value => {
                    handleChange(prev => ({
                        ...prev,
                        followMessage: {
                            ...prev.followMessage,
                            titleFontSize: value,
                        },
                    }));
                } } />
            </Accordion>

            <Accordion title={"Цвета сообщений"}>
                {/* цвет фона обычного сообщения */}
                <ColorSelectorComponent
                    title="Цвет фона обычного сообщения:"
                    valueOpacity={current.followMessage?.backgroundOpacity ?? 1.0}
                    valueColor={current.followMessage?.backgroundColor ?? "#3e837c"}
                    onChange={ values =>
                        handleChange(prev => ({
                            ...prev,
                            followMessage: {
                                ...prev.followMessage,
                                backgroundOpacity: values.o,
                                backgroundColor: values.color,
                            },
                        }))
                    }
                />

                {/*Цвет обводки&nbsp;«обычных»&nbsp;сообщений:*/}
                <ColorSelectorComponent
                    title="Цвет обводки обычного сообщения:"
                    valueOpacity={current.followMessage?.borderOpacity ?? 1.0}
                    valueColor={current.followMessage?.borderColor ?? "#00ffe3"}
                    onChange={value => handleChange(prev => ({
                        ...prev,
                        followMessage: {
                            ...prev.followMessage,
                            borderOpacity: value.o,
                            borderColor: value.color,
                        },
                    }))}
                />

                <ColorSelectorComponent
                    title="Цвет тени &nbsp;«обычных»&nbsp;сообщений:"
                    valueOpacity={current.followMessage?.shadowOpacity ?? 0.5}
                    valueColor={current.followMessage?.shadowColor ?? "#000"}
                    onChange={value => handleChange(prev => ({
                        ...prev,
                        followMessage: {
                            ...prev.followMessage,
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
                    value={current.followMessage?.shadowRadius ?? 0}
                    step="1"
                    onChange={e =>
                        handleChange(prev => ({
                            ...prev,
                            followMessage: {
                                ...prev.followMessage,
                                shadowRadius: e,
                            },
                        }))
                    }
                />

                <RadioGroupComponent
                    title="Направление&nbsp;«обычных»&nbsp;сообщений:"
                    options={[
                        {value: "row", label: "По горизонтали"},
                        {value: "column", label: "По вертикали"},
                    ]}
                    selected={current.followMessage?.direction ?? "column"}
                    onChange={value =>
                        handleChange(prev => ({
                            ...prev,
                            followMessage: {
                                ...prev.followMessage,
                                direction: value,
                            },
                        }))
                    }
                />

                <SeekbarComponent
                    title="Радиус скругления &nbsp;«обычных»&nbsp;сообщений:"
                    min="0"
                    max="20"
                    value={current.followMessage?.borderRadius ?? 0}
                    step="1"
                    onChange={e =>
                        handleChange(prev => ({
                            ...prev,
                            followMessage: {
                                ...prev.followMessage,
                                borderRadius: e,
                            },
                        }))
                    }
                />

                <span>Отступы снаружи:</span>
                <Row align="center" gap="0.5rem">
                    <SeekbarComponent
                        title={"По горизонтали:"}
                        min="0"
                        max="100"
                        value={current.followMessage?.marginH ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                followMessage: {
                                    ...prev.followMessage,
                                    marginH: e,
                                },
                            }))
                        }
                    />

                    <SeekbarComponent
                        title={"По вертикали:"}
                        min="0"
                        max="50"
                        value={current.followMessage?.marginV ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                followMessage: {
                                    ...prev.followMessage,
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
                        value={current.followMessage?.paddingH ?? 0}
                        step="1"
                        onChange={ e =>
                            handleChange(prev => ({
                                ...prev,
                                followMessage: {
                                    ...prev.followMessage,
                                    paddingH: e,
                                },
                            }))
                        }
                    />

                    <SeekbarComponent
                        title={"По вертикали:"}
                        min="0"
                        max="50"
                        value={current.followMessage?.paddingV ?? 0}
                        step="1"
                        onChange={ e =>
                            handleChange(prev => ({
                                ...prev,
                                followMessage: {
                                    ...prev.followMessage,
                                    paddingV: e,
                                },
                            }))
                        }
                    />
                </Row>

            </Accordion>

        </SettingsBlock>
    )
}