import React, {useCallback, useMemo} from 'react';
import SeekbarComponent from '../../utils/SeekbarComponent';
import ColorSelectorButton from './ColorSelectorButton';
import FontAndSizeEditor from '../../utils/FontAndSizeEditor';
import RadioGroup from '../../utils/TextRadioGroup';
import BackgroundColorEditorComponent from '../../utils/BackgroundColorEditorComponent';
import PaddingEditorComponent from '../../utils/PaddingEditorComponent';
import BackgroundImageEditorComponent from "../../utils/BackgroundImageEditorComponent";
import GradientEditor from "../../utils/GradientEditor";
import {FiMessageSquare, FiType, FiImage, FiLayout, FiAlignCenter} from "react-icons/fi";
import {
    CardContent,
    CardHeader,
    CardTitle, ControlGroup,
    Section,
    SectionHeader,
    SectionTitle,
    SettingsCard
} from "./SharedSettingsStyles";
import {Spacer} from "../../utils/Separator";
import {Row} from "../SettingsComponent";
import Switch from "../../utils/Switch";
import { useTranslation } from "react-i18next";

const MESSAGE_DIRECTION_OPT = [
    {key: 'row', labelKey: 'settings.chatMessages.header.namePosition.options.row', aiIcon: 'AiOutlineInsertRowLeft'},
    {key: 'column', labelKey: 'settings.chatMessages.header.namePosition.options.column', aiIcon: 'AiOutlineInsertRowAbove'},
];

export default function MessageSettingsBlock({current: {chatMessage}, onChange, openColorPopup}) {
    const { t } = useTranslation();
    const updateChatMessage = useCallback(
        (updater) =>
            onChange((prev) => ({
                ...prev,
                chatMessage:
                    typeof updater === 'function'
                        ? updater(prev.chatMessage)
                        : {...prev.chatMessage, ...updater},
            })),
        [onChange],
    );

    const updateField = (key, val) =>
        updateChatMessage((msg) => ({...msg, [key]: val}));
    const updateNested = (key, part) =>
        updateChatMessage((msg) => ({
            ...msg,
            [key]: {...msg[key], ...part},
        }));
    const updateNestedArray = (key, index, part) =>
        updateChatMessage(msg => {
            const list = Array.isArray(msg[key]) ? msg[key] : [];
            const updated = [...list];
            updated[index] = {...(list[index] || {}), ...part};
            return {
                ...msg,
                [key]: updated,
            };
        });

    const {
        direction = 'row',
        fontSize,
        messageFont,
        titleFontSize,
        titleFont,
        backgroundMode = 'color',
        borderRadius = 0,
        shadowColor = '#000000',
        shadowOpacity = 1,
        shadowRadius = 0,
    } = chatMessage;
    const messageDirectionOptions = useMemo(
        () =>
            MESSAGE_DIRECTION_OPT.map((item) => ({
                key: item.key,
                aiIcon: item.aiIcon,
                text: t(item.labelKey),
            })),
        [t],
    );
    const backgroundOptions = useMemo(
        () => [
            {key: 'color', text: t('settings.chatMessages.background.options.color')},
            {key: 'image', text: t('settings.chatMessages.background.options.image')},
            {key: 'gradient', text: t('settings.chatMessages.background.options.gradient')},
        ],
        [t],
    );

    return (
        <SettingsCard>
            <CardHeader>
                <CardTitle>
                    <FiMessageSquare />
                    {t('settings.chatMessages.title')}
                </CardTitle>
            </CardHeader>

            <CardContent>
                {/* Секция текста */}
                <Section>
                    <SectionHeader>
                        <SectionTitle>
                            <FiType />
                            {t('settings.chatMessages.header.title')}
                        </SectionTitle>
                    </SectionHeader>

                    <Row gap="20px">
                        <ControlGroup>
                            <RadioGroup
                                title={t('settings.chatMessages.header.namePosition.label')}
                                defaultSelected={direction}
                                itemWidth="120px"
                                items={messageDirectionOptions}
                                onChange={(v) => updateField('direction', v)}
                            />
                        </ControlGroup>

                        <Spacer/>

                        <ControlGroup>
                            <label
                                style={{fontSize: '0.9rem', fontWeight: '500', color: '#e0e0e0', marginBottom: '8px'}}>
                                {t('settings.chatMessages.header.backgroundToggle.label')}
                            </label>
                            <div style={{display: 'flex', gap: '8px'}}>
                                <Switch
                                    checked={chatMessage.titleBackgroundMode === 'solid'}
                                    onChange={(e) => {
                                        updateField('titleBackgroundMode', e.target.checked ? 'solid' : 'none')
                                    }}
                                />
                                <span style={{fontSize: '0.85rem', color: '#999'}}>
                                    {chatMessage.titleBackgroundMode === 'solid'
                                        ? t('settings.chatMessages.header.backgroundToggle.enabled')
                                        : t('settings.chatMessages.header.backgroundToggle.disabled')}
                                </span>
                            </div>
                        </ControlGroup>

                        <Spacer/>

                        <ControlGroup>
                            <FontAndSizeEditor
                                title={t('settings.chatMessages.header.font')}
                                fontSize={titleFontSize}
                                fontFamily={titleFont.family}
                                onFontChange={({family, url}) =>
                                    updateNested('titleFont', {family, url})
                                }
                                onFontSizeChange={(v) => updateField('titleFontSize', v)}
                            />
                        </ControlGroup>
                    </Row>
                </Section>

                <Section>
                    <SectionHeader>
                        <SectionTitle>
                            <FiAlignCenter  />
                            {t('settings.chatMessages.body.title')}
                        </SectionTitle>
                    </SectionHeader>

                    <Row gap="20px">
                        <ControlGroup>
                            <ColorSelectorButton
                                title={t('settings.chatMessages.body.textColor')}
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
                            <FontAndSizeEditor
                                title={t('settings.chatMessages.body.font')}
                                fontSize={fontSize}
                                fontFamily={messageFont.family}
                                onFontChange={({family, url}) =>
                                    updateNested('messageFont', {family, url})
                                }
                                onFontSizeChange={(v) => updateField('fontSize', v)}
                            />
                        </ControlGroup>
                    </Row>

                    <Row gap="20px">

                        <ControlGroup>
                            <ColorSelectorButton
                                title={t('settings.chatMessages.body.shadowColor')}
                                hex={messageFont?.shadowColor ?? "#000000"}
                                alpha={messageFont?.shadowOpacity ?? 0}
                                openColorPopup={openColorPopup}
                                onColorChange={({color, alpha}) => {
                                    updateNested('messageFont', {shadowColor: color, shadowOpacity: alpha})
                                }}
                            />
                        </ControlGroup>
                        <Spacer />
                        <ControlGroup >
                            <SeekbarComponent
                                title={t('settings.chatMessages.body.shadowRadius')}
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
                            {t('settings.chatMessages.background.title')}
                        </SectionTitle>
                    </SectionHeader>

                    <Row gap="20px">
                        <ControlGroup>
                            <RadioGroup
                                title={t('settings.chatMessages.background.type')}
                                defaultSelected={backgroundMode}
                                items={backgroundOptions}
                                direction="horizontal"
                                itemWidth="120px"
                                onChange={(v) => updateField('backgroundMode', v)}
                            />
                        </ControlGroup>

                        <Spacer />

                        <ControlGroup>
                            <SeekbarComponent
                                title={t('settings.chatMessages.background.radius')}
                                min="0"
                                max="20"
                                step="1"
                                width="260px"
                                value={borderRadius}
                                onChange={(v) => updateField('borderRadius', v)}
                            />
                        </ControlGroup>
                    </Row>

                    {/* Условный рендеринг в зависимости от типа фона */}
                    {backgroundMode === 'image' && (
                        <BackgroundImageEditorComponent
                            message={chatMessage}
                            onImageChanged={(image) => {
                                console.log('image changed', image);
                                updateNested('backgroundImages', image);
                            }}
                        />
                    )}

                    {backgroundMode === 'gradient' && (
                        <GradientEditor
                            value={chatMessage.backgroundGradients?.[0] || {}}
                            onChange={(g) => {
                                updateNestedArray('backgroundGradients', 0, g);
                            }}
                        />
                    )}

                    <BackgroundColorEditorComponent
                        message={chatMessage}
                        onBackgroundColorChange={({color, alpha}) =>
                            updateChatMessage({
                                backgroundColor: color,
                                backgroundOpacity: alpha,
                            })
                        }
                        onBorderColorChange={({color, alpha}) =>
                            updateChatMessage({borderColor: color, borderOpacity: alpha})
                        }
                        openColorPopup={openColorPopup}
                        onShadowColorChange={updateChatMessage}
                        onShadowRadiusChange={updateField}
                    />
                </Section>

                {/* Секция отступов и margins */}
                <Section>
                    <SectionHeader>
                        <SectionTitle>
                            <FiLayout />
                            {t('settings.chatMessages.layout.title')}
                        </SectionTitle>
                    </SectionHeader>

                    <PaddingEditorComponent
                        message={chatMessage}
                        onVerticalPaddingChange={(v) => updateField('paddingV', v)}
                        onHorizontalPaddingChange={(v) => updateField('paddingH', v)}
                        onVerticalMarginChange={(v) => updateField('marginV', v)}
                        onHorizontalMarginChange={(v) => updateField('marginH', v)}
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
        </SettingsCard>
    );
}