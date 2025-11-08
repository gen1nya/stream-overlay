import { SmallTemplateEditor } from "../../../../utils/SmallTemplateEditor";
import AddNewStyleButton from "../../../../utils/AddNewStyleButton";
import { Accordion } from "../../../../utils/AccordionComponent";
import React from "react";
import {CollapsedPreview} from "../../SettingBloks";
import { useTranslation, Trans } from 'react-i18next';

export default function CooldownMessagesComponent({ botConfig, apply }) {
    const { t } = useTranslation();
    return (
        <Accordion title={t('settings.bot.roulette.messages.cooldown.title')}>
            <CollapsedPreview>
                  <Trans
                      i18nKey="settings.bot.shared.variablesHint"
                      components={{
                          highlight: <span className="highlight" />,
                          br: <br />
                      }}
                  />
            </CollapsedPreview>
            {botConfig.roulette.cooldownMessage.map((msg, index) => (
                <SmallTemplateEditor
                    key={index}
                    value={msg}
                    onChange={(value) =>
                        apply((prev) => {
                            const config = prev;
                            const updated = config.roulette.cooldownMessage.map((m, i) =>
                                i === index ? value : m
                            );
                            return {
                                ...config,

                                roulette: {
                                    ...config.roulette,
                                    cooldownMessage: updated,
                                },
                            };
                        })
                    }
                    onDelete={() =>
                        apply((prev) => {
                            const config = prev;
                            const updated = config.roulette.cooldownMessage.filter((_, i) => i !== index);
                            return {
                                ...config,
                                roulette: {
                                    ...config.roulette,
                                    cooldownMessage: updated,
                                },
                            };
                        })
                    }
                />
            ))}

            <AddNewStyleButton
                height="40px"
                margin="8px 0 0 0"
                onClick={() =>
                    apply((prev) => {
                        const config = prev;
                        return {
                            ...config,

                                roulette: {
                                    ...config.roulette,
                                    cooldownMessage: [
                                        ...config.roulette.cooldownMessage,
                                        t('settings.bot.roulette.messages.cooldown.defaultTemplate'),
                                    ],
                                },
                            };
                    })
                }
            />
        </Accordion>
    );
}
