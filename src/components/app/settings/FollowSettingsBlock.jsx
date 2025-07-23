import React, { useState, useCallback } from 'react';
import SeekbarComponent from '../../utils/SeekbarComponent';
import { Row } from '../SettingsComponent';
import { Spacer } from '../../utils/Separator';
import { TemplateEditor } from '../../utils/TemplateEditor';
import {
    CollapsedPreview,
    RemoveButton,
    SettingsBlockFull,
    SettingsBlockTitle,
    TitleRow,
    Triangle,
} from './SettingBloks';
import ColorSelectorButton from './ColorSelectorButton';
import PaddingEditorComponent from '../../utils/PaddingEditorComponent';
import RadioGroup from '../../utils/TextRadioGroup';
import { FiTrash2 } from 'react-icons/fi';
import BackgroundImageEditorComponent from "../../utils/BackgroundImageEditorComponent";

const BACKGROUND_OPTIONS = [
    { key: 'color', text: 'цвет' },
    { key: 'image', text: 'картинки' },
    { key: 'gradient', text: 'градиент' },
];

export default function FollowSettingsBlock({
                                                current,
                                                onChange,
                                                index,
                                                openColorPopup,
                                                onRemove,
                                                disableRemove = false,
                                            }) {
    const [isOpen, setIsOpen] = useState(false);
    const message = current.followMessage?.[index] ?? {};

    const updateMessage = useCallback(
        (updater) => {
            onChange((prev) => {
                const draft = prev.followMessage?.[index] ?? {};
                const next =
                    typeof updater === 'function' ? updater(draft) : { ...draft, ...updater };
                const arr = [...(prev.followMessage || [])];
                arr[index] = next;
                return { ...prev, followMessage: arr };
            });
        },
        [onChange, index],
    );

    const updateField = (key, value) => updateMessage((m) => ({ ...m, [key]: value }));
    const updateNested = (key, part) =>
        updateMessage((m) => ({ ...m, [key]: { ...m[key], ...part } }));

    const {
        template = '🎉 {userName} just followed!',
        fontSize = 16,
        messageFont = { family: 'Roboto' },
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

    return (
        <SettingsBlockFull>
            <SettingsBlockTitle as="div">
                <TitleRow onClick={toggleOpen}>
                    <span>Follow вариант #{index + 1}</span>
                    <Triangle>{isOpen ? '▲' : '▼'}</Triangle>
                </TitleRow>
            </SettingsBlockTitle>

            {/* Свернутый вариант */}
            {!isOpen && (
                <CollapsedPreview onClick={toggleOpen}>{template}</CollapsedPreview>
            )}

            {isOpen && (
                <>
                    <Row align="flex-start" gap="0.5rem">
                        <TemplateEditor
                            hint="Доступные плейсхолдеры: {userName}"
                            label="Шаблон для новых фолловеров"
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
                    </Row>

                    <Row>
                        <RadioGroup
                            defaultSelected={backgroundMode}
                            items={BACKGROUND_OPTIONS}
                            direction="horizontal"
                            itemWidth="120px"
                            onChange={(v) => updateField('backgroundMode', v)}
                        />
                        <Spacer/>
                        <SeekbarComponent
                            title={`Радиус скругления (${borderRadius}):`}
                            min="0"
                            max="20"
                            step="1"
                            width="150px"
                            value={borderRadius}
                            onChange={(v) => updateField('borderRadius', v)}
                        />
                    </Row>

                    {backgroundMode === 'color' && (
                        <Row>
                            <ColorSelectorButton
                                title="Цвет фона:"
                                hex={backgroundColor}
                                alpha={backgroundOpacity}
                                openColorPopup={openColorPopup}
                                onColorChange={({ color, alpha }) =>
                                    updateMessage({ backgroundColor: color, backgroundOpacity: alpha })
                                }
                            />
                            <ColorSelectorButton
                                title="Цвет обводки:"
                                hex={borderColor}
                                alpha={borderOpacity}
                                openColorPopup={openColorPopup}
                                onColorChange={({ color, alpha }) =>
                                    updateMessage({ borderColor: color, borderOpacity: alpha })
                                }
                            />
                        </Row>
                    )}

                    {backgroundMode === 'image' &&
                        <BackgroundImageEditorComponent
                            message={message}
                            onImageChanged={(image) => {
                                updateNested('backgroundImages', image);
                            }}
                        />
                    }
                    {backgroundMode === 'gradient' && <div style={{ height: 120 }} />}

                    <Row>
                        <ColorSelectorButton
                            title="Цвет тени:"
                            hex={shadowColor}
                            alpha={shadowOpacity}
                            openColorPopup={openColorPopup}
                            onColorChange={({ color, alpha }) =>
                                updateMessage({ shadowColor: color, shadowOpacity: alpha })
                            }
                        />
                        <Spacer/>
                        <SeekbarComponent
                            title={`Радиус тени (${shadowRadius}):`}
                            min="0"
                            max="20"
                            step="1"
                            width="150px"
                            value={shadowRadius}
                            onChange={(v) => updateField('shadowRadius', v)}
                        />
                    </Row>

                    <PaddingEditorComponent
                        message={message}
                        onHorizontalMarginChange={(v) => updateField('marginH', v)}
                        onVerticalMarginChange={(v) => updateField('marginV', v)}
                        onHorizontalPaddingChange={(v) => updateField('paddingH', v)}
                        onVerticalPaddingChange={(v) => updateField('paddingV', v)}
                    />

                    <Row>
                        <Spacer />
                        <RemoveButton
                            onClick={() => onRemove?.(index)}
                            disabled={disableRemove}
                            title={
                                disableRemove ? 'Нельзя удалить последний элемент' : 'Удалить'
                            }
                        >
                            <FiTrash2 size={24} />
                        </RemoveButton>
                    </Row>
                </>
            )}
        </SettingsBlockFull>
    );
}
