import {SmallTemplateEditor} from "../../../../utils/SmallTemplateEditor";
import AddNewStyleButton from "../../../../utils/AddNewStyleButton";
import {Accordion} from "../../../../utils/AccordionComponent";
import React from "react";
import {CollapsedPreview} from "../../SettingBloks";
import { useTranslation, Trans } from 'react-i18next';

export default function ProtectedUsersMessagesComponent({ botConfig, apply }) {
    const { t } = useTranslation();
    const messages = botConfig.roulette.protectedUsersMessages;

    return (
        <Accordion title={t('settings.bot.roulette.messages.protected.title')}>
            <CollapsedPreview>
                  <Trans
                      i18nKey="settings.bot.shared.variablesHint"
                      components={{
                          highlight: <span className="highlight" />,
                          br: <br />
                      }}
                  />
            </CollapsedPreview>
            {messages.map((msg, index) => (
                <SmallTemplateEditor
                    key={index}
                    value={msg}
                    onChange={(value) =>
                        apply((prev) => {
                            const cfg = prev;
                            const updated = cfg.roulette.protectedUsersMessages.map((m, i) =>
                                i === index ? value : m
                            );
                            return {
                                ...cfg,
                                roulette: {
                                    ...cfg.roulette,
                                    protectedUsersMessages: updated,
                                },
                            };
                        })
                    }
                    onDelete={() =>
                        apply((prev) => {
                            const cfg = prev;
                            const updated = cfg.roulette.protectedUsersMessages.filter((_, i) => i !== index);
                            return {
                                ...cfg,
                                roulette: {
                                    ...cfg.roulette,
                                    protectedUsersMessages: updated,
                                },
                            };
                        })
                    }
                />
            ))}

            <AddNewStyleButton
                height={"40px"}
                margin={"8px 0 0 0"}
                onClick={() =>
                    apply((prev) => {
                        const cfg = prev;
                        return {
                            ...cfg,
                            roulette: {
                                ...cfg.roulette,
                                protectedUsersMessages: [
                                    ...cfg.roulette.protectedUsersMessages,
                                    t('settings.bot.roulette.messages.protected.defaultTemplate'),
                                ],

                            },
                        };
                    })
                }
            />
        </Accordion>
    );
}