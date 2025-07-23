import ColorSelectorButton from "../app/settings/ColorSelectorButton";
import {Spacer} from "./Separator";
import {Row} from "../app/SettingsComponent";
import React from "react";


export default function BackgroundColorEditorComponent({
                                                           message,
                                                           onBackgroundColorChange,
                                                           onBorderColorChange,
                                                           openColorPopup
                                                       }
) {

    return(
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
        </Row>
    );
}