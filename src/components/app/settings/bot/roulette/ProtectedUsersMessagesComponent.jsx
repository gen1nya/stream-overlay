import {SmallTemplateEditor} from "../../../../utils/SmallTemplateEditor";
import AddNewStyleButton from "../../../../utils/AddNewStyleButton";
import {Accordion} from "../../../../utils/AccordionComponent";
import React from "react";
import {CollapsedPreview} from "../../SettingBloks";

export default function ProtectedUsersMessagesComponent({ botConfig, apply }) {
    const messages = botConfig.roulette.protectedUsersMessages;

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
                                    "Ты победил, ${user}! 🎉",
                                ],

                            },
                        };
                    })
                }
            />
        </Accordion>
    );
}