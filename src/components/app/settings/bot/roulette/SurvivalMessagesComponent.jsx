import {SmallTemplateEditor} from "../../../../utils/SmallTemplateEditor";
import AddNewStyleButton from "../../../../utils/AddNewStyleButton";
import {Accordion} from "../../../../utils/AccordionComponent";
import React from "react";
import {CollapsedPreview} from "../../SettingBloks";
import { useTranslation, Trans } from 'react-i18next';

export default function SurvivalMessagesComponent({botConfig, apply}) {
    const { t } = useTranslation();
    const messages = botConfig.roulette.survivalMessages;

    return (
        <Accordion title={t('settings.bot.roulette.messages.survival.title')}>
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
                            const updated = cfg.roulette.survivalMessages.map((m, i) =>
                                i === index ? value : m
                            );
                            return {
                                ...cfg,
                                roulette: {
                                    ...cfg.roulette,
                                    survivalMessages: updated,
                                },
                            };
                        })
                    }
                    onDelete={() =>
                        apply((prev) => {
                            const cfg = prev;
                            const updated = cfg.roulette.survivalMessages.filter((_, i) => i !== index);
                            return {
                                ...cfg,
                                roulette: {
                                    ...cfg.roulette,
                                    survivalMessages: updated,
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
                                survivalMessages: [
                                    ...cfg.roulette.survivalMessages,
                                    t('settings.bot.roulette.messages.survival.defaultTemplate'),
                                ],
                            },
                        };
                    })
                }
            />
        </Accordion>
    );
}