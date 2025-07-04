import React from 'react';
import styled from 'styled-components';
import { Accordion } from "../../utils/AccordionComponent";
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import ColorSelectorComponent from "../../utils/ColorSelectorComponent";
import SeekbarComponent from "../../utils/SeekbarComponent";
import { Row } from "../SettingsComponent";
import Separator from "../../utils/Separator";
import { TemplateEditor } from "../../utils/TemplateEditor";

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

export default function FollowSettingsBlock({ current, onChange, index }) {
    const message = current.followMessage?.[index];

    const handleChange = (updater) => {
        onChange((prev) => {
            const updatedMessage =
                typeof updater === 'function' ? updater(prev.followMessage[index]) : updater;

            const updatedArray = [...prev.followMessage];
            updatedArray[index] = updatedMessage;

            return {
                ...prev,
                followMessage: updatedArray,
            };
        });
    };

    return (
        <SettingsBlock>
            <Title>Сообщения "follow" #{index + 1}</Title>

            <Accordion title="Текст">
                <Row>
                    <NumericEditorComponent
                        title="Размер:"
                        value={message?.fontSize ?? 16 }
                        max={82}
                        min={9}
                        onChange={(value) =>
                            handleChange((prev) => ({
                                ...prev,
                                fontSize: value,
                            }))
                        }
                    />
                    <Separator />
                    <Separator />
                </Row>
                <TemplateEditor
                    hint="Доступные плейсхолдеры: {userName}"
                    label="Шаблон для новых фолловеров"
                    value={message.template ?? "🎉 {userName} just followed!"}
                    onChange={(newValue) =>
                        handleChange((prev) => ({
                            ...prev,
                            template: newValue,
                        }))
                    }
                    placeholders={["userName"]}
                />
            </Accordion>

            <Accordion title="Цвета">
                <Row>
                    <ColorSelectorComponent
                        title="Цвет фона:"
                        valueOpacity={message?.backgroundOpacity ?? 1.0}
                        valueColor={message?.backgroundColor ?? "#3e837c"}
                        onChange={(values) =>
                            handleChange((prev) => ({
                                ...prev,
                                backgroundOpacity: values.o,
                                backgroundColor: values.color,
                            }))
                        }
                    />
                    <ColorSelectorComponent
                        title="Цвет обводки:"
                        valueOpacity={message?.borderOpacity ?? 1.0}
                        valueColor={message?.borderColor ?? "#00ffe3"}
                        onChange={(value) =>
                            handleChange((prev) => ({
                                ...prev,
                                borderOpacity: value.o,
                                borderColor: value.color,
                            }))
                        }
                    />
                    <ColorSelectorComponent
                        title="Цвет тени:"
                        valueOpacity={message?.shadowOpacity ?? 0.5}
                        valueColor={message?.shadowColor ?? "#000"}
                        onChange={(value) =>
                            handleChange((prev) => ({
                                ...prev,
                                shadowOpacity: value.o,
                                shadowColor: value.color,
                            }))
                        }
                    />
                </Row>
            </Accordion>

            <Accordion title="Внешний вид">
                <Row>
                    <SeekbarComponent
                        title="Радиус тени:"
                        min="0"
                        max="20"
                        value={message?.shadowRadius ?? 0}
                        step="1"
                        onChange={(e) =>
                            handleChange((prev) => ({
                                ...prev,
                                shadowRadius: e,
                            }))
                        }
                    />
                    <SeekbarComponent
                        title="Радиус скругления:"
                        min="0"
                        max="20"
                        value={message?.borderRadius ?? 0}
                        step="1"
                        onChange={(e) =>
                            handleChange((prev) => ({
                                ...prev,
                                borderRadius: e,
                            }))
                        }
                    />
                </Row>

                <span>Отступы снаружи:</span>
                <Row align="center" gap="0.5rem">
                    <SeekbarComponent
                        title="По горизонтали:"
                        min="0"
                        max="100"
                        value={message?.marginH ?? 0}
                        step="1"
                        onChange={(e) =>
                            handleChange((prev) => ({
                                ...prev,
                                marginH: e,
                            }))
                        }
                    />
                    <SeekbarComponent
                        title="По вертикали:"
                        min="0"
                        max="50"
                        value={message?.marginV ?? 0}
                        step="1"
                        onChange={(e) =>
                            handleChange((prev) => ({
                                ...prev,
                                marginV: e,
                            }))
                        }
                    />
                </Row>

                <span>Отступы внутри:</span>
                <Row align="center" gap="0.5rem">
                    <SeekbarComponent
                        title="По горизонтали:"
                        min="0"
                        max="100"
                        value={message?.paddingH ?? 0}
                        step="1"
                        onChange={(e) =>
                            handleChange((prev) => ({
                                ...prev,
                                paddingH: e,
                            }))
                        }
                    />
                    <SeekbarComponent
                        title="По вертикали:"
                        min="0"
                        max="50"
                        value={message?.paddingV ?? 0}
                        step="1"
                        onChange={(e) =>
                            handleChange((prev) => ({
                                ...prev,
                                paddingV: e,
                            }))
                        }
                    />
                </Row>
            </Accordion>
        </SettingsBlock>
    );
}
