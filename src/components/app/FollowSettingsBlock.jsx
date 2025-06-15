import React from 'react';
import styled from 'styled-components';
import {Accordion} from "../utils/AccordionComponent";
import NumericEditorComponent from "../NumericEditorComponent";
import ColorSelectorComponent from "../ColorSelectorComponent";
import SeekbarComponent from "../SeekbarComponent";
import RadioGroupComponent from "../RadioGroupComponent";
import {Row} from "../SettingsComponent";

const SettingsBlock = styled.div`
    width: calc(50% - 12px);
    margin-left: 6px;
    margin-right: 6px;
    margin-top: 12px;
    background: #272727;
    border-radius: 18px;
    padding: 0 12px 12px;
    flex-direction: column;
    display: flex;
    gap: 12px;
    box-sizing: border-box;
`;

const Title = styled.h2`
    font-size: 1.5rem;
    font-weight: bold;
    color: #d6d6d6;
    margin: 0;
    padding: 8px 0;
`;

export default function FollowSettingsBlock({ current, onChange }) {

    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme)
    }

    return (
        <SettingsBlock>
            <Title>Настройки follow</Title>
            <Accordion title = "Шрифт сообщений">
                <NumericEditorComponent
                    title={"Размер:"}
                    value={current.followMessage.fontSize}
                    max={82}
                    min={9}
                    onChange={ value => {
                        handleChange(prev => ({
                            ...prev,
                            followMessage: {
                                ...prev.followMessage,
                                fontSize: value,
                            },
                        }));
                    } }
                />
            </Accordion>

            <Accordion title={"Цвета сообщений"}>
                {/* цвет фона обычного сообщения */}
                <ColorSelectorComponent
                    title="Цвет фона:"
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
                    title="Цвет обводки:"
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
                    title="Цвет тени:"
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
                <Row>
                    <SeekbarComponent
                        title="Радиус тени:"
                        min="0"
                        max="20"
                        value={current.followMessage?.shadowRadius ?? 0}
                        step="1"
                        onChange={ e =>
                            handleChange(prev => ({
                                ...prev,
                                followMessage: {
                                    ...prev.followMessage,
                                    shadowRadius: e,
                                },
                            }))
                        }
                    />

                    <SeekbarComponent
                        title="Радиус скругления:"
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
                </Row>


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