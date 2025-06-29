import React from 'react';
import styled from 'styled-components';
import {Accordion} from "../../utils/AccordionComponent";
import ColorSelectorComponent from "../../utils/ColorSelectorComponent";
import {Row} from "../SettingsComponent";
import SeekbarComponent from "../../utils/SeekbarComponent";
import RadioGroupComponent from "../../utils/RadioGroupComponent";
import NumericEditorComponent from "../../utils/NumericEditorComponent";


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

export default function PlayerSettingsComponent({ current, onChange }) {

    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme)
    }

    return (
        <SettingsBlock>
            <Title>Настройки плеера</Title>
            <Accordion title = "Плеер - цвета">
                <Row align="center" gap="0.5rem">
                    <ColorSelectorComponent
                        title="Цвет фона плеера:"
                        valueOpacity={current.player?.backgroundOpacity ?? 1.0}
                        valueColor={current.player?.backgroundColor ?? "#3e837c"}
                        onChange={ values =>
                            handleChange(prev => ({
                                ...prev,
                                player: {
                                    ...prev.player,
                                    backgroundOpacity: values.o,
                                    backgroundColor: values.color,
                                },
                            }))
                        }
                    />
                    <ColorSelectorComponent
                        title="Цвет обводки плеера:"
                        valueOpacity={current.player?.borderOpacity ?? 1.0}
                        valueColor={current.player?.borderColor ?? "#3e837c"}
                        onChange={ values =>
                            handleChange(prev => ({
                                ...prev,
                                player: {
                                    ...prev.player,
                                    borderOpacity: values.o,
                                    borderColor: values.color,
                                },
                            }))
                        }
                    />
                </Row>

                <Row align="center" gap="0.5rem">
                    <ColorSelectorComponent
                        title="Цвет тени плеера:"
                        valueOpacity={current.player?.shadowOpacity ?? 1.0}
                        valueColor={current.player?.shadowColor ?? "#3e837c"}
                        onChange={ values =>
                            handleChange(prev => ({
                                ...prev,
                                player: {
                                    ...prev.player,
                                    shadowOpacity: values.o,
                                    shadowColor: values.color,
                                },
                            }))
                        }
                    />

                    <ColorSelectorComponent
                        title="Цвет тени пластинки:"
                        valueOpacity={current.player?.diskShadowOpacity ?? 1.0}
                        valueColor={current.player?.diskShadowColor ?? "#3e837c"}
                        onChange={ values =>
                            handleChange(prev => ({
                                ...prev,
                                player: {
                                    ...prev.player,
                                    diskShadowOpacity: values.o,
                                    diskShadowColor: values.color,
                                },
                            }))
                        }
                    />
                </Row>

            </Accordion>

            <Accordion title="Плеер - скругления">
                <span>Сверху</span>
                <Row align="center" gap="0.5rem">
                    <SeekbarComponent
                        title={`Слева ${current.player?.borderRadius?.topLeft ?? 0}`}
                        min="0"
                        max="150"
                        value={current.player?.borderRadius?.topLeft ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                player: {
                                    ...prev.player,
                                    borderRadius: {
                                        ...prev.player.borderRadius,
                                        topLeft: e,
                                    }
                                },
                            }))
                        }
                    />

                    <SeekbarComponent
                        title={`Справа ${current.player?.borderRadius?.topRight ?? 0}`}
                        min="0"
                        max="150"
                        value={current.player?.borderRadius?.topRight ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                player: {
                                    ...prev.player,
                                    borderRadius: {
                                        ...prev.player.borderRadius,
                                        topRight: e,
                                    }
                                },
                            }))
                        }
                    />
                </Row>

                <span>Снизу</span>
                <Row align="center" gap="0.5rem">
                    <SeekbarComponent
                        title={`Слева ${current.player?.borderRadius?.bottomLeft ?? 0}`}
                        min="0"
                        max="150"
                        value={current.player?.borderRadius?.bottomLeft ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                player: {
                                    ...prev.player,
                                    borderRadius: {
                                        ...prev.player.borderRadius,
                                        bottomLeft: e,
                                    }
                                },
                            }))
                        }
                    />

                    <SeekbarComponent
                        title={`Справа: ${current.player?.borderRadius?.bottomRight ?? 0}`}
                        min="0"
                        max="150"
                        value={current.player?.borderRadius?.bottomRight ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                player: {
                                    ...prev.player,
                                    borderRadius: {
                                        ...prev.player.borderRadius,
                                        bottomRight: e,
                                    }
                                },
                            }))
                        }
                    />
                </Row>
            </Accordion>

            <Accordion title="Плеер - Текст">
                <RadioGroupComponent
                    title="Выравнивание текста"
                    options={[
                        { value: 'left', label: 'Слева' },
                        { value: 'center', label: 'По центру' },
                        { value: 'right', label: 'Справа' },
                    ]}
                    value={current.player?.text?.textAlign ?? 'left'}
                    onChange={value =>
                        handleChange(prev => ({
                            ...prev,
                            player: {
                                ...prev.player,
                                text: {
                                    ...prev.player.text,
                                    textAlign: value,
                                },
                            },
                        }))
                    }
                />
                <Row align="center" gap="0.5rem">
                    <ColorSelectorComponent
                        title="Цвет текста (Исп):"
                        valueOpacity={1.0}
                        valueColor={current.player?.text?.artist?.color ?? "#ffffff"}
                        onChange={ values =>
                            handleChange(prev => ({
                                ...prev,
                                player: {
                                    ...prev.player,
                                    text: {
                                        ...prev.player.text,
                                        artist: {
                                            ...prev.player.text.artist,
                                            color: values.color,
                                        },
                                    },
                                },
                            }))
                        }
                    />
                    <NumericEditorComponent
                        title={"Размер текста (Исп):"}
                        value={current.player?.text?.artist?.fontSize ?? 16}
                        max={24}
                        min={9}
                        onChange={ value => {
                            handleChange(prev => ({
                                ...prev,
                                player: {
                                    ...prev.player,
                                    text: {
                                        ...prev.player.text,
                                        artist: {
                                            ...prev.player.text.artist,
                                            fontSize: value,
                                        },
                                    },
                                },
                            }));
                        } }
                    />
                </Row>
                <Row align="center" gap="0.5rem">
                    <ColorSelectorComponent
                        title="Цвет текста (Трек):"
                        valueOpacity={1.0}
                        valueColor={current.player?.text?.title?.color ?? "#ffffff"}
                        onChange={ values =>
                            handleChange(prev => ({
                                ...prev,
                                player: {
                                    ...prev.player,
                                    text: {
                                        ...prev.player.text,
                                        title: {
                                            ...prev.player.text.title,
                                            color: values.color,
                                        },
                                    },
                                },
                            }))
                        }
                    />
                    <NumericEditorComponent
                        title={"Размер текста (Исп):"}
                        value={current.player?.text?.title?.fontSize ?? 16}
                        max={24}
                        min={9}
                        onChange={ value => {
                            handleChange(prev => ({
                                ...prev,
                                player: {
                                    ...prev.player,
                                    text: {
                                        ...prev.player.text,
                                        title: {
                                            ...prev.player.text.title,
                                            fontSize: value,
                                        },
                                    },
                                },
                            }));
                        } }
                    />
                </Row>
            </Accordion>
        </SettingsBlock>
    );
}