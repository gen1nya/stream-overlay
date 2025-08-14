import React, {useState, useCallback} from 'react';
import styled from 'styled-components';
import SeekbarComponent from '../../utils/SeekbarComponent';
import {TemplateEditor} from '../../utils/TemplateEditor';
import ColorSelectorButton from './ColorSelectorButton';
import RadioGroup from '../../utils/TextRadioGroup';
import BackgroundColorEditorComponent from '../../utils/BackgroundColorEditorComponent';
import PaddingEditorComponent from '../../utils/PaddingEditorComponent';
import BackgroundImageEditorComponent from "../../utils/BackgroundImageEditorComponent";
import GradientEditor from "../../utils/GradientEditor";
import {FiAward, FiType, FiImage, FiLayout, FiTrash2, FiChevronDown, FiChevronUp} from 'react-icons/fi';
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
import {Row} from "../SettingsComponent";
import {Spacer} from "../../utils/Separator";

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

const BACKGROUND_MODE_ITEMS = [
    {key: 'color', text: 'цвет'},
    {key: 'image', text: 'картинки'},
    {key: 'gradient', text: 'градиент'},
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
                        : {...prev.redeemMessage[index], ...updater};

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
        updateRedeemMessage((msg) => ({...msg, [key]: val}));
    const updateNested = (key, part) =>
        updateRedeemMessage((msg) => ({
            ...msg,
            [key]: {...msg[key], ...part},
        }));
    const updateNestedArray = (key, index, part) =>
        updateRedeemMessage(msg => {
            const list = Array.isArray(msg[key]) ? msg[key] : [];
            const updated = [...list];
            updated[index] = {...(list[index] || {}), ...part};
            return {
                ...msg,
                [key]: updated,
            };
        });

    const {
        template = '🎉 {userName} потратил {cost} баллов на {title}',
        fontSize = 16,
        messageFont = {family: 'Roboto'},
        backgroundMode = 'color',
        borderRadius = 0,
        shadowColor = '#3e837c',
        shadowOpacity = 1,
        shadowRadius = 0,
    } = message;

    const toggleOpen = () => setIsOpen((prev) => !prev);

    return (
        <SettingsCard>
            <CollapsibleHeader onClick={toggleOpen}>
                <CardTitle>
                    <FiAward />
                    Трата баллов вариант #{index + 1}
                </CardTitle>
                <CollapseToggle>
                    {isOpen ? 'Свернуть' : 'Развернуть'}
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
                                    Шаблон сообщения
                                </SectionTitle>
                            </SectionHeader>

                            <TemplateEditor
                                hint="Доступные плейсхолдеры: {userName}, {cost}, {title}"
                                label="Шаблон для баллов канала"
                                value={template}
                                onChange={(val) => updateField('template', val)}
                                fontSize={`${fontSize}px`}
                                onFontSizeChange={(v) => updateField('fontSize', v)}
                                currentFontFamily={messageFont.family}
                                onFontSelected={({family, files}) =>
                                    updateNested('messageFont', {
                                        family,
                                        url: files.regular || Object.values(files)[0],
                                    })
                                }
                                placeholders={['userName', 'cost', 'title']}
                            />

                            <Row gap="20px">
                                <ControlGroup>
                                    <ColorSelectorButton
                                        title="Цвет текста:"
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
                                        title="Цвет тени текста:"
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
                                        title={`Радиус тени`}
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
                                    Настройки фона
                                </SectionTitle>
                            </SectionHeader>

                            <Row gap="20px">
                                <ControlGroup>
                                    <RadioGroup
                                        title="Тип фона:"
                                        defaultSelected={backgroundMode}
                                        items={BACKGROUND_MODE_ITEMS}
                                        direction="horizontal"
                                        itemWidth="120px"
                                        onChange={(v) => updateField('backgroundMode', v)}
                                    />
                                </ControlGroup>

                                <Spacer />

                                <ControlGroup flex="1 1 200px">
                                    <SeekbarComponent
                                        title={`Скругление углов`}
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
                                    updateRedeemMessage({
                                        backgroundColor: color,
                                        backgroundOpacity: alpha,
                                    })
                                }
                                onBorderColorChange={({color, alpha}) =>
                                    updateRedeemMessage({borderColor: color, borderOpacity: alpha})
                                }
                                openColorPopup={openColorPopup}
                                onShadowColorChange={updateRedeemMessage}
                                onShadowRadiusChange={updateField}
                            />
                        </Section>

                        {/* Секция отступов */}
                        <Section>
                            <SectionHeader>
                                <SectionTitle>
                                    <FiLayout />
                                    Отступы и позиционирование
                                </SectionTitle>
                            </SectionHeader>

                            <PaddingEditorComponent
                                message={message}
                                onVerticalPaddingChange={(v) => updateField('paddingV', v)}
                                onHorizontalPaddingChange={(v) => updateField('paddingH', v)}
                                onVerticalMarginChange={(v) => updateField('marginV', v)}
                                onHorizontalMarginChange={(v) => updateField('marginH', v)}
                            />
                        </Section>
                    </CardContent>

                    {/* Секция удаления */}
                    <DeleteSection>
                        <DeleteButton
                            onClick={() => onRemove?.(index)}
                            disabled={disableRemove}
                            title={disableRemove ? 'Нельзя удалить последний элемент' : 'Удалить вариант'}
                        >
                            <FiTrash2 />
                            Удалить вариант
                        </DeleteButton>
                    </DeleteSection>
                </>
            )}
        </SettingsCard>
    );
}