import { SmallTemplateEditor } from "../../../../utils/SmallTemplateEditor";
import AddNewStyleButton from "../../../../utils/AddNewStyleButton";
import { Accordion } from "../../../../utils/AccordionComponent";
import React from "react";
import { mergeWithDefaults } from "../../../../utils/defaultBotConfig";

export default function WinnerMessagesComponent({ selectedTheme, apply }) {
    const config = mergeWithDefaults(selectedTheme);
    const messages = config.bot.roulette.deathMessages;

    return (
        <Accordion title="Для победителей">
            {messages.map((msg, index) => (
                <SmallTemplateEditor
                    key={index}
                    value={msg}
                    onChange={(value) =>
                        apply((prev) => {
                            const cfg = mergeWithDefaults(prev);
                            const updated = cfg.bot.roulette.deathMessages.map((m, i) =>
                                i === index ? value : m
                            );
                            return {
                                ...cfg,
                                bot: {
                                    ...cfg.bot,
                                    roulette: {
                                        ...cfg.bot.roulette,
                                        deathMessages: updated,
                                    },
                                },
                            };
                        })
                    }
                    onDelete={() =>
                        apply((prev) => {
                            const cfg = mergeWithDefaults(prev);
                            const updated = cfg.bot.roulette.deathMessages.filter((_, i) => i !== index);
                            return {
                                ...cfg,
                                bot: {
                                    ...cfg.bot,
                                    roulette: {
                                        ...cfg.bot.roulette,
                                        deathMessages: updated,
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
                                    deathMessages: [
                                        ...cfg.bot.roulette.deathMessages,
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