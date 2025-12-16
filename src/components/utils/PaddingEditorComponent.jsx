import SeekbarComponent from "./SeekbarComponent";
import React, {useMemo} from "react";
import {SmallSubTitle} from "../app/settings/SettingBloks";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import RadioGroup from "./TextRadioGroup";
import {FiDroplet, FiImage} from "react-icons/fi";
import {IoColorFilterOutline} from "react-icons/io5";
import {Spacer} from "./Separator";

// Grid for background layer cards
const LayersGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin-top: 12px;
`;

// Card for each background layer
const LayerCard = styled.div`
    background: rgba(40, 40, 40, 0.3);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
`;


const LayerTitle = styled.h5`
    margin: 0 0 12px 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: #ccc;
    display: flex;
    align-items: center;
    gap: 8px;

    svg {
        color: #9b74ff;
    }
`;

const ControlsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 12px;
`;

const ModeSelector = styled.div`
    margin-bottom: 12px;
`;

export default function PaddingEditorComponent({
    message,
    onVerticalPaddingChange,
    onHorizontalPaddingChange,
    onVerticalMarginChange,
    onHorizontalMarginChange,
    onPaddingModeChange,
    onPaddingTopChange,
    onPaddingRightChange,
    onPaddingBottomChange,
    onPaddingLeftChange,
    // Color background padding props
    onColorBgPaddingModeChange,
    onColorBgPaddingHChange,
    onColorBgPaddingVChange,
    onColorBgPaddingTopChange,
    onColorBgPaddingRightChange,
    onColorBgPaddingBottomChange,
    onColorBgPaddingLeftChange,
    // Gradient padding props
    onGradientPaddingModeChange,
    onGradientPaddingHChange,
    onGradientPaddingVChange,
    onGradientPaddingTopChange,
    onGradientPaddingRightChange,
    onGradientPaddingBottomChange,
    onGradientPaddingLeftChange,
    // Image padding props
    onImagePaddingModeChange,
    onImagePaddingHChange,
    onImagePaddingVChange,
    onImagePaddingTopChange,
    onImagePaddingRightChange,
    onImagePaddingBottomChange,
    onImagePaddingLeftChange,
}) {
    const { t } = useTranslation();
    const paddingMode = message.paddingMode || 'grouped';
    const colorBgPaddingMode = message.colorBgPaddingMode || 'grouped';
    const gradientPaddingMode = message.gradientPaddingMode || 'grouped';
    const imagePaddingMode = message.imagePaddingMode || 'grouped';

    // Memoized mode options
    const modeOptions = useMemo(() => [
        { key: 'grouped', text: t('settings.shared.paddingEditor.modeGrouped') },
        { key: 'individual', text: t('settings.shared.paddingEditor.modeIndividual') },
    ], [t]);

    const handleModeChange = (mode) => {
        if (onPaddingModeChange) {
            onPaddingModeChange(mode);

            // When switching to individual mode, initialize values from grouped if not set
            if (mode === 'individual') {
                const h = message.paddingH ?? 0;
                const v = message.paddingV ?? 0;
                if (onPaddingTopChange && message.paddingTop === undefined) onPaddingTopChange(v);
                if (onPaddingRightChange && message.paddingRight === undefined) onPaddingRightChange(h);
                if (onPaddingBottomChange && message.paddingBottom === undefined) onPaddingBottomChange(v);
                if (onPaddingLeftChange && message.paddingLeft === undefined) onPaddingLeftChange(h);
            }
        }
    };

    const handleColorBgModeChange = (mode) => {
        if (onColorBgPaddingModeChange) {
            onColorBgPaddingModeChange(mode);

            // When switching to individual mode, initialize values from grouped if not set
            if (mode === 'individual') {
                const h = message.colorBgPaddingH ?? 0;
                const v = message.colorBgPaddingV ?? 0;
                if (onColorBgPaddingTopChange && message.colorBgPaddingTop === undefined) onColorBgPaddingTopChange(v);
                if (onColorBgPaddingRightChange && message.colorBgPaddingRight === undefined) onColorBgPaddingRightChange(h);
                if (onColorBgPaddingBottomChange && message.colorBgPaddingBottom === undefined) onColorBgPaddingBottomChange(v);
                if (onColorBgPaddingLeftChange && message.colorBgPaddingLeft === undefined) onColorBgPaddingLeftChange(h);
            }
        }
    };

    const handleGradientModeChange = (mode) => {
        if (onGradientPaddingModeChange) {
            onGradientPaddingModeChange(mode);

            // When switching to individual mode, initialize values from grouped if not set
            if (mode === 'individual') {
                const h = message.gradientPaddingH ?? 0;
                const v = message.gradientPaddingV ?? 0;
                if (onGradientPaddingTopChange && message.gradientPaddingTop === undefined) onGradientPaddingTopChange(v);
                if (onGradientPaddingRightChange && message.gradientPaddingRight === undefined) onGradientPaddingRightChange(h);
                if (onGradientPaddingBottomChange && message.gradientPaddingBottom === undefined) onGradientPaddingBottomChange(v);
                if (onGradientPaddingLeftChange && message.gradientPaddingLeft === undefined) onGradientPaddingLeftChange(h);
            }
        }
    };

    const handleImageModeChange = (mode) => {
        if (onImagePaddingModeChange) {
            onImagePaddingModeChange(mode);

            // When switching to individual mode, initialize values from grouped if not set
            if (mode === 'individual') {
                const h = message.imagePaddingH ?? 0;
                const v = message.imagePaddingV ?? 0;
                if (onImagePaddingTopChange && message.imagePaddingTop === undefined) onImagePaddingTopChange(v);
                if (onImagePaddingRightChange && message.imagePaddingRight === undefined) onImagePaddingRightChange(h);
                if (onImagePaddingBottomChange && message.imagePaddingBottom === undefined) onImagePaddingBottomChange(v);
                if (onImagePaddingLeftChange && message.imagePaddingLeft === undefined) onImagePaddingLeftChange(h);
            }
        }
    };

    // Check if background padding sections should be shown
    const showColorBgSection = onColorBgPaddingModeChange || onColorBgPaddingHChange || onColorBgPaddingVChange;
    const showGradientSection = onGradientPaddingModeChange || onGradientPaddingHChange || onGradientPaddingVChange;
    const showImageSection = onImagePaddingModeChange || onImagePaddingHChange || onImagePaddingVChange;
    const showLayersSection = showColorBgSection || showGradientSection || showImageSection;

    // Render controls for grouped mode (horizontal/vertical)
    const renderGroupedControls = (hValue, vValue, onHChange, onVChange, maxH = 50, maxV = 50) => (
        <ControlsGrid>
            <SeekbarComponent
                title={t('settings.shared.paddingEditor.horizontal')}
                min="0"
                max={maxH}
                width="100%"
                value={hValue}
                step="1"
                onChange={onHChange}
            />
            <SeekbarComponent
                title={t('settings.shared.paddingEditor.vertical')}
                min="0"
                max={maxV}
                width="100%"
                value={vValue}
                step="1"
                onChange={onVChange}
            />
        </ControlsGrid>
    );
    // Render controls for individual mode (top/right/bottom/left)
    const renderIndividualControls = (values, fallbackH, fallbackV, handlers, maxH = 50, maxV = 50) => (
        <ControlsGrid>
            <SeekbarComponent
                title={t('settings.shared.paddingEditor.top')}
                min="0"
                max={maxV}
                width="100%"
                value={values.top ?? fallbackV}
                step="1"
                onChange={handlers.top}
            />
            <SeekbarComponent
                title={t('settings.shared.paddingEditor.right')}
                min="0"
                max={maxH}
                width="100%"
                value={values.right ?? fallbackH}
                step="1"
                onChange={handlers.right}
            />
            <SeekbarComponent
                title={t('settings.shared.paddingEditor.bottom')}
                min="0"
                max={maxV}
                width="100%"
                value={values.bottom ?? fallbackV}
                step="1"
                onChange={handlers.bottom}
            />
            <SeekbarComponent
                title={t('settings.shared.paddingEditor.left')}
                min="0"
                max={maxH}
                width="100%"
                value={values.left ?? fallbackH}
                step="1"
                onChange={handlers.left}
            />
        </ControlsGrid>
    );

    return (
        <>
            {/* Outer margins */}
            <div>
                <SmallSubTitle>{t('settings.shared.paddingEditor.outerTitle')}</SmallSubTitle>
                <LayersGrid>
                    <LayerCard>
                        <ControlsGrid>
                            <SeekbarComponent
                                title={t('settings.shared.paddingEditor.horizontal')}
                                min="0"
                                max="100"
                                width="100%"
                                value={message.marginH ?? 0}
                                step="1"
                                onChange={onHorizontalMarginChange}
                            />
                            <SeekbarComponent
                                title={t('settings.shared.paddingEditor.vertical')}
                                min="0"
                                max="50"
                                width="100%"
                                value={message.marginV ?? 0}
                                step="1"
                                onChange={onVerticalMarginChange}
                            />
                        </ControlsGrid>
                    </LayerCard>
                    <Spacer />
                </LayersGrid>
            </div>

            {/* Background layers section */}
            {showLayersSection && (
                <div>
                    <SmallSubTitle>{t('settings.shared.paddingEditor.layersTitle')}</SmallSubTitle>
                    <LayersGrid>
                        {/* Color background card */}
                        {showColorBgSection && (
                            <LayerCard>
                                <LayerTitle>
                                    <FiDroplet />
                                    {t('settings.shared.paddingEditor.colorBgTitle')}
                                </LayerTitle>

                                {onColorBgPaddingModeChange && (
                                    <ModeSelector>
                                        <RadioGroup
                                            items={modeOptions}
                                            defaultSelected={colorBgPaddingMode}
                                            direction="horizontal"
                                            onChange={handleColorBgModeChange}
                                        />
                                    </ModeSelector>
                                )}

                                {colorBgPaddingMode === 'grouped'
                                    ? renderGroupedControls(
                                        message.colorBgPaddingH ?? 0,
                                        message.colorBgPaddingV ?? 0,
                                        onColorBgPaddingHChange,
                                        onColorBgPaddingVChange
                                    )
                                    : renderIndividualControls(
                                        {
                                            top: message.colorBgPaddingTop,
                                            right: message.colorBgPaddingRight,
                                            bottom: message.colorBgPaddingBottom,
                                            left: message.colorBgPaddingLeft,
                                        },
                                        message.colorBgPaddingH ?? 0,
                                        message.colorBgPaddingV ?? 0,
                                        {
                                            top: onColorBgPaddingTopChange,
                                            right: onColorBgPaddingRightChange,
                                            bottom: onColorBgPaddingBottomChange,
                                            left: onColorBgPaddingLeftChange,
                                        }
                                    )
                                }
                            </LayerCard>
                        )}

                        {/* Gradient card */}
                        {showGradientSection && (
                            <LayerCard>
                                <LayerTitle>
                                    <IoColorFilterOutline />
                                    {t('settings.shared.paddingEditor.gradientTitle')}
                                </LayerTitle>

                                {onGradientPaddingModeChange && (
                                    <ModeSelector>
                                        <RadioGroup
                                            items={modeOptions}
                                            defaultSelected={gradientPaddingMode}
                                            direction="horizontal"
                                            onChange={handleGradientModeChange}
                                        />
                                    </ModeSelector>
                                )}

                                {gradientPaddingMode === 'grouped'
                                    ? renderGroupedControls(
                                        message.gradientPaddingH ?? 0,
                                        message.gradientPaddingV ?? 0,
                                        onGradientPaddingHChange,
                                        onGradientPaddingVChange
                                    )
                                    : renderIndividualControls(
                                        {
                                            top: message.gradientPaddingTop,
                                            right: message.gradientPaddingRight,
                                            bottom: message.gradientPaddingBottom,
                                            left: message.gradientPaddingLeft,
                                        },
                                        message.gradientPaddingH ?? 0,
                                        message.gradientPaddingV ?? 0,
                                        {
                                            top: onGradientPaddingTopChange,
                                            right: onGradientPaddingRightChange,
                                            bottom: onGradientPaddingBottomChange,
                                            left: onGradientPaddingLeftChange,
                                        }
                                    )
                                }
                            </LayerCard>
                        )}

                        {/* Image card */}
                        {showImageSection && (
                            <LayerCard>
                                <LayerTitle>
                                    <FiImage />
                                    {t('settings.shared.paddingEditor.imageTitle')}
                                </LayerTitle>

                                {onImagePaddingModeChange && (
                                    <ModeSelector>
                                        <RadioGroup
                                            items={modeOptions}
                                            defaultSelected={imagePaddingMode}
                                            direction="horizontal"
                                            onChange={handleImageModeChange}
                                        />
                                    </ModeSelector>
                                )}

                                {imagePaddingMode === 'grouped'
                                    ? renderGroupedControls(
                                        message.imagePaddingH ?? 0,
                                        message.imagePaddingV ?? 0,
                                        onImagePaddingHChange,
                                        onImagePaddingVChange
                                    )
                                    : renderIndividualControls(
                                        {
                                            top: message.imagePaddingTop,
                                            right: message.imagePaddingRight,
                                            bottom: message.imagePaddingBottom,
                                            left: message.imagePaddingLeft,
                                        },
                                        message.imagePaddingH ?? 0,
                                        message.imagePaddingV ?? 0,
                                        {
                                            top: onImagePaddingTopChange,
                                            right: onImagePaddingRightChange,
                                            bottom: onImagePaddingBottomChange,
                                            left: onImagePaddingLeftChange,
                                        }
                                    )
                                }
                            </LayerCard>
                        )}
                    </LayersGrid>
                </div>
            )}

            {/* Inner padding */}
            <div>
                <SmallSubTitle>{t('settings.shared.paddingEditor.innerTitle')}</SmallSubTitle>
                <LayersGrid>
                    <LayerCard>
                        {onPaddingModeChange && (
                            <ModeSelector>
                                <RadioGroup
                                    items={modeOptions}
                                    defaultSelected={paddingMode}
                                    direction="horizontal"
                                    onChange={handleModeChange}
                                />
                            </ModeSelector>
                        )}

                        {paddingMode === 'grouped'
                            ? renderGroupedControls(
                                message.paddingH ?? 0,
                                message.paddingV ?? 0,
                                onHorizontalPaddingChange,
                                onVerticalPaddingChange,
                                100,
                                50
                            )
                            : renderIndividualControls(
                                {
                                    top: message.paddingTop,
                                    right: message.paddingRight,
                                    bottom: message.paddingBottom,
                                    left: message.paddingLeft,
                                },
                                message.paddingH ?? 0,
                                message.paddingV ?? 0,
                                {
                                    top: onPaddingTopChange,
                                    right: onPaddingRightChange,
                                    bottom: onPaddingBottomChange,
                                    left: onPaddingLeftChange,
                                },
                                100,
                                50
                            )
                        }
                    </LayerCard>
                    <Spacer />
                </LayersGrid>
            </div>
        </>
    );
}
