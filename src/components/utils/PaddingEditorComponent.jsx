import {Row} from "../app/SettingsComponent";
import SeekbarComponent from "./SeekbarComponent";
import React from "react";
import {SmallSubTitle} from "../app/settings/SettingBloks";

export default function PaddingEditorComponent({
                                                    message,
                                                    onVerticalPaddingChange,
                                                    onHorizontalPaddingChange,
                                                    onVerticalMarginChange,
                                                    onHorizontalMarginChange,
}) {

    return (
        <>
            <div>
                <SmallSubTitle>Отступы снаружи:</SmallSubTitle>
                <Row align="center" gap="0.5rem">
                    <SeekbarComponent
                        title={`По горизонтали (${message.marginH ?? 0}):`}
                        min="0"
                        max="100"
                        width={"150px"}
                        value={message.marginH ?? 0}
                        step="1"
                        onChange={onHorizontalMarginChange}
                    />

                    <SeekbarComponent
                        title={`По вертикали (${message.marginV ?? 0}):`}
                        min="0"
                        max="50"
                        width={"150px"}
                        value={message.marginV ?? 0}
                        step="1"
                        onChange={onVerticalMarginChange}
                    />
                </Row>
            </div>

            <div>
                <span>Отступы внутри:</span>
                <Row>
                    <SeekbarComponent
                        title={`По горизонтали (${message.paddingH ?? 0}):`}
                        min="0"
                        max="100"
                        width={"150px"}
                        value={message.paddingH ?? 0}
                        step="1"
                        onChange={onHorizontalPaddingChange}
                    />

                    <SeekbarComponent
                        title={`По вертикали (${message.paddingV ?? 0}):`}
                        min="0"
                        max="50"
                        value={message.paddingV ?? 0}
                        step="1"
                        width={"150px"}
                        onChange={onVerticalPaddingChange}
                    />
                </Row>
            </div>
        </>
    );
}