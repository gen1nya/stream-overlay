import React, {useCallback} from 'react';
import SeekbarComponent from '../../utils/SeekbarComponent';
import RadioGroupComponent from '../../utils/RadioGroupComponent';
import {Row} from '../SettingsComponent';
import {
    SettingsBlockFull,
    SettingsBlockSubTitle,
    SettingsBlockTitle,
} from './SettingBloks';
import ColorSelectorButton from './ColorSelectorButton';
import {Spacer} from '../../utils/Separator';
import FontAndSizeEditor from '../../utils/FontAndSizeEditor';
import RadioGroup from '../../utils/TextRadioGroup';
import BackgroundColorEditorComponent from '../../utils/BackgroundColorEditorComponent';
import PaddingEditorComponent from '../../utils/PaddingEditorComponent';
import BackgroundImageEditorComponent from "../../utils/BackgroundImageEditorComponent";
import GradientEditor from "../../utils/GradientEditor";
import {CanvasTab} from "../../utils/CanvasTab";

const MESSAGE_DIRECTION_OPT = [
    {key: 'row', text: 'слева', aiIcon: 'AiOutlineInsertRowLeft'},
    {key: 'column', text: 'сверху', aiIcon: 'AiOutlineInsertRowAbove'},
];

export default function MessageSettingsBlock({current: {chatMessage}, onChange, openColorPopup}) {
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

    return (
        <SettingsBlockFull>
            <SettingsBlockTitle>Сообщения чатерсов</SettingsBlockTitle>

            <CanvasTab tabWidth={80}>
                <SettingsBlockSubTitle
                    style={{
                        marginBottom: '12px',
                        marginTop: '-8px',
                        marginLeft: '0px',
                        width: '60px',
                    }}>
                    Текст
                </SettingsBlockSubTitle>
                <Row
                    style={{marginTop: '20px'}}
                >
                    <RadioGroup
                        title="Имя чатерса:"
                        defaultSelected={direction}
                        itemWidth="120px"
                        items={MESSAGE_DIRECTION_OPT}
                        onChange={(v) => updateField('direction', v)}
                    />
                    <Spacer/>
                    <FontAndSizeEditor
                        title="Шрифт сообщений:"
                        fontSize={fontSize}
                        fontFamily={messageFont.family}
                        onFontChange={({family, url}) =>
                            updateNested('messageFont', {family, url})
                        }
                        onFontSizeChange={(v) => updateField('fontSize', v)}
                    />
                    <FontAndSizeEditor
                        title="Шрифт заголовка:"
                        fontSize={titleFontSize}
                        fontFamily={titleFont.family}
                        onFontChange={({family, url}) =>
                            updateNested('titleFont', {family, url})
                        }
                        onFontSizeChange={(v) => updateField('titleFontSize', v)}
                    />
                </Row>
                <Row
                    style={{
                        marginTop: '12px',
                        alignItems: 'center',
                    }}
                >
                    <ColorSelectorButton
                        title="Цвет текста:"
                        hex={messageFont.color || '#ffffff'}
                        alpha={messageFont.opacity || 1}
                        openColorPopup={openColorPopup}
                        onColorChange={({color, alpha}) =>
                            updateNested('messageFont', {color, opacity: alpha})
                        }
                    />
                    <Spacer/>
                    <ColorSelectorButton
                        title={"Цвет тени текста:"}
                        hex={messageFont?.shadowColor ?? "#000000"}
                        alpha={messageFont?.shadowOpacity ?? 0}
                        openColorPopup={openColorPopup}
                        onColorChange={({color, alpha}) => {
                            updateNested('messageFont', {shadowColor: color, shadowOpacity: alpha})
                        }}
                    />

                    <SeekbarComponent
                        title={`Радиус тени текста (${messageFont?.shadowRadius}):`}
                        min="0"
                        max="20"
                        step="1"
                        width="160px"
                        value={messageFont?.shadowRadius ?? 0}
                        onChange={(v) => {
                            updateNested("messageFont", {shadowRadius: v})
                        }}
                    />
                </Row>
            </CanvasTab>

            <CanvasTab
                tabWidth={70}
            >
                <SettingsBlockSubTitle
                    style={{
                        marginBottom: '12px',
                        marginTop: '-8px',
                        marginLeft: '0px',
                        width: '60px',
                    }}>
                    Фон
                </SettingsBlockSubTitle>
                <Row>
                    <RadioGroup
                        defaultSelected={backgroundMode}
                        items={[
                            {key: 'color', text: 'цвет'},
                            {key: 'image', text: 'картинки'},
                            {key: 'gradient', text: 'градиент'},
                        ]}
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
                        width="260px"
                        value={borderRadius}
                        onChange={(v) => updateField('borderRadius', v)}
                    />
                </Row>

                {backgroundMode === 'image' &&
                    <BackgroundImageEditorComponent
                        message={chatMessage}
                        onImageChanged={(image) => {
                            console.log('image changed', image);
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

            </CanvasTab>


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