import React, {useEffect, useState} from "react";
import NumericEditorComponent from "../../../../utils/NumericEditorComponent";
import Switch from "../../../../utils/Switch";
import SurvivalMessagesComponent from "./SurvivalMessagesComponent";
import WinnerMessagesComponent from "./WinnerMessagesComponent";
import CooldownMessagesComponent from "./CooldownMessagesComponent";
import ProtectedUsersMessagesComponent from "./ProtectedUsersMessagesComponent";
import StatsMessagesComponent from "./StatsMessagesComponent";
import LeaderboardMessagesComponent from "./LeaderboardMessagesComponent";
import {TagInput} from "./TagInput";
import {FiTarget, FiSettings, FiClock, FiPercent, FiMessageSquare, FiAlertTriangle, FiBarChart2, FiAward} from 'react-icons/fi';
import {
    ControlGroup,
    Section,
    SectionHeader,
    SectionTitle,
    WarningBadge
} from "../../SharedSettingsStyles";
import {Row} from "../../../SettingsComponent";
import {
    HelpInfoPopup,
    EnabledToggle, ParameterCard, ParameterTitle
} from "../SharedBotStyles";
import { useTranslation, Trans } from 'react-i18next';


export default function Roulette({ botConfig, apply, showHelp, setShowHelp }) {
    const { t } = useTranslation();
    const [config, setConfig] = useState(botConfig);
    const [allowToBanEditors, setAllowToBanEditors] = useState(config.roulette.allowToBanEditors);

    useEffect(() => {
        if (botConfig) {setConfig(botConfig);}
    }, [botConfig]);

    useEffect(() => {
        setAllowToBanEditors(config.roulette.allowToBanEditors);
    }, [config]);

    const updateRouletteConfig = (updater) => {
        apply((prev) => {
            return {
                ...prev,
                roulette: {
                    ...prev.roulette,
                    ...updater(prev.roulette),
                },

            };
        });
    };

    return (
        <>
            <HelpInfoPopup
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title={t('settings.bot.roulette.title')}
                icon={<FiTarget />}
            >
                <Trans
                    i18nKey="settings.bot.roulette.preview"
                    components={{
                        br: <br />,
                        warning: <span className="warning" />,
                        highlight: <span className="highlight" />
                    }}
                />
            </HelpInfoPopup>

            {/* Основные параметры */}
            <Section>
                <SectionHeader>
                    <SectionTitle>
                        <FiSettings />
                        {t('settings.bot.roulette.sections.main')}
                    </SectionTitle>
                    <WarningBadge>
                        <FiAlertTriangle />
                        {t('settings.bot.roulette.warning.roles')}
                    </WarningBadge>
                </SectionHeader>

                <Row gap="20px">
                    <ControlGroup>
                        <ParameterCard>
                            <ParameterTitle>
                                <FiClock />
                                {t('settings.bot.roulette.parameters.muteDuration')}
                            </ParameterTitle>
                            <NumericEditorComponent
                                width="150px"
                                value={config.roulette.muteDuration / 1000}
                                onChange={(value) =>
                                    updateRouletteConfig(() => ({ muteDuration: value * 1000 }))
                                }
                                min={1}
                                max={60 * 60}
                            />
                        </ParameterCard>
                    </ControlGroup>

                    <ControlGroup>
                        <ParameterCard>
                            <ParameterTitle>
                                <FiClock />
                                {t('settings.bot.roulette.parameters.cooldown')}
                            </ParameterTitle>
                            <NumericEditorComponent
                                width="150px"
                                value={config.roulette.commandCooldown / 1000}
                                onChange={(value) =>
                                    updateRouletteConfig(() => ({ commandCooldown: value * 1000 }))
                                }
                                min={1}
                                max={60 * 60}
                            />
                        </ParameterCard>
                    </ControlGroup>

                    <ControlGroup>
                        <ParameterCard>
                            <ParameterTitle>
                                <FiPercent />
                                {t('settings.bot.roulette.parameters.chance')}
                            </ParameterTitle>
                            <NumericEditorComponent
                                width="150px"
                                value={config.roulette.chance * 100}
                                onChange={(value) =>
                                    updateRouletteConfig(() => ({ chance: value / 100 }))
                                }
                                min={0}
                                max={100}
                            />
                        </ParameterCard>
                    </ControlGroup>
                </Row>

                <Row gap="20px">
                    <ControlGroup>
                        <EnabledToggle enabled={allowToBanEditors}>
                            <span>{t('settings.bot.roulette.parameters.allowEditors')}</span>
                            <Switch
                                checked={allowToBanEditors}
                                onChange={(e) => {
                                    const newState = e.target.checked;
                                    setAllowToBanEditors(newState);
                                    updateRouletteConfig(() => ({ allowToBanEditors: newState }));
                                }}
                            />
                        </EnabledToggle>
                    </ControlGroup>
                </Row>
            </Section>

            {/* Команды */}
            <Section>
                <SectionHeader>
                    <SectionTitle>
                        <FiTarget />
                        {t('settings.bot.roulette.sections.commands')}
                    </SectionTitle>
                </SectionHeader>

                <TagInput
                    value={config.roulette.commands.join(", ")}
                    onChange={(value) => {
                        const commands = value.split(",").map((cmd) => cmd.trim()).filter(cmd => cmd);
                        updateRouletteConfig(() => ({ commands }));
                    }}
                    placeholder={t('settings.bot.roulette.commands.placeholder')}
                />
            </Section>

            {/* Команда статистики */}
            <Section>
                <SectionHeader>
                    <SectionTitle>
                        <FiBarChart2 />
                        {t('settings.bot.roulette.stats.sectionTitle')}
                    </SectionTitle>
                </SectionHeader>

                <TagInput
                    value={(config.roulette.statsCommands || []).join(", ")}
                    onChange={(value) => {
                        const statsCommands = value.split(",").map((cmd) => cmd.trim()).filter(cmd => cmd);
                        updateRouletteConfig(() => ({ statsCommands }));
                    }}
                    placeholder={t('settings.bot.roulette.stats.commands.placeholder')}
                />

                <div style={{ marginTop: '16px' }}>
                    <StatsMessagesComponent botConfig={botConfig} apply={apply} />
                </div>
            </Section>

            {/* Команда лидерборда */}
            <Section>
                <SectionHeader>
                    <SectionTitle>
                        <FiAward />
                        {t('settings.bot.roulette.leaderboard.sectionTitle')}
                    </SectionTitle>
                </SectionHeader>

                <TagInput
                    value={(config.roulette.leaderboardCommands || []).join(", ")}
                    onChange={(value) => {
                        const leaderboardCommands = value.split(",").map((cmd) => cmd.trim()).filter(cmd => cmd);
                        updateRouletteConfig(() => ({ leaderboardCommands }));
                    }}
                    placeholder={t('settings.bot.roulette.leaderboard.commands.placeholder')}
                />

                <Row gap="20px" style={{ marginTop: '16px' }}>
                    <ControlGroup>
                        <ParameterCard>
                            <ParameterTitle>
                                <FiAward />
                                {t('settings.bot.roulette.leaderboard.size')}
                            </ParameterTitle>
                            <NumericEditorComponent
                                width="100px"
                                value={config.roulette.leaderboardSize || 5}
                                onChange={(value) =>
                                    updateRouletteConfig(() => ({ leaderboardSize: value }))
                                }
                                min={1}
                                max={10}
                            />
                        </ParameterCard>
                    </ControlGroup>
                </Row>

                <div style={{ marginTop: '16px' }}>
                    <LeaderboardMessagesComponent botConfig={botConfig} apply={apply} />
                </div>
            </Section>

            {/* Сообщения */}
            <Section>
                <SectionHeader>
                    <SectionTitle>
                        <FiMessageSquare />
                        {t('settings.bot.roulette.sections.messages')}
                    </SectionTitle>
                </SectionHeader>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <SurvivalMessagesComponent botConfig={botConfig} apply={apply} />
                    <WinnerMessagesComponent botConfig={botConfig} apply={apply} />
                    <CooldownMessagesComponent botConfig={botConfig} apply={apply} />
                    <ProtectedUsersMessagesComponent botConfig={botConfig} apply={apply} />
                </div>
            </Section>
        </>
    );
}
