import React from 'react';
import styled from 'styled-components';
import {Accordion} from "../../utils/AccordionComponent";
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import ColorSelectorComponent from "../../utils/ColorSelectorComponent";
import SeekbarComponent from "../../utils/SeekbarComponent";
import RadioGroupComponent from "../../utils/RadioGroupComponent";
import {Row} from "../SettingsComponent";
import ConfirmableInputField from "../../utils/ConfirmableInputField";
import {SettingsBlockFull, SettingsBlockTitle} from "./SettingBloks";

export default function OverlaySettingsComponent({ current, onChange }) {

    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme)
    }

    return(
        <SettingsBlockFull>
            <SettingsBlockTitle>Оверлей</SettingsBlockTitle>
            <Accordion title={"положение чата"}>
                <Row align="center" gap="0.5rem">
                    <SeekbarComponent
                        title={"Отступ слева:"}
                        min="0"
                        max="250"
                        value={current.overlay?.paddingLeft ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                overlay: {
                                    ...prev.overlay,
                                    paddingLeft: e,
                                },
                            }))
                        }
                    />
                    <SeekbarComponent
                        title={"Отступ сверху:"}
                        min="0"
                        max="250"
                        value={current.overlay?.paddingTop ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                overlay: {
                                    ...prev.overlay,
                                    paddingTop: e,
                                },
                            }))
                        }
                    />

                    <SeekbarComponent
                        title={"ширина:"}
                        min="100"
                        max="700"
                        value={current.overlay?.chatWidth ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                overlay: {
                                    ...prev.overlay,
                                    chatWidth: e,
                                },
                            }))
                        }
                    />
                    <SeekbarComponent
                        title={"Высота:"}
                        min="100"
                        max="1000"
                        value={current.overlay?.chatHeight ?? 100}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                overlay: {
                                    ...prev.overlay,
                                    chatHeight: e,
                                },
                            }))
                        }
                    />
                    <SeekbarComponent
                        title={"скругление:"}
                        min="0"
                        max="64"
                        value={current.overlay?.borderRadius ?? 0}
                        step="1"
                        onChange={e =>
                            handleChange(prev => ({
                                ...prev,
                                overlay: {
                                    ...prev.overlay,
                                    borderRadius: e,
                                },
                            }))
                        }
                    />
                </Row>
            </Accordion>
            <Accordion title={"Фон"}>
                <RadioGroupComponent
                    title={"Тип фона:"}
                    options={[
                        { value: "color", label: "Цвет" },
                        { value: "image", label: "Изображение" },
                        { value: "none", label: "Нет/прозрачный" }
                    ]}
                    selected={current.overlay?.backgroundType ?? "none"}
                    onChange={value =>
                        handleChange(prev => ({
                            ...prev,
                            overlay: {
                                ...prev.overlay,
                                backgroundType: value,
                                backgroundColor: value === "color" ? prev.overlay.backgroundColor : null,
                                backgroundImage: value === "image" ? prev.overlay.backgroundImage : null,
                            },
                        }))
                    }
                />
                {/*в зависимости от current.overlay?.backgroundType показываем
                color - селектор цвета ColorSelectorComponent
                image - поле для ссылки на изображение
                none - ничего не показываем
                динамически меняем состояние в зависимости от выбора пользователя
                */}

                {current.overlay?.backgroundType === "color" && (
                    <ColorSelectorComponent
                        title={"Цвет фона:"}
                        value={current.overlay?.backgroundColor ?? "#000000"}
                        onChange={value =>
                            handleChange(prev => ({
                                ...prev,
                                overlay: {
                                    ...prev.overlay,
                                    backgroundColor: value,
                                },
                            }))
                        }
                    />
                )}
                {current.overlay?.backgroundType === "image" && (
                    <>
                        <ConfirmableInputField
                            onConfirm={value => {
                                return new Promise((resolve) => {
                                    const img = new Image();
                                    img.src = value;
                                    img.onload = () => {
                                        const aspectRatio = img.width / img.height;

                                        handleChange(prev => ({
                                            ...prev,
                                            overlay: {
                                                ...prev.overlay,
                                                containerWidth: img.width,
                                                backgroundImage: value,
                                                backgroundImageAspectRatio: aspectRatio,
                                                backgroundImageWidth: img.width,
                                                backgroundImageHeight: img.height
                                            },
                                        }));

                                        resolve(true);
                                    };
                                    img.onerror = () => {
                                        console.error("Failed to load image");
                                        resolve(false);
                                    };
                                });
                            }}
                            initialValue={current.overlay?.backgroundImage ?? ""}
                            onSuccess={value => console.log("Image URL confirmed:", value)}
                            onError={error => console.error("Error confirming image URL:", error)}
                            placeholder="Введите ссылку на изображение"
                        />
                        <Row>
                            {/*задает ширину компонента*/}
                            <SeekbarComponent
                                title={`Ширина фона (${current.overlay.containerWidth}):`}
                                min="100"
                                max="2000"
                                value={current.overlay?.containerWidth ?? 500}
                                step="1"
                                onChange={e =>
                                    handleChange(prev => ({
                                        ...prev,
                                        overlay: {
                                            ...prev.overlay,
                                            containerWidth: e,
                                        },
                                    }))
                                }
                            />
                            {/*задает ширину компонента*/}
                            <SeekbarComponent
                                title={`Прозрачность фона (${current.overlay?.backgroundOpacity ?? 1}):`}
                                min="0"
                                max="1"
                                value={current.overlay?.backgroundOpacity ?? 1}
                                step="0.01"
                                onChange={e =>
                                    handleChange(prev => ({
                                        ...prev,
                                        overlay: {
                                            ...prev.overlay,
                                            backgroundOpacity: e,
                                        },
                                    }))
                                }
                            />
                        </Row>

                    </>
                )}

            </Accordion>
        </SettingsBlockFull>

        )

}