/*
*  Позволяет настроить поведение для всех сообщений:
* - время жизни сообщений
* - максимальное количество сообщений
* - блюр фона
* - цвет текста и тени от текста
* */

import React from 'react';
import styled from 'styled-components';
import {Accordion} from "../../utils/AccordionComponent";
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import ColorSelectorComponent from "../../utils/ColorSelectorComponent";
import SeekbarComponent from "../../utils/SeekbarComponent";
import RadioGroupComponent from "../../utils/RadioGroupComponent";
import {Row} from "../SettingsComponent";
import ConfirmableInputField from "../../utils/ConfirmableInputField";


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

export default function AllMessagesSettings({ current, onChange }) {

    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme)
    }

    return (
        <SettingsBlock>
            <Title>Настройки для ВСЕХ типов сообщений</Title>
            <Accordion title={"Общие настройки"}>
                <Row align="center" gap="0.5rem">
                    <NumericEditorComponent
                        title={"Время жизни сообщений (сек):"}
                        value={current.allMessages?.lifetime ?? 10}
                        max={60}
                        min={-1}
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
                        title={"Макс. количество сообщений:"}
                        value={current.allMessages?.maxCount ?? 30}
                        max={30}
                        min={1}
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
                </Row>
            </Accordion>
            <Accordion title={"Внешний вид"}>
                <Row align="center" gap="0.5rem">
                    <ColorSelectorComponent
                        title={"Цвет текста:"}
                        valueOpacity={current.allMessages?.textOpacity ?? 1}
                        valueColor={current.allMessages?.textColor ?? "#ffffff"}
                        onChange={ values => {
                            console.log("Color values:", values);
                            handleChange(prev => ({
                                ...prev,
                                allMessages: {
                                    ...prev.allMessages,
                                    textColor: values.color,
                                    textOpacity: values.o,
                                },
                            }));
                        }}
                    />
                    <SeekbarComponent
                        title={"Блюр фона:"}
                        min="0"
                        max="20"
                        value={current.allMessages?.blurRadius ?? 0}
                        step="1"
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
                <Accordion title={"Тень текста (СТРАШНОЕ!)"}>
                    <ColorSelectorComponent
                        title={"Цвет тени текста:"}
                        valueColor={current.allMessages?.textShadowColor ?? "#000000"}
                        valueOpacity={current.allMessages?.textShadowOpacity ?? 1}
                        onChange={values => {
                            handleChange(prev => ({
                                ...prev,
                                allMessages: {
                                    ...prev.allMessages,
                                    textShadowColor: values.color,
                                    textShadowOpacity: values.o,
                                },
                            }));
                        }}
                    />
                    <Row>
                        {/*
                        тут выставляется радиус тени ползунком (seekbar component) и положение тени с помощью numeric editor*/}
                        <SeekbarComponent
                            title={`Радиус тени: ${current.allMessages?.textShadowRadius ?? 5}`}
                            min="0"
                            max="20"
                            value={current.allMessages?.textShadowRadius ?? 5}
                            step="1"
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
                        <NumericEditorComponent
                            title={"Положение по X:"}
                            value={current.allMessages?.textShadowXPosition ?? 0}
                            max={20}
                            min={-20}
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
                    </Row>

                </Accordion>

            </Accordion>
        </SettingsBlock>
    );
}
