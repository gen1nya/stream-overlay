import React, {useMemo} from 'react';
import styled from 'styled-components';
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import SeekbarComponent from "../../utils/SeekbarComponent";
import ConfirmableInputField from "../../utils/ConfirmableInputField";
import ColorSelectorButton from "./ColorSelectorButton";
import {mergeWithDefaults} from "../../utils/defaultBotConfig";
import {FiSettings, FiMessageSquare, FiEye, FiImage, FiType, FiClock} from "react-icons/fi";
import {TbShadow} from "react-icons/tb";
import RadioGroup from "../../utils/TextRadioGroup";
import {
    CardContent,
    CardHeader, CardSubtitle,
    CardTitle, ControlGroup, InfoBadge,
    Section,
    SectionHeader,
    SectionTitle,
    SettingsCard
} from "./SharedSettingsStyles";
import {Row} from "../SettingsComponent";

// Объединенный компонент настроек
export default function UnifiedSettingsComponent({current, onChange, openColorPopup}) {
    const handleChange = updaterOrTheme => {
        onChange(updaterOrTheme);
    };

    const cfg = useMemo(() => mergeWithDefaults(current), [current]);
    const { overlay, allMessages } = cfg;

    const isBackgroundImage = overlay?.backgroundType === 'image';
    const hasImageSizes = isBackgroundImage &&
        overlay?.backgroundImage &&
        overlay?.backgroundImageWidth &&
        overlay?.backgroundImageHeight;

    const widthMax = hasImageSizes ? overlay.backgroundImageWidth : 1000;
    const heightMax = hasImageSizes ? overlay.backgroundImageHeight : 1000;

    const getOverlaySizes = () => {
        if (isBackgroundImage && overlay?.containerWidth && overlay?.backgroundImageAspectRatio) {
            const height = (overlay.containerWidth * overlay.backgroundImageAspectRatio).toFixed(0);
            return `${overlay.containerWidth}×${height}`;
        }
        return null;
    };

    return (
        <>
            {/* Настройки оверлея */}
            <SettingsCard>
                <CardHeader>
                    <CardTitle>
                        <FiSettings />
                        Оверлей
                    </CardTitle>
                    {getOverlaySizes() && (
                        <InfoBadge>OBS: {getOverlaySizes()}</InfoBadge>
                    )}
                </CardHeader>

                <CardContent>
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiEye />
                                Размеры и позиция
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <SeekbarComponent
                                    title={`Ширина ${overlay?.chatWidth ? "" : "[auto]"}`}
                                    min="100"
                                    max={widthMax}
                                    value={overlay?.chatWidth ?? 0}
                                    step="1"
                                    width="180px"
                                    disabled={!isBackgroundImage}
                                    tooltip="Доступно только для фона-изображения"
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
                            </ControlGroup>

                            <ControlGroup>
                                <SeekbarComponent
                                    title={`Высота ${overlay?.chatHeight ? "" : "[auto]"}`}
                                    min="100"
                                    max={heightMax}
                                    value={overlay?.chatHeight ?? 100}
                                    step="1"
                                    width="180px"
                                    disabled={!isBackgroundImage}
                                    tooltip="Доступно только для фона-изображения"
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
                            </ControlGroup>

                            <ControlGroup flex="1 1 300px">
                                <SeekbarComponent
                                    title={`Скругление углов`}
                                    min="0"
                                    max="64"
                                    width="320px"
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
                            </ControlGroup>
                        </Row>

                        <Row gap="20px">
                            <ControlGroup>
                                <SeekbarComponent
                                    title={`Отступ слева`}
                                    min="0"
                                    max={widthMax}
                                    value={overlay?.paddingLeft ?? 0}
                                    step="1"
                                    width="180px"
                                    tooltip="Доступно только для фона-изображения"
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
                            </ControlGroup>

                            <ControlGroup>
                                <SeekbarComponent
                                    title={`Отступ сверху`}
                                    min="0"
                                    max={heightMax}
                                    width="180px"
                                    value={overlay?.paddingTop ?? 0}
                                    step="1"
                                    tooltip="Доступно только для фона-изображения"
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
                            </ControlGroup>
                        </Row>
                    </Section>

                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiImage />
                                Фон
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <RadioGroup
                                    defaultSelected={overlay?.backgroundType ?? "none"}
                                    items={[
                                        {key: 'color', text: 'Цвет'},
                                        {key: 'image', text: 'Картинка'},
                                        {key: 'none', text: 'Нет'},
                                    ]}
                                    direction="horizontal"
                                    itemWidth="120px"
                                    title="Тип фона:"
                                    onChange={(v) =>
                                        handleChange(prev => ({
                                            ...prev,
                                            overlay: {
                                                ...prev.overlay,
                                                backgroundType: v,
                                                backgroundColor: prev.overlay.backgroundColor,
                                                backgroundImage: prev.overlay.backgroundImage,
                                            },
                                        }))
                                    }
                                />
                            </ControlGroup>

                            {overlay?.backgroundType === "color" && (
                                <ControlGroup>
                                    <ColorSelectorButton
                                        title="Цвет фона:"
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
                                </ControlGroup>
                            )}
                        </Row>

                        {overlay?.backgroundType === "image" && (
                            <>
                                <ConfirmableInputField
                                    onConfirm={(data) => {
                                        return new Promise((resolve) => {
                                            const img = new Image();
                                            const imageUrl = data.value;
                                            img.src = imageUrl;
                                            img.onload = () => {
                                                const aspectRatio = img.width / img.height;
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
                                            img.onerror = () => resolve(false);
                                        });
                                    }}
                                    onClear={() => {
                                        handleChange(prev => ({
                                            ...prev,
                                            overlay: {
                                                ...prev.overlay,
                                                backgroundImage: undefined,
                                            },
                                        }));
                                    }}
                                    onSuccess={value => console.log("Image confirmed:", value)}
                                    onError={error => console.error("Error confirming image:", error)}
                                    initialValue={overlay?.backgroundImage ?? ""}
                                    placeholder="Введите ссылку на изображение..."
                                />

                                <Row gap="20px">
                                    <ControlGroup>
                                        <SeekbarComponent
                                            title={`Ширина фона`}
                                            min="100"
                                            max="2000"
                                            value={overlay?.containerWidth ?? 500}
                                            step="1"
                                            width="200px"
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
                                    </ControlGroup>

                                    <ControlGroup>
                                        <SeekbarComponent
                                            title={`Прозрачность`}
                                            min="0"
                                            max="1"
                                            value={overlay?.backgroundOpacity ?? 1}
                                            step="0.01"
                                            width="200px"
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
                                    </ControlGroup>
                                </Row>
                            </>
                        )}
                    </Section>
                </CardContent>
            </SettingsCard>

            {/* Настройки сообщений */}
            <SettingsCard>
                <CardHeader>
                    <CardTitle>
                        <FiMessageSquare />
                        Общие настройки сообщений
                    </CardTitle>
                    <CardSubtitle>
                        Применяется ко всем типам сообщений, если не указано иное
                    </CardSubtitle>
                </CardHeader>

                <CardContent>
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiClock />
                                Поведение и отображение
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <NumericEditorComponent
                                    title="Время жизни (сек):"
                                    value={allMessages?.lifetime ?? 10}
                                    max={60}
                                    min={-1}
                                    width="150px"
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
                            </ControlGroup>

                            <ControlGroup>
                                <NumericEditorComponent
                                    title="Макс. сообщений:"
                                    value={allMessages?.maxCount ?? 30}
                                    max={30}
                                    min={1}
                                    width="150px"
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
                            </ControlGroup>

                            <ControlGroup flex="1 1 300px">
                                <SeekbarComponent
                                    title={`Размытие фона`}
                                    min="0"
                                    max="20"
                                    value={allMessages?.blurRadius ?? 0}
                                    step="1"
                                    width="300px"
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
                            </ControlGroup>
                        </Row>
                    </Section>

                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiType />
                                Внешний вид текста
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <ColorSelectorButton
                                    title="Цвет текста:"
                                    hex={allMessages?.textColor ?? "#000000"}
                                    alpha={allMessages?.textOpacity ?? 1}
                                    openColorPopup={openColorPopup}
                                    onColorChange={(e) => {
                                        handleChange(prev => ({
                                            ...prev,
                                            allMessages: {
                                                ...prev.allMessages,
                                                textColor: e.color,
                                                textOpacity: e.alpha,
                                            },
                                        }));
                                    }}
                                />
                            </ControlGroup>
                        </Row>
                    </Section>

                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <TbShadow />
                                Тень текста
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <ColorSelectorButton
                                    title="Цвет тени:"
                                    hex={allMessages?.textShadowColor ?? "#000000"}
                                    alpha={allMessages?.textShadowOpacity ?? 1}
                                    openColorPopup={openColorPopup}
                                    onColorChange={(e) => {
                                        handleChange(prev => ({
                                            ...prev,
                                            allMessages: {
                                                ...prev.allMessages,
                                                textShadowColor: e.color,
                                                textShadowOpacity: e.alpha,
                                            },
                                        }));
                                    }}
                                />
                            </ControlGroup>

                            <ControlGroup>
                                <NumericEditorComponent
                                    title="Смещение X:"
                                    value={allMessages?.textShadowXPosition ?? 0}
                                    max={20}
                                    min={-20}
                                    width="120px"
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
                            </ControlGroup>

                            <ControlGroup>
                                <NumericEditorComponent
                                    title="Смещение Y:"
                                    value={allMessages?.textShadowYPosition ?? 0}
                                    max={20}
                                    min={-20}
                                    width="120px"
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
                            </ControlGroup>

                            <ControlGroup flex="1 1 300px">
                                <SeekbarComponent
                                    title={`Радиус тени`}
                                    min="0"
                                    max="20"
                                    value={allMessages?.textShadowRadius ?? 5}
                                    step="1"
                                    width="300px"
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
                            </ControlGroup>
                        </Row>
                    </Section>
                </CardContent>
            </SettingsCard>
        </>
    );
}