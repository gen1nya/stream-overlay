import ColorSelectorButton from "../app/settings/ColorSelectorButton";
import {Spacer} from "./Separator";
import {Row} from "../app/SettingsComponent";
import React from "react";
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

    return (
        <Row>
            <ColorSelectorButton
                title={"Цвет фона:"}
                hex={message.backgroundColor}
                alpha={message?.backgroundOpacity ?? 1}
                openColorPopup={openColorPopup}
                onColorChange={onBackgroundColorChange}
            />
            <ColorSelectorButton
                title={"Цвет обводки:"}
                hex={message?.borderColor ?? "#000000"}
                alpha={message?.borderOpacity ?? 1}
                openColorPopup={openColorPopup}
                onColorChange={onBorderColorChange}
            />
            <Spacer/>
            <ColorSelectorButton
                title="Цвет тени:"
                hex={message.shadowColor || "#000000"}
                alpha={message.shadowOpacity || 1}
                openColorPopup={openColorPopup}
                onColorChange={({color, alpha}) =>
                    onShadowColorChange({shadowColor: color, shadowOpacity: alpha})
                }
            />
            <SeekbarComponent
                title={`Радиус тени (${message?.shadowRadius}):`}
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