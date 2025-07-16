import { SmallTemplateEditor } from "../../../../utils/SmallTemplateEditor";
import AddNewStyleButton from "../../../../utils/AddNewStyleButton";
import { Accordion } from "../../../../utils/AccordionComponent";
import React from "react";
import { mergeWithDefaults } from "../../../../utils/defaultBotConfig";

export default function CooldownMessagesComponent({ selectedTheme, apply }) {
    return (
        <Accordion title="Для КД">
            {mergeWithDefaults(selectedTheme).bot.roulette.cooldownMessage.map((msg, index) => (
                <SmallTemplateEditor
                    key={index}
                    value={msg}
                    onChange={(value) =>
                        apply((prev) => {
                            const config = mergeWithDefaults(prev);
                            const updated = config.bot.roulette.cooldownMessage.map((m, i) =>
                                i === index ? value : m
                            );
                            return {
                                ...config,
                                bot: {
                                    ...config.bot,
                                    roulette: {
                                        ...config.bot.roulette,
                                        cooldownMessage: updated,
                                    },
                                },
                            };
                        })
                    }
                    onDelete={() =>
                        apply((prev) => {
                            const config = mergeWithDefaults(prev);
                            const updated = config.bot.roulette.cooldownMessage.filter((_, i) => i !== index);
                            return {
                                ...config,
                                bot: {
                                    ...config.bot,
                                    roulette: {
                                        ...config.bot.roulette,
                                        cooldownMessage: updated,
                                    },
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
                        const config = mergeWithDefaults(prev);
                        return {
                            ...config,
                            bot: {
                                ...config.bot,
                                roulette: {
                                    ...config.bot.roulette,
                                    cooldownMessage: [
                                        ...config.bot.roulette.cooldownMessage,
                                        "Не так быстро, ${user}! 🎉",
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
