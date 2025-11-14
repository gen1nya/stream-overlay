import React, {useState, useCallback} from 'react';
import styled from 'styled-components';
import SeekbarComponent from '../../utils/SeekbarComponent';
import {TemplateEditor} from '../../utils/TemplateEditor';
import ColorSelectorButton from './ColorSelectorButton';
import PaddingEditorComponent from '../../utils/PaddingEditorComponent';
import RadioGroup from '../../utils/TextRadioGroup';
import BackgroundImageEditorComponent from "../../utils/BackgroundImageEditorComponent";
import GradientEditor from "../../utils/GradientEditor";
import BackgroundColorEditorComponent from "../../utils/BackgroundColorEditorComponent";
import {FiHeart, FiType, FiImage, FiLayout, FiTrash2, FiChevronDown, FiChevronUp} from 'react-icons/fi';
import {
    CardContent,
    CardHeader,
    CardTitle,
    ControlGroup,
    Section,
    SectionHeader,
    SectionTitle,
    SettingsCard,
    ActionButton
} from "./SharedSettingsStyles";
import {Spacer} from "../../utils/Separator";
import {Row} from "../SettingsComponent";
import { useTranslation } from "react-i18next";

// Специфичные стили для этого компонента
const CollapsibleHeader = styled(CardHeader)`
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
        background: linear-gradient(135deg, #333 0%, #3a3a3a 100%);
    }
`;

const CollapseToggle = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: #999;
    font-size: 0.9rem;
    transition: color 0.2s ease;
    
    svg {
        width: 18px;
        height: 18px;
        transition: transform 0.2s ease;
    }
    
    ${CollapsibleHeader}:hover & {
        color: #ccc;
    }
`;

const CollapsedPreview = styled.div`
    padding: 16px 24px;
    color: #999;
    font-style: italic;
    border-bottom: 1px solid #333;
    cursor: pointer;
    transition: all 0.2s ease;
    background: rgba(30, 30, 30, 0.3);
    
    &:hover {
        background: rgba(30, 30, 30, 0.5);
        color: #ccc;
    }
`;

const DeleteSection = styled.div`
    padding: 16px 24px;
    border-top: 1px solid #333;
    background: rgba(220, 38, 38, 0.05);
    display: flex;
    justify-content: flex-end;
`;

const DeleteButton = styled(ActionButton)`
    background: #dc2626;
    border-color: #dc2626;
    
    &:hover:not(:disabled) {
        background: #b91c1c;
        border-color: #b91c1c;
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
    const [isOpen, setIsOpen] = useState(false);
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
        backgroundColor = '#3e837c',
        backgroundOpacity = 1,
        borderColor = '#3e837c',
        borderOpacity = 1,
        borderRadius = 0,
        shadowColor = '#3e837c',
        shadowOpacity = 1,
        shadowRadius = 0,
    } = message;

    const toggleOpen = () => setIsOpen((prev) => !prev);

    const backgroundOptions = BACKGROUND_OPTIONS.map((option) => ({
        key: option.key,
        text: t(option.labelKey),
    }));

    return (
        <SettingsCard>
            <CollapsibleHeader onClick={toggleOpen}>
                <CardTitle>
                    <FiHeart />
                    {t('settings.follow.title', { index: index + 1 })}
                </CardTitle>
                <CollapseToggle>
                    {isOpen ? t('settings.follow.collapse') : t('settings.follow.expand')}
                    {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                </CollapseToggle>
            </CollapsibleHeader>

            {/* Свернутый вариант */}
            {!isOpen && (
                <CollapsedPreview onClick={toggleOpen}>
                    {template}
                </CollapsedPreview>
            )}

            {isOpen && (
                <>
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
                </>
            )}
        </SettingsCard>
    );
}