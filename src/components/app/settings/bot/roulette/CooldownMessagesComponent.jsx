import { SmallTemplateEditor } from "../../../../utils/SmallTemplateEditor";
import AddNewStyleButton from "../../../../utils/AddNewStyleButton";
import { Accordion } from "../../../../utils/AccordionComponent";
import React from "react";
import {CollapsedPreview} from "../../SettingBloks";

export default function CooldownMessagesComponent({ botConfig, apply }) {
    return (
        <Accordion title="Для КД">
            <CollapsedPreview>
                  <span>
                      {'В сообщения можно вставлять переменную ${user}; В ответе будет видно имя чатерса'}
                  </span>
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
                                    "Не так быстро, ${user}! 🎉",
                                ],
                            },
                        };
                    })
                }
            />
        </Accordion>
    );
}
