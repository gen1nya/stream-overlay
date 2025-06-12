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

export default function RedeemPointsBlock({ current, onChange }) {

    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme)
    }

    return (
        <SettingsBlock>
            <Title>Настройки трат баллов канала</Title>
            <Accordion title = "Шрифт сообщений">
                <NumericEditorComponent
                    title={"Шрифт сообщений:"}
                    value={14} max={82} min={9} onChange={ value => {
                    handleChange(prev => ({
                        ...prev,
                        redeemMessage: {
                            ...prev.redeemMessage,
                            fontSize: value,
                        },
                    }));
                } } />

                <NumericEditorComponent
                    title={"Шрифт заголовка:"}
                    value={14} max={82} min={9} onChange={ value => {
                    handleChange(prev => ({
                        ...prev,
                        redeemMessage: {
                            ...prev.redeemMessage,
                            titleFontSize: value,
                        },
                    }));
                } } />
            </Accordion>

            <Accordion title={"Цвета сообщений"}>
                {/* цвет фона обычного сообщения */}
                <ColorSelectorComponent
                    title="Цвет фона обычного сообщения:"
                    valueOpacity={current.redeemMessage?.backgroundOpacity ?? 1.0}
                    valueColor={current.redeemMessage?.backgroundColor ?? "#3e837c"}
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

                {/*Цвет обводки&nbsp;«обычных»&nbsp;сообщений:*/}
                <ColorSelectorComponent
                    title="Цвет обводки обычного сообщения:"
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
                    title="Цвет тени &nbsp;«обычных»&nbsp;сообщений:"
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
            </Accordion>

            <Accordion title={"Параметры сообщений"}>
                <SeekbarComponent
                    title="Радиус тени &nbsp;«обычных»&nbsp;сообщений:"
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

                <RadioGroupComponent
                    title="Направление&nbsp;«обычных»&nbsp;сообщений:"
                    options={[
                        {value: "row", label: "По горизонтали"},
                        {value: "column", label: "По вертикали"},
                    ]}
                    selected={current.redeemMessage?.direction ?? "column"}
                    onChange={value =>
                        handleChange(prev => ({
                            ...prev,
                            redeemMessage: {
                                ...prev.redeemMessage,
                                direction: value,
                            },
                        }))
                    }
                />

                <SeekbarComponent
                    title="Радиус скругления &nbsp;«обычных»&nbsp;сообщений:"
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

        </SettingsBlock>
    )
}