import { SettingsBlockFull, SettingsBlockTitle } from "../../SettingBloks";
import NumericEditorComponent from "../../../../utils/NumericEditorComponent";
import { Spacer } from "../../../../utils/Separator";
import React, {useEffect, useState} from "react";
import { Row } from "../../../SettingsComponent";
import SurvivalMessagesComponent from "./SurvivalMessagesComponent";
import WinnerMessagesComponent from "./WinnerMessagesComponent";
import CooldownMessagesComponent from "./CooldownMessagesComponent";
import Switch from "../../../../utils/Switch";
import { mergeWithDefaults } from "../../../../utils/defaultBotConfig";
import {SmallTemplateEditor} from "../../../../utils/SmallTemplateEditor";
import styled from "styled-components";

const SubTitle = styled.h3`
    margin: 0;
    font-size: 16px;
    font-weight: 500;
`;

export default function Roulette({ selectedTheme, apply }) {
    const config = mergeWithDefaults(selectedTheme);
    const [enabled, setEnabled] = useState(config.bot.roulette.enabled);

    useEffect(() => {
        setEnabled(config.bot.roulette.enabled);
    }, [config.bot.roulette.enabled]);

    return (
        <SettingsBlockFull>
            <Row>
                <Switch
                    checked={enabled}
                    onChange={(e) => {
                        const newState = e.target.checked;
                        setEnabled(newState);
                        apply((prev) => {
                            const cfg = mergeWithDefaults(prev);
                            return {
                                ...cfg,
                                bot: {
                                    ...cfg.bot,
                                    roulette: {
                                        ...cfg.bot.roulette,
                                        enabled: newState,
                                    },
                                },
                            };
                        });
                    }}
                />
                <SettingsBlockTitle>Русская рулетка (mute)</SettingsBlockTitle>
                <Spacer />
            </Row>

            <Row>
                <NumericEditorComponent
                    width={"150px"}
                    title="Время мута"
                    value={config.bot.roulette.muteDuration / 1000}
                    onChange={(value) =>
                        apply((prev) => {
                            const cfg = mergeWithDefaults(prev);
                            return {
                                ...cfg,
                                bot: {
                                    ...cfg.bot,
                                    roulette: {
                                        ...cfg.bot.roulette,
                                        muteDuration: value * 1000,
                                    },
                                },
                            };
                        })
                    }
                    min={1}
                    max={60 * 60}
                />

                <NumericEditorComponent
                    width={"150px"}
                    title="Время перезарядки"
                    value={config.bot.roulette.commandCooldown / 1000}
                    onChange={(value) =>
                        apply((prev) => {
                            const cfg = mergeWithDefaults(prev);
                            return {
                                ...cfg,
                                bot: {
                                    ...cfg.bot,
                                    roulette: {
                                        ...cfg.bot.roulette,
                                        commandCooldown: value * 1000,
                                    },
                                },
                            };
                        })
                    }
                    min={1}
                    max={60 * 60}
                />

                <NumericEditorComponent
                    width={"150px"}
                    title="Вероятность (%)"
                    value={config.bot.roulette.chance * 100}
                    onChange={(value) =>
                        apply((prev) => {
                            const cfg = mergeWithDefaults(prev);
                            return {
                                ...cfg,
                                bot: {
                                    ...cfg.bot,
                                    roulette: {
                                        ...cfg.bot.roulette,
                                        chance: value / 100,
                                    },
                                },
                            };
                        })
                    }
                    min={0}
                    max={100}
                />

                <Spacer />
            </Row>

            <SubTitle>Команды, через зяпятую</SubTitle>
            <SmallTemplateEditor
                hideDelete={true}
                value={config.bot.roulette.commands.join(", ")}
                onChange={(value) =>
                    apply((prev) => {
                        const cfg = mergeWithDefaults(prev);
                        return {
                            ...cfg,
                            bot: {
                                ...cfg.bot,
                                roulette: {
                                    ...cfg.bot.roulette,
                                    commands: value.split(",").map((cmd) => cmd.trim()),
                                },
                            },
                        };
                    })
                }
                placeholder="Команды, через запятую"
            />
            <SubTitle>Сообщения</SubTitle>
            <SurvivalMessagesComponent selectedTheme={selectedTheme} apply={apply} />
            <WinnerMessagesComponent selectedTheme={selectedTheme} apply={apply} />
            <CooldownMessagesComponent selectedTheme={selectedTheme} apply={apply} />
        </SettingsBlockFull>
    );
}