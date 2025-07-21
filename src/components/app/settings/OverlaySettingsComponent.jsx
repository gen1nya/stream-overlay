import React, {useMemo} from 'react';
import SeekbarComponent from "../../utils/SeekbarComponent";
import RadioGroupComponent from "../../utils/RadioGroupComponent";
import {Row} from "../SettingsComponent";
import ConfirmableInputField from "../../utils/ConfirmableInputField";
import {SettingsBlockFull, SettingsBlockTitle} from "./SettingBloks";
import {Spacer} from "../../utils/Separator";
import ColorSelectorButton from "./ColorSelectorButton";
import {mergeWithDefaults} from "../../utils/defaultBotConfig";

export default function OverlaySettingsComponent({current, onChange, openColorPopup}) {

    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme)
    }

    const cfg = useMemo(() => mergeWithDefaults(current), [current]);
    const { overlay } = cfg;

    const isBackgroundImage = overlay?.backgroundType === 'image'
    const hasImageSizes = isBackgroundImage &&
        overlay?.backgroundImage &&
        overlay?.backgroundImageWidth &&
        overlay?.backgroundImageHeight

    const widthMax = hasImageSizes ? overlay.backgroundImageWidth : 1000
    const heightMax = hasImageSizes ? overlay.backgroundImageHeight : 1000
    const overlaySizes = () => {
        if (isBackgroundImage && overlay?.containerWidth && overlay?.backgroundImageAspectRatio) {
            return " (Размеры для OBS: " + overlay.containerWidth + "x" + (overlay.containerWidth * overlay.backgroundImageAspectRatio.toFixed(0)) + ")"
        } else {
            return ""
        }
    }

    return (
        <SettingsBlockFull>
            <SettingsBlockTitle>Оверлей{overlaySizes()}</SettingsBlockTitle>
            <Row>
                <SeekbarComponent
                    title={`ширина (${overlay?.chatWidth ?? "auto"}):`}
                    min="100"
                    max={widthMax}
                    value={overlay?.chatWidth ?? 0}
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
                    title={`Высота (${overlay?.chatHeight ?? "auto"}):`}
                    min="100"
                    max={heightMax}
                    value={overlay?.chatHeight ?? 100}
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
                    title={`скругление (${overlay?.borderRadius ?? 0}):`}
                    min="0"
                    max="64"
                    width={"320px"}
                    value={overlay?.borderRadius ?? 0}
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
                    title={`Отступ слева (${overlay?.paddingLeft ?? 0}):`}
                    min="0"
                    max={widthMax}
                    value={overlay?.paddingLeft ?? 0}
                    step="1"
                    width={"150px"}
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
                    title={`Отступ сверху (${overlay?.paddingTop ?? 0}):`}
                    min="0"
                    max={heightMax}
                    width={"150px"}
                    value={overlay?.paddingTop ?? 0}
                    step="1"
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
                    {value: "color", label: "Цвет"},
                    {value: "image", label: "Изображение"},
                    {value: "none", label: "Нет/прозрачный"}
                ]}
                selected={overlay?.backgroundType ?? "none"}
                onChange={value =>
                    handleChange(prev => ({
                        ...prev,
                        overlay: {
                            ...prev.overlay,
                            backgroundType: value,
                            backgroundColor: prev.overlay.backgroundColor,
                            backgroundImage: prev.overlay.backgroundImage,
                        },
                    }))
                }
            />

            {overlay?.backgroundType === "color" && (
                <ColorSelectorButton
                    title={"Цвет текста:"}
                    hex={overlay?.backgroundColor ?? "#000000"}
                    alpha={1}
                    openColorPopup={openColorPopup}
                    onColorChange={(e) => {
                        handleChange(prev => ({
                            ...prev,
                            overlay: {
                                ...prev.overlay,
                                backgroundColor: e.color,
                            },
                        }));
                    }}
                />
            )}
            {overlay?.backgroundType === "image" && (
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
                        initialValue={overlay?.backgroundImage ?? ""}
                        placeholder="Введите ссылку на изображение или жмяк папку справа -->"
                    />
                    <Row>
                        {/*задает ширину компонента*/}
                        <SeekbarComponent
                            title={`Ширина фона (${overlay.containerWidth}):`}
                            min="100"
                            max="2000"
                            value={overlay?.containerWidth ?? 500}
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
                            title={`Прозрачность фона (${overlay?.backgroundOpacity ?? 1}):`}
                            min="0"
                            max="1"
                            value={overlay?.backgroundOpacity ?? 1}
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