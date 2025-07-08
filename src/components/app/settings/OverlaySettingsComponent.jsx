import React from 'react';
import SeekbarComponent from "../../utils/SeekbarComponent";
import RadioGroupComponent from "../../utils/RadioGroupComponent";
import {Row} from "../SettingsComponent";
import ConfirmableInputField from "../../utils/ConfirmableInputField";
import {SettingsBlockFull, SettingsBlockTitle} from "./SettingBloks";
import {Spacer} from "../../utils/Separator";
import ColorSelectorButton from "./ColorSelectorButton";

export default function OverlaySettingsComponent({ current, onChange, openColorPopup }) {

    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme)
    }

    const isBackgroundImage = current.overlay?.backgroundType === 'image'
    const hasImageSizes = isBackgroundImage &&
        current.overlay?.backgroundImage &&
        current.overlay?.backgroundImageWidth &&
        current.overlay?.backgroundImageHeight

    const widthMax = hasImageSizes ? current.overlay.backgroundImageWidth : 1000
    const heightMax = hasImageSizes ? current.overlay.backgroundImageHeight : 1000

    return(
        <SettingsBlockFull>
            <SettingsBlockTitle>Оверлей</SettingsBlockTitle>
                <Row>
                    <SeekbarComponent
                        title={`ширина (${current.overlay?.chatWidth ?? "auto"}):`}
                        min="100"
                        max={widthMax}
                        value={current.overlay?.chatWidth ?? 0}
                        step="1"
                        width={"150px"}
                        disabled={!isBackgroundImage}
                        tooltip="доступно только для фона-изображения"
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
                        title={`Высота (${current.overlay?.chatHeight ?? "auto"}):`}
                        min="100"
                        max={heightMax}
                        value={current.overlay?.chatHeight ?? 100}
                        step="1"
                        width={"150px"}
                        disabled={!isBackgroundImage}
                        tooltip="доступно только для фона-изображения"
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
                    <Spacer/>
                    <SeekbarComponent
                        title={`скругление (${current.overlay?.borderRadius ?? 0}):`}
                        min="0"
                        max="64"
                        width={"320px"}
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
                <Row align="center" gap="0.5em">
                    <SeekbarComponent
                        title={`Отступ слева (${current.overlay?.paddingLeft ?? 0}):`}
                        min="0"
                        max={widthMax}
                        value={current.overlay?.paddingLeft ?? 0}
                        step="1"
                        width={"150px"}
                        disabled={!isBackgroundImage}
                        tooltip="доступно только для фона-изображения"
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
                        title={`Отступ сверху (${current.overlay?.paddingTop ?? 0}):`}
                        min="0"
                        max={heightMax}
                        width={"150px"}
                        value={current.overlay?.paddingTop ?? 0}
                        step="1"
                        disabled={!isBackgroundImage}
                        tooltip="доступно только для фона-изображения"
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
                </Row>
            <RadioGroupComponent
                width={"317px"}
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

            {current.overlay?.backgroundType === "color" && (
                <ColorSelectorButton
                    title={"Цвет текста:"}
                    hex={current.overlay?.backgroundColor ?? "#000000"}
                    alpha={1}
                    onClick={() => {
                        openColorPopup({
                            initialColor: current.overlay?.backgroundColor ?? "#ffffff",
                            initialAlpha: 1,
                            title: 'Цвет фона',
                            onChange: (e) => {
                                handleChange(prev => ({
                                    ...prev,
                                    overlay: {
                                        ...prev.overlay,
                                        backgroundColor: e.color,
                                    },
                                }));
                            }
                        })
                    }
                    }/>
            )}
            {current.overlay?.backgroundType === "image" && (
                <>
                    <ConfirmableInputField
                        onConfirm={(data) => {
                            return new Promise((resolve) => {
                                const img = new Image();
                                const imageUrl = data.value;
                                console.log("Loading image from URL:", imageUrl);
                                img.src = imageUrl
                                img.onload = () => {
                                    const aspectRatio = img.width / img.height;
                                    console.log("Image loaded:", img.width, img.height, aspectRatio);
                                    handleChange(prev => ({
                                        ...prev,
                                        overlay: {
                                            ...prev.overlay,
                                            containerWidth: img.width,
                                            backgroundImage: imageUrl,
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
                        onSuccess={value => {
                            console.log("Image confirmed:", value);
                        }}
                        onError={error => {
                            console.error("Error confirming image:", error);
                        }}
                        initialValue={current.overlay?.backgroundImage ?? ""}
                        placeholder="Введите ссылку на изображение или жмяк папку справа -->"
                    />
                    <Row>
                        {/*задает ширину компонента*/}
                        <SeekbarComponent
                            title={`Ширина фона (${current.overlay.containerWidth}):`}
                            min="100"
                            max="2000"
                            value={current.overlay?.containerWidth ?? 500}
                            step="1"
                            width={"200px"}
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
                            width={"200px"}
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
        </SettingsBlockFull>

        )

}