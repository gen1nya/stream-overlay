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

const MESSAGE_DIRECTION_OPTIONS = [
    { value: 'row', label: 'слева' },
    { value: 'column', label: 'сверху' },
];

export default function MessageSettingsBlock({ current: { chatMessage }, onChange, openColorPopup }) {
    /** Универсальный апдейтер настроек сообщения */
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

    /* Сахарные обёртки */
    const updateField = (key, val) =>
        updateChatMessage((msg) => ({ ...msg, [key]: val }));
    const updateNested = (key, part) =>
        updateChatMessage((msg) => ({
            ...msg,
            [key]: { ...msg[key], ...part },
        }));

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

            {/* Направление и шрифты */}
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

            {/* Фон */}
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
                <>
                    <BackgroundImageEditorComponent
                        message={chatMessage}
                        onImageChanged={(image) => {
                            updateNested('backgroundImages', image);
                        }}
                    />
                </>

            }
            {backgroundMode === 'gradient' && <div style={{ height: 120 }} />}

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

            {/* Паддинги/отступы */}
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