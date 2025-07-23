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
import RadioGroup from '../../utils/TextRadioGroup';
import BackgroundColorEditorComponent from '../../utils/BackgroundColorEditorComponent';
import { FiTrash2 } from 'react-icons/fi';
import PaddingEditorComponent from '../../utils/PaddingEditorComponent';
import BackgroundImageEditorComponent from "../../utils/BackgroundImageEditorComponent";

const BACKGROUND_MODE_ITEMS = [
    { key: 'color', text: 'цвет' },
    { key: 'image', text: 'картинки' },
    { key: 'gradient', text: 'градиент' },
];

export default function RedeemPointsBlock({
                                              current,
                                              onChange,
                                              index,
                                              openColorPopup,
                                              onRemove,
                                              disableRemove = false,
                                          }) {
    const [isOpen, setIsOpen] = useState(false);
    const message = current.redeemMessage?.[index] ?? {};

    const updateRedeemMessage = useCallback(
        (updater) =>
            onChange((prev) => {
                const updatedMsg =
                    typeof updater === 'function'
                        ? updater(prev.redeemMessage[index])
                        : { ...prev.redeemMessage[index], ...updater };

                const updatedArray = [...prev.redeemMessage];
                updatedArray[index] = updatedMsg;

                return {
                    ...prev,
                    redeemMessage: updatedArray,
                };
            }),
        [index, onChange],
    );

    const updateField = (key, val) =>
        updateRedeemMessage((msg) => ({ ...msg, [key]: val }));
    const updateNested = (key, part) =>
        updateRedeemMessage((msg) => ({
            ...msg,
            [key]: { ...msg[key], ...part },
        }));

    const {
        template = '🎉 {userName} потратил {cost} баллов на {title}',
        fontSize = 16,
        messageFont = { family: 'Roboto' },
        backgroundMode = 'color',
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
                    <span>Трата баллов вариант #{index + 1}</span>
                    <Triangle>{isOpen ? '▲' : '▼'}</Triangle>
                </TitleRow>
            </SettingsBlockTitle>

            {!isOpen && <CollapsedPreview onClick={toggleOpen}>{template}</CollapsedPreview>}

            {isOpen && (
                <>
                    <Row align="flex-start" gap="0.5rem">
                        <TemplateEditor
                            hint="Доступные плейсхолдеры: {userName}, {cost}, {title}"
                            label="Шаблон для баллов канала"
                            value={template}
                            onChange={(val) => updateField('template', val)}
                            fontSize={`${fontSize}px`}
                            onFontSizeChange={(v) => updateField('fontSize', v)}
                            currentFontFamily={messageFont.family}
                            onFontSelected={({ family, files }) =>
                                updateNested('messageFont', {
                                    family,
                                    url: files.regular || Object.values(files)[0],
                                })
                            }
                            placeholders={['userName', 'cost', 'title']}
                        />
                    </Row>

                    <Row>
                        <RadioGroup
                            defaultSelected={backgroundMode}
                            items={BACKGROUND_MODE_ITEMS}
                            direction="horizontal"
                            itemWidth="120px"
                            onChange={(v) => updateField('backgroundMode', v)}
                        />
                        <Spacer />
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
                        <BackgroundColorEditorComponent
                            message={message}
                            onBackgroundColorChange={({ color, alpha }) =>
                                updateRedeemMessage({
                                    backgroundColor: color,
                                    backgroundOpacity: alpha,
                                })
                            }
                            onBorderColorChange={({ color, alpha }) =>
                                updateRedeemMessage({ borderColor: color, borderOpacity: alpha })
                            }
                            openColorPopup={openColorPopup}
                        />
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

                    {/* Тень */}
                    <Row>
                        <ColorSelectorButton
                            title="Цвет тени:"
                            hex={shadowColor}
                            alpha={shadowOpacity}
                            openColorPopup={openColorPopup}
                            onColorChange={({ color, alpha }) =>
                                updateRedeemMessage({ shadowColor: color, shadowOpacity: alpha })
                            }
                        />
                        <Spacer />
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
                        onVerticalPaddingChange={(v) => updateField('paddingV', v)}
                        onHorizontalPaddingChange={(v) => updateField('paddingH', v)}
                        onVerticalMarginChange={(v) => updateField('marginV', v)}
                        onHorizontalMarginChange={(v) => updateField('marginH', v)}
                    />

                    <Row>
                        <Spacer />
                        <RemoveButton
                            onClick={() => onRemove?.(index)}
                            disabled={disableRemove}
                            title={disableRemove ? 'Нельзя удалить последний элемент' : 'Удалить'}
                        >
                            <FiTrash2 size={24} />
                        </RemoveButton>
                    </Row>
                </>
            )}
        </SettingsBlockFull>
    );
}