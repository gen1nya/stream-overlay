import React, {useCallback} from 'react';
import styled from 'styled-components';
import { tokens } from "../../../designSystem/tokens";
import SeekbarComponent from '../../utils/SeekbarComponent';
import {TemplateEditor} from '../../utils/TemplateEditor';
import ColorSelectorButton from './ColorSelectorButton';
import PaddingEditorComponent from '../../utils/PaddingEditorComponent';
import RadioGroup from '../../utils/TextRadioGroup';
import BackgroundImageEditorComponent from "../../utils/BackgroundImageEditorComponent";
import GradientEditor from "../../utils/GradientEditor";
import BackgroundColorEditorComponent from "../../utils/BackgroundColorEditorComponent";
import {FiHeart, FiType, FiImage, FiLayout, FiTrash2} from 'react-icons/fi';
import {
    CardContent,
    CollapsibleCard,
    ControlGroup,
    Section,
    SectionHeader,
    SectionTitle,
    ActionButton
} from "./SharedSettingsStyles";
import {Spacer} from "../../utils/Separator";
import {Row} from "../SettingsComponent";
import { useTranslation } from "react-i18next";

// Специфичные стили для этого компонента
const DeleteSection = styled.div`
    padding: 16px 24px;
    border-top: 1px solid ${tokens.color.border.subtle};
    background: rgba(220, 38, 38, 0.05);
    display: flex;
    justify-content: flex-end;
`;

const DeleteButton = styled(ActionButton)`
    background: ${tokens.color.danger.base};
    border-color: ${tokens.color.danger.base};
    
    &:hover:not(:disabled) {
        background: ${tokens.color.danger.hover};
        border-color: ${tokens.color.danger.hover};
    }
    
    &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        transform: none;
    }
`;

const BACKGROUND_OPTIONS = [
    {key: 'color', labelKey: 'settings.follow.background.options.color'},
    {key: 'image', labelKey: 'settings.follow.background.options.image'},
    {key: 'gradient', labelKey: 'settings.follow.background.options.gradient'},
];

export default function FollowSettingsBlock({
                                                current,
                                                onChange,
                                                index,
                                                openColorPopup,
                                                onRemove,
                                                disableRemove = false,
                                            }) {
    const { t } = useTranslation();
    const message = current.followMessage?.[index] ?? {};

    const updateMessage = useCallback(
        (updater) => {
            onChange((prev) => {
                const draft = prev.followMessage?.[index] ?? {};
                const next =
                    typeof updater === 'function' ? updater(draft) : {...draft, ...updater};
                const arr = [...(prev.followMessage || [])];
                arr[index] = next;
                return {...prev, followMessage: arr};
            });
        },
        [onChange, index],
    );

    const updateField = (key, value) => updateMessage((m) => ({...m, [key]: value}));
    const updateNested = (key, part) =>
        updateMessage((m) => ({...m, [key]: {...m[key], ...part}}));
    const updateNestedArray = (key, index, part) =>
        updateMessage(msg => {
            const list = Array.isArray(msg[key]) ? msg[key] : [];
            const updated = [...list];
            updated[index] = {...(list[index] || {}), ...part};
            return {
                ...msg,
                [key]: updated,
            };
        });

    const {
        template = '🎉 {userName} just followed!',
        fontSize = 16,
        messageFont = {family: 'Roboto'},
        backgroundMode = 'color',
        borderRadius = 0,
    } = message;

    const backgroundOptions = BACKGROUND_OPTIONS.map((option) => ({
        key: option.key,
        text: t(option.labelKey),
    }));

    return (
        <CollapsibleCard
            icon={<FiHeart />}
            title={t('settings.follow.title', { index: index + 1 })}
            preview={template}
        >
            <CardContent>
                        {/* Секция шаблона */}
                        <Section>
                            <SectionHeader>
                                <SectionTitle>
                                    <FiType />
                                    {t('settings.follow.template.title')}
                                </SectionTitle>
                            </SectionHeader>

                            <TemplateEditor
                                hint={t('settings.follow.template.hint')}
                                label={t('settings.follow.template.label')}
                                value={template}
                                onChange={(v) => updateField('template', v)}
                                fontSize={`${fontSize}px`}
                                onFontSizeChange={(v) => updateField('fontSize', v)}
                                currentFontFamily={messageFont.family}
                                onFontSelected={(font) =>
                                    updateNested('messageFont', {
                                        family: font.family,
                                        url: font.files.regular || Object.values(font.files)[0],
                                    })
                                }
                                placeholders={["userName"]}
                            />

                            <Row gap="20px">
                                <ControlGroup>
                                    <ColorSelectorButton
                                        title={t('settings.follow.template.textColor')}
                                        hex={messageFont.color || '#ffffff'}
                                        alpha={messageFont.opacity || 1}
                                        openColorPopup={openColorPopup}
                                        onColorChange={({color, alpha}) =>
                                            updateNested('messageFont', {color, opacity: alpha})
                                        }
                                    />
                                </ControlGroup>

                                <Spacer />

                                <ControlGroup>
                                    <ColorSelectorButton
                                        title={t('settings.follow.template.shadowColor')}
                                        hex={messageFont?.shadowColor ?? "#000000"}
                                        alpha={messageFont?.shadowOpacity ?? 0}
                                        openColorPopup={openColorPopup}
                                        onColorChange={({color, alpha}) => {
                                            updateNested('messageFont', {shadowColor: color, shadowOpacity: alpha})
                                        }}
                                    />
                                </ControlGroup>

                                <ControlGroup flex="1 1 200px">
                                    <SeekbarComponent
                                        title={t('settings.follow.template.shadowRadius')}
                                        min="0"
                                        max="20"
                                        step="1"
                                        width="200px"
                                        value={messageFont?.shadowRadius ?? 0}
                                        onChange={(v) => {
                                            updateNested("messageFont", {shadowRadius: v})
                                        }}
                                    />
                                </ControlGroup>
                            </Row>
                        </Section>

                        {/* Секция фона */}
                        <Section>
                            <SectionHeader>
                                <SectionTitle>
                                    <FiImage />
                                    {t('settings.follow.background.title')}
                                </SectionTitle>
                            </SectionHeader>

                            <Row gap="20px">
                                <ControlGroup>
                                    <RadioGroup
                                        title={t('settings.follow.background.type')}
                                        defaultSelected={backgroundMode}
                                        items={backgroundOptions}
                                        direction="horizontal"
                                        itemWidth="120px"
                                        onChange={(v) => updateField('backgroundMode', v)}
                                    />
                                </ControlGroup>

                                <Spacer />

                                <ControlGroup flex="1 1 200px">
                                    <SeekbarComponent
                                        title={t('settings.follow.background.radius')}
                                        min="0"
                                        max="20"
                                        step="1"
                                        width="200px"
                                        value={borderRadius}
                                        onChange={(v) => updateField('borderRadius', v)}
                                    />
                                </ControlGroup>
                            </Row>

                            {backgroundMode === 'image' && (
                                <BackgroundImageEditorComponent
                                    message={message}
                                    onImageChanged={(image) => {
                                        updateNested('backgroundImages', image);
                                    }}
                                />
                            )}

                            {backgroundMode === 'gradient' && (
                                <GradientEditor
                                    value={message.backgroundGradients?.[0] || {}}
                                    onChange={(g) => {
                                        updateNestedArray('backgroundGradients', 0, g);
                                    }}
                                />
                            )}

                            <BackgroundColorEditorComponent
                                message={message}
                                onBackgroundColorChange={({color, alpha}) =>
                                    updateMessage({
                                        backgroundColor: color,
                                        backgroundOpacity: alpha,
                                    })
                                }
                                onBorderColorChange={({color, alpha}) =>
                                    updateMessage({borderColor: color, borderOpacity: alpha})
                                }
                                openColorPopup={openColorPopup}
                                onShadowColorChange={updateMessage}
                                onShadowRadiusChange={updateField}
                            />
                        </Section>

                        {/* Секция отступов */}
                        <Section>
                            <SectionHeader>
                                <SectionTitle>
                                    <FiLayout />
                                    {t('settings.follow.layout.title')}
                                </SectionTitle>
                            </SectionHeader>

                            <PaddingEditorComponent
                                message={message}
                                onHorizontalMarginChange={(v) => updateField('marginH', v)}
                                onVerticalMarginChange={(v) => updateField('marginV', v)}
                                onHorizontalPaddingChange={(v) => updateField('paddingH', v)}
                                onVerticalPaddingChange={(v) => updateField('paddingV', v)}
                                onPaddingModeChange={(v) => updateField('paddingMode', v)}
                                onPaddingTopChange={(v) => updateField('paddingTop', v)}
                                onPaddingRightChange={(v) => updateField('paddingRight', v)}
                                onPaddingBottomChange={(v) => updateField('paddingBottom', v)}
                                onPaddingLeftChange={(v) => updateField('paddingLeft', v)}
                                onColorBgPaddingModeChange={(v) => updateField('colorBgPaddingMode', v)}
                                onColorBgPaddingHChange={(v) => updateField('colorBgPaddingH', v)}
                                onColorBgPaddingVChange={(v) => updateField('colorBgPaddingV', v)}
                                onColorBgPaddingTopChange={(v) => updateField('colorBgPaddingTop', v)}
                                onColorBgPaddingRightChange={(v) => updateField('colorBgPaddingRight', v)}
                                onColorBgPaddingBottomChange={(v) => updateField('colorBgPaddingBottom', v)}
                                onColorBgPaddingLeftChange={(v) => updateField('colorBgPaddingLeft', v)}
                                onGradientPaddingModeChange={(v) => updateField('gradientPaddingMode', v)}
                                onGradientPaddingHChange={(v) => updateField('gradientPaddingH', v)}
                                onGradientPaddingVChange={(v) => updateField('gradientPaddingV', v)}
                                onGradientPaddingTopChange={(v) => updateField('gradientPaddingTop', v)}
                                onGradientPaddingRightChange={(v) => updateField('gradientPaddingRight', v)}
                                onGradientPaddingBottomChange={(v) => updateField('gradientPaddingBottom', v)}
                                onGradientPaddingLeftChange={(v) => updateField('gradientPaddingLeft', v)}
                                onImagePaddingModeChange={(v) => updateField('imagePaddingMode', v)}
                                onImagePaddingHChange={(v) => updateField('imagePaddingH', v)}
                                onImagePaddingVChange={(v) => updateField('imagePaddingV', v)}
                                onImagePaddingTopChange={(v) => updateField('imagePaddingTop', v)}
                                onImagePaddingRightChange={(v) => updateField('imagePaddingRight', v)}
                                onImagePaddingBottomChange={(v) => updateField('imagePaddingBottom', v)}
                                onImagePaddingLeftChange={(v) => updateField('imagePaddingLeft', v)}
                            />
                        </Section>
            </CardContent>

            {/* Секция удаления */}
            <DeleteSection>
                <DeleteButton
                    onClick={() => onRemove?.(index)}
                    disabled={disableRemove}
                    title={disableRemove ? t('settings.follow.delete.disabledTooltip') : t('settings.follow.delete.tooltip')}
                >
                    <FiTrash2 />
                    {t('settings.follow.delete.action')}
                </DeleteButton>
            </DeleteSection>
        </CollapsibleCard>
    );
}