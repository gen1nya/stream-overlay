import {Row} from "../app/SettingsComponent";
import SeekbarComponent from "./SeekbarComponent";
import React from "react";
import {SmallSubTitle} from "../app/settings/SettingBloks";
import { useTranslation } from "react-i18next";

export default function PaddingEditorComponent({
                                                    message,
                                                    onVerticalPaddingChange,
                                                    onHorizontalPaddingChange,
                                                    onVerticalMarginChange,
                                                    onHorizontalMarginChange,
}) {
    const { t } = useTranslation();

    return (
        <>
            <div>
                <SmallSubTitle>{t('settings.shared.paddingEditor.outerTitle')}</SmallSubTitle>
                <Row align="center" gap="0.5rem">
                    <SeekbarComponent
                        title={t('settings.shared.paddingEditor.horizontal')}
                        min="0"
                        max="100"
                        width={"150px"}
                        value={message.marginH ?? 0}
                        step="1"
                        onChange={onHorizontalMarginChange}
                    />

                    <SeekbarComponent
                        title={t('settings.shared.paddingEditor.vertical')}
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
                <span>{t('settings.shared.paddingEditor.innerTitle')}</span>
                <Row>
                    <SeekbarComponent
                        title={t('settings.shared.paddingEditor.horizontal')}
                        min="0"
                        max="100"
                        width={"150px"}
                        value={message.paddingH ?? 0}
                        step="1"
                        onChange={onHorizontalPaddingChange}
                    />

                    <SeekbarComponent
                        title={t('settings.shared.paddingEditor.vertical')}
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
