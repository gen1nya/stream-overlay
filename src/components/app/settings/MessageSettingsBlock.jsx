import React, { useCallback } from 'react';
import SeekbarComponent from '../../utils/SeekbarComponent';
import RadioGroupComponent from '../../utils/RadioGroupComponent';
import { Row } from '../SettingsComponent';
import {
    SettingsBlockFull,
    SettingsBlockSubTitle,
    SettingsBlockTitle,
} from './SettingBloks';
import ColorSelectorButton from './ColorSelectorButton';
import { Spacer } from '../../utils/Separator';
import FontAndSizeEditor from '../../utils/FontAndSizeEditor';
import RadioGroup from '../../utils/TextRadioGroup';
import BackgroundColorEditorComponent from '../../utils/BackgroundColorEditorComponent';
import PaddingEditorComponent from '../../utils/PaddingEditorComponent';
import BackgroundImageEditorComponent from "../../utils/BackgroundImageEditorComponent";
import GradientEditor from "../../utils/GradientEditor";

const MESSAGE_DIRECTION_OPTIONS = [
    { value: 'row', label: 'слева' },
    { value: 'column', label: 'сверху' },
];

export default function MessageSettingsBlock({ current: { chatMessage }, onChange, openColorPopup }) {
    const updateChatMessage = useCallback(
        (updater) =>
            onChange((prev) => ({
                ...prev,
                chatMessage:
                    typeof updater === 'function'
                        ? updater(prev.chatMessage)
                        : { ...prev.chatMessage, ...updater },
            })),
        [onChange],
    );

    const updateField = (key, val) =>
        updateChatMessage((msg) => ({ ...msg, [key]: val }));
    const updateNested = (key, part) =>
        updateChatMessage((msg) => ({
            ...msg,
            [key]: { ...msg[key], ...part },
        }));
    const updateNestedArray = (key, index, part) =>
        updateChatMessage(msg => {
            const list = Array.isArray(msg[key]) ? msg[key] : [];
            const updated = [...list];
            updated[index] = { ...(list[index] || {}), ...part };
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

    return (
        <SettingsBlockFull>
            <SettingsBlockTitle>Сообщения чатерсов</SettingsBlockTitle>

            <Row>
                <RadioGroupComponent
                    width="150px"
                    title="Заголовок:"
                    options={MESSAGE_DIRECTION_OPTIONS}
                    selected={direction}
                    onChange={(v) => updateField('direction', v)}
                />
                <Spacer />
                <FontAndSizeEditor
                    title="Шрифт сообщений:"
                    fontSize={fontSize}
                    fontFamily={messageFont.family}
                    onFontChange={({ family, url }) =>
                        updateNested('messageFont', { family, url })
                    }
                    onFontSizeChange={(v) => updateField('fontSize', v)}
                />
                <FontAndSizeEditor
                    title="Шрифт заголовка:"
                    fontSize={titleFontSize}
                    fontFamily={titleFont.family}
                    onFontChange={({ family, url }) =>
                        updateNested('titleFont', { family, url })
                    }
                    onFontSizeChange={(v) => updateField('titleFontSize', v)}
                />
            </Row>

            <SettingsBlockSubTitle>Фон</SettingsBlockSubTitle>
            <Row>
                <RadioGroup
                    defaultSelected={backgroundMode}
                    items={[
                        { key: 'color', text: 'цвет' },
                        { key: 'image', text: 'картинки' },
                        { key: 'gradient', text: 'градиент' },
                    ]}
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
                    width="260px"
                    value={borderRadius}
                    onChange={(v) => updateField('borderRadius', v)}
                />
            </Row>

            {backgroundMode === 'color' && (
                <BackgroundColorEditorComponent
                    message={chatMessage}
                    onBackgroundColorChange={({ color, alpha }) =>
                        updateChatMessage({
                            backgroundColor: color,
                            backgroundOpacity: alpha,
                        })
                    }
                    onBorderColorChange={({ color, alpha }) =>
                        updateChatMessage({ borderColor: color, borderOpacity: alpha })
                    }
                    openColorPopup={openColorPopup}
                />
            )}

            {backgroundMode === 'image' &&
                <BackgroundImageEditorComponent
                    message={chatMessage}
                    onImageChanged={(image) => {
                        updateNested('backgroundImages', image);
                    }}
                />
            }
            {backgroundMode === 'gradient' && (
                <GradientEditor
                    value={chatMessage.backgroundGradients?.[0] || {}}
                    onChange={(g) => {
                        updateNestedArray('backgroundGradients', 0, g);
                    }}
                />
            )}

            <Row>
                <ColorSelectorButton
                    title="Цвет тени:"
                    hex={shadowColor}
                    alpha={shadowOpacity}
                    openColorPopup={openColorPopup}
                    onColorChange={({ color, alpha }) =>
                        updateChatMessage({ shadowColor: color, shadowOpacity: alpha })
                    }
                />
                <ColorSelectorButton
                    title="Цвет текста:"
                    hex={messageFont.color || '#ffffff'}
                    alpha={messageFont.opacity || 1}
                    openColorPopup={openColorPopup}
                    onColorChange={({ color, alpha }) =>
                        updateNested('messageFont', { color, opacity: alpha })
                    }
                />
                {/*<ColorSelectorButton
                    title="Цвет заголовка:"
                    hex={titleFont.color || '#ffffff'}
                    alpha={titleFont.opacity || 1}
                    openColorPopup={openColorPopup}
                    onColorChange={({ color, alpha }) =>
                        updateNested('titleFont', { color, opacity: alpha })
                    }
                />*/}
                <Spacer />
                <SeekbarComponent
                    title={`Радиус тени (${shadowRadius}):`}
                    min="0"
                    max="20"
                    step="1"
                    width="260px"
                    value={shadowRadius}
                    onChange={(v) => updateField('shadowRadius', v)}
                />
            </Row>

            <PaddingEditorComponent
                message={chatMessage}
                onVerticalPaddingChange={(v) => updateField('paddingV', v)}
                onHorizontalPaddingChange={(v) => updateField('paddingH', v)}
                onVerticalMarginChange={(v) => updateField('marginV', v)}
                onHorizontalMarginChange={(v) => updateField('marginH', v)}
            />
        </SettingsBlockFull>
    );
}