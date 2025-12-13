import React, {useEffect, useState} from "react";
import NumericEditorComponent from "../../../../utils/NumericEditorComponent";
import Switch from "../../../../utils/Switch";
import { mergeWithDefaults } from "../../../../utils/defaultBotConfig";
import SurvivalMessagesComponent from "./SurvivalMessagesComponent";
import WinnerMessagesComponent from "./WinnerMessagesComponent";
import CooldownMessagesComponent from "./CooldownMessagesComponent";
import ProtectedUsersMessagesComponent from "./ProtectedUsersMessagesComponent";
import {TagInput} from "./TagInput";
import {FiTarget, FiSettings, FiClock, FiPercent, FiMessageSquare, FiAlertTriangle} from 'react-icons/fi';
import {
    CardContent,
    CardTitle,
    ControlGroup,
    Section,
    SectionHeader,
    SectionTitle,
    SettingsCard,
    WarningBadge
} from "../../SharedSettingsStyles";
import {Spacer} from "../../../../utils/Separator";
import {Row} from "../../../SettingsComponent";
import {
    StaticCardHeader,
    HelpButton,
    HelpInfoPopup,
    EnabledToggle, ParameterCard, ParameterTitle,
    StatusBadge
} from "../SharedBotStyles";
import { useTranslation, Trans } from 'react-i18next';


export default function Roulette({ botConfig, apply }) {
    const { t } = useTranslation();
    const [config, setConfig] = useState(botConfig);
    const [enabled, setEnabled] = useState(config.roulette.enabled);
    const [allowToBanEditors, setAllowToBanEditors] = useState(config.roulette.allowToBanEditors);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        if (botConfig) {setConfig(botConfig);}
    }, [botConfig]);

    useEffect(() => {
        setEnabled(config.roulette.enabled);
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
        <SettingsCard>
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

            <StaticCardHeader>
                <Row gap="12px">
                    <EnabledToggle enabled={enabled}>
                        <Switch
                            checked={enabled}
                            onChange={(e) => {
                                const newState = e.target.checked;
                                setEnabled(newState);
                                updateRouletteConfig(() => ({ enabled: newState }));
                            }}
                        />
                        <StatusBadge enabled={enabled}>
                            {enabled
                                ? t('settings.bot.shared.status.enabled')
                                : t('settings.bot.shared.status.disabled')}
                        </StatusBadge>
                    </EnabledToggle>

                    <CardTitle>
                        <FiTarget />
                        {t('settings.bot.roulette.title')}
                    </CardTitle>

                    <Spacer />

                    <HelpButton onClick={() => setShowHelp(true)} />
                </Row>
            </StaticCardHeader>

            <CardContent>
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
                </CardContent>
        </SettingsCard>
    );
}