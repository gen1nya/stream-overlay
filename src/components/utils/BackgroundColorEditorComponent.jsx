import ColorSelectorButton from "../app/settings/ColorSelectorButton";
import {Spacer} from "./Separator";
import {Row} from "../app/SettingsComponent";
import React from "react";
import { useTranslation } from 'react-i18next';
import SeekbarComponent from "./SeekbarComponent";


export default function BackgroundColorEditorComponent({
                                                           message,
                                                           onBackgroundColorChange,
                                                           onBorderColorChange,
                                                           openColorPopup,
                                                           onShadowColorChange,
                                                           onShadowRadiusChange,
                                                       }
) {
    const { t } = useTranslation();

    return (
        <Row>
            <ColorSelectorButton
                title={t('settings.backgroundColor.background')}
                hex={message.backgroundColor}
                alpha={message?.backgroundOpacity ?? 1}
                openColorPopup={openColorPopup}
                onColorChange={onBackgroundColorChange}
            />
            <ColorSelectorButton
                title={t('settings.backgroundColor.border')}
                hex={message?.borderColor ?? "#000000"}
                alpha={message?.borderOpacity ?? 1}
                openColorPopup={openColorPopup}
                onColorChange={onBorderColorChange}
            />
            <Spacer/>
            <ColorSelectorButton
                title={t('settings.backgroundColor.shadowColor')}
                hex={message.shadowColor || "#000000"}
                alpha={message.shadowOpacity || 1}
                openColorPopup={openColorPopup}
                onColorChange={({color, alpha}) =>
                    onShadowColorChange({shadowColor: color, shadowOpacity: alpha})
                }
            />
            <SeekbarComponent
                title={t('settings.backgroundColor.shadowRadius')}
                min="0"
                max="20"
                step="1"
                width="260px"
                value={message?.shadowRadius ?? 0}
                onChange={(v) => onShadowRadiusChange('shadowRadius', v)}
            />
        </Row>
    );
}