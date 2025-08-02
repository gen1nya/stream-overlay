import { SmallTemplateEditor } from "../../../../utils/SmallTemplateEditor";
import AddNewStyleButton from "../../../../utils/AddNewStyleButton";
import { Accordion } from "../../../../utils/AccordionComponent";
import React from "react";
import { mergeWithDefaults } from "../../../../utils/defaultBotConfig";
import {CollapsedPreview} from "../../SettingBloks";

export default function ProtectedUsersMessagesComponent({ selectedTheme, apply }) {
    const config = mergeWithDefaults(selectedTheme);
    const messages = config.bot.roulette.protectedUsersMessages;

    return (
        <Accordion title="Для защищенных пользователей (Редакторы)">
            <CollapsedPreview>
                  <span>
                      {'В сообщения можно вставлять переменную ${user}; В ответе будет видно имя чатерса'}
                  </span>
            </CollapsedPreview>
            {messages.map((msg, index) => (
                <SmallTemplateEditor
                    key={index}
                    value={msg}
                    onChange={(value) =>
                        apply((prev) => {
                            const cfg = mergeWithDefaults(prev);
                            const updated = cfg.bot.roulette.protectedUsersMessages.map((m, i) =>
                                i === index ? value : m
                            );
                            return {
                                ...cfg,
                                bot: {
                                    ...cfg.bot,
                                    roulette: {
                                        ...cfg.bot.roulette,
                                        protectedUsersMessages: updated,
                                    },
                                },
                            };
                        })
                    }
                    onDelete={() =>
                        apply((prev) => {
                            const cfg = mergeWithDefaults(prev);
                            const updated = cfg.bot.roulette.protectedUsersMessages.filter((_, i) => i !== index);
                            return {
                                ...cfg,
                                bot: {
                                    ...cfg.bot,
                                    roulette: {
                                        ...cfg.bot.roulette,
                                        protectedUsersMessages: updated,
                                    },
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
                        const cfg = mergeWithDefaults(prev);
                        return {
                            ...cfg,
                            bot: {
                                ...cfg.bot,
                                roulette: {
                                    ...cfg.bot.roulette,
                                    protectedUsersMessages: [
                                        ...cfg.bot.roulette.protectedUsersMessages,
                                        "Ты победил, ${user}! 🎉",
                                    ],
                                },
                            },
                        };
                    })
                }
            />
        </Accordion>
    );
}