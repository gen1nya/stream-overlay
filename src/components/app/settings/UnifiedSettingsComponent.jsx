import React, {useMemo, useCallback} from 'react';
import styled, {ThemeProvider} from 'styled-components';
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import SeekbarComponent from "../../utils/SeekbarComponent";
import {ImageUploadField, darkTheme as imageUploadDarkTheme} from "../../utils/BackgroundImageEditorComponent";
import ColorSelectorButton from "./ColorSelectorButton";
import {mergeWithDefaults} from "../../utils/defaultBotConfig";
import {FiSettings, FiMessageSquare, FiEye, FiImage, FiType, FiClock} from "react-icons/fi";
import {TbShadow} from "react-icons/tb";
import RadioGroup from "../../utils/TextRadioGroup";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();
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

    const handleBackgroundImageChange = useCallback((imageUrl) => {
        if (!imageUrl) return;

        const img = new Image();
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
        };
    }, [handleChange]);

    const handleBackgroundImageClear = useCallback(() => {
        handleChange(prev => ({
            ...prev,
            overlay: {
                ...prev.overlay,
                backgroundImage: undefined,
            },
        }));
    }, [handleChange]);

    const widthTitle = overlay?.chatWidth
        ? t('settings.unified.overlay.sections.dimensions.width')
        : t('settings.unified.overlay.sections.dimensions.widthAuto');

    const heightTitle = overlay?.chatHeight
        ? t('settings.unified.overlay.sections.dimensions.height')
        : t('settings.unified.overlay.sections.dimensions.heightAuto');

    const backgroundOnlyTooltip = t('settings.unified.overlay.sections.dimensions.backgroundOnlyTooltip');

    return (
        <>
            {/* Настройки оверлея */}
            <SettingsCard>
                <CardHeader>
                    <CardTitle>
                        <FiSettings />
                        {t('settings.unified.overlay.title')}
                    </CardTitle>
                    {getOverlaySizes() && (
                        <InfoBadge>{t('settings.unified.overlay.obsSize', { size: getOverlaySizes() })}</InfoBadge>
                    )}
                </CardHeader>

                <CardContent>
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiEye />
                                {t('settings.unified.overlay.sections.dimensions.title')}
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <SeekbarComponent
                                    title={widthTitle}
                                    min="100"
                                    max={widthMax}
                                    value={overlay?.chatWidth ?? 0}
                                    step="1"
                                    width="180px"
                                    disabled={!isBackgroundImage}
                                    tooltip={backgroundOnlyTooltip}
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
                                    title={heightTitle}
                                    min="100"
                                    max={heightMax}
                                    value={overlay?.chatHeight ?? 100}
                                    step="1"
                                    width="180px"
                                    disabled={!isBackgroundImage}
                                    tooltip={backgroundOnlyTooltip}
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
                                    title={t('settings.unified.overlay.sections.dimensions.borderRadius')}
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
                                    title={t('settings.unified.overlay.sections.dimensions.paddingLeft')}
                                    min="0"
                                    max={widthMax}
                                    value={overlay?.paddingLeft ?? 0}
                                    step="1"
                                    width="180px"
                                    tooltip={backgroundOnlyTooltip}
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
                                    title={t('settings.unified.overlay.sections.dimensions.paddingTop')}
                                    min="0"
                                    max={heightMax}
                                    width="180px"
                                    value={overlay?.paddingTop ?? 0}
                                    step="1"
                                    tooltip={backgroundOnlyTooltip}
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
                                {t('settings.unified.overlay.sections.background.title')}
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <RadioGroup
                                    defaultSelected={overlay?.backgroundType ?? "none"}
                                    items={[
                                        {key: 'color', text: t('settings.unified.overlay.sections.background.types.color')},
                                        {key: 'image', text: t('settings.unified.overlay.sections.background.types.image')},
                                        {key: 'none', text: t('settings.unified.overlay.sections.background.types.none')},
                                    ]}
                                    direction="horizontal"
                                    itemWidth="120px"
                                    title={t('settings.unified.overlay.sections.background.typeLabel')}
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
                                        title={t('settings.unified.overlay.sections.background.colorLabel')}
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
                                <ThemeProvider theme={imageUploadDarkTheme}>
                                    <ImageUploadField
                                        label={t('settings.unified.overlay.sections.background.imageLabel')}
                                        value={overlay?.backgroundImage}
                                        onChange={handleBackgroundImageChange}
                                        onClear={handleBackgroundImageClear}
                                        showPreview={true}
                                    />
                                </ThemeProvider>

                                <Row gap="20px">
                                    <ControlGroup>
                                        <SeekbarComponent
                                            title={t('settings.unified.overlay.sections.background.imageWidth')}
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
                                            title={t('settings.unified.overlay.sections.background.imageOpacity')}
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
                        {t('settings.unified.messages.title')}
                    </CardTitle>
                    <CardSubtitle>
                        {t('settings.unified.messages.subtitle')}
                    </CardSubtitle>
                </CardHeader>

                <CardContent>
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiClock />
                                {t('settings.unified.messages.sections.behavior.title')}
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <NumericEditorComponent
                                    title={t('settings.unified.messages.sections.behavior.lifetime')}
                                    value={allMessages?.lifetime ?? 10}
                                    max={600}
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
                                    title={t('settings.unified.messages.sections.behavior.maxCount')}
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
                                    title={t('settings.unified.messages.sections.behavior.blurRadius')}
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
                                {t('settings.unified.messages.sections.text.title')}
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <ColorSelectorButton
                                    title={t('settings.unified.messages.sections.text.color')}
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
                                {t('settings.unified.messages.sections.shadow.title')}
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <ColorSelectorButton
                                    title={t('settings.unified.messages.sections.shadow.color')}
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
                                    title={t('settings.unified.messages.sections.shadow.offsetX')}
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
                                    title={t('settings.unified.messages.sections.shadow.offsetY')}
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
                                    title={t('settings.unified.messages.sections.shadow.radius')}
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