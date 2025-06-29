import React from 'react';
import styled from 'styled-components';
import {Accordion} from "../../utils/AccordionComponent";
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import ColorSelectorComponent from "../../utils/ColorSelectorComponent";
import SeekbarComponent from "../../utils/SeekbarComponent";
import RadioGroupComponent from "../../utils/RadioGroupComponent";
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

export default function MessageSettingsBlock({ current, onChange }) {

    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme)
    }

    return (
        <SettingsBlock>
            <Title>Сообщения чатерсов</Title>
            <Accordion title = {"Текст"}>
                <Row align="center" gap="0.5rem">
                    <NumericEditorComponent
                        title={"Шрифт сообщений:"}
                        value={current.chatMessage.fontSize}
                        max={82}
                        min={9}
                        onChange={ value => {
                            handleChange(prev => ({
                                ...prev,
                                chatMessage: {
                                    ...prev.chatMessage,
                                    fontSize: value,
                                },
                            }));
                        } }
                    />

                    <NumericEditorComponent
                        title={"Шрифт заголовка:"}
                        value={current.chatMessage.titleFontSize}
                        max={82}
                        min={9}
                        onChange={ value => {
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
            </Accordion>

            <Accordion title={"Цвета"}>
                <Row>
                    <ColorSelectorComponent
                        title={"Цвет фона"}
                        valueOpacity={current.chatMessage.backgroundOpacity}
                        valueColor={current.chatMessage.backgroundColor}
                        onChange={ values =>
                            handleChange(prev => ({
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
                        title="Цвет обводки"
                        valueOpacity={current.chatMessage.borderOpacity}
                        valueColor={current.chatMessage.borderColor}
                        onChange={value => handleChange(prev => ({
                            ...prev,
                            chatMessage: {
                                ...prev.chatMessage,
                                borderOpacity: value.o,
                                borderColor: value.color,
                            },
                        }))}
                    />

                    <ColorSelectorComponent
                        title="Цвет тени"
                        valueOpacity={current.chatMessage.shadowOpacity}
                        valueColor={current.chatMessage.shadowColor}
                        onChange={value => handleChange(prev => ({
                            ...prev,
                            chatMessage: {
                                ...prev.chatMessage,
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
                        value={current.chatMessage.shadowRadius ?? 0}
                        step="1"
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
                    <SeekbarComponent
                        title="Радиус скругления"
                        min="0"
                        max="20"
                        value={current.chatMessage.borderRadius ?? 0}
                        step="1"
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

                <RadioGroupComponent
                    title="положение заголовка"
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

                <span>Отступы снаружи:</span>
                <Row align="center" gap="0.5rem">
                    <SeekbarComponent
                        title={"По горизонтали:"}
                        min="0"
                        max="100"
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
                        title={"По вертикали:"}
                        min="0"
                        max="50"
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

                <span>Отступы внутри:</span>
                <Row align="center" gap="0.5rem">
                    <SeekbarComponent
                        title={"По горизонтали:"}
                        min="0"
                        max="100"
                        value={current.chatMessage.paddingH ?? 0}
                        step="1"
                        onChange={ e =>
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
                        title={"По вертикали:"}
                        min="0"
                        max="50"
                        value={current.chatMessage.paddingV ?? 0}
                        step="1"
                        onChange={ e =>
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

            </Accordion>

        </SettingsBlock>
    )
}