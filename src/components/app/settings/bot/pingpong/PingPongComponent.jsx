import React, {useState, useCallback, useEffect} from 'react';
import Switch from '../../../../utils/Switch';
import PingPongActionEditorComponent from './PingPongActionEditorComponent';
import {FiMessageCircle, FiPlus, FiSettings, FiInfo} from 'react-icons/fi';
import {
    CardContent,
    CardTitle,
    Section,
    SectionHeader,
    SectionTitle,
    SettingsCard
} from "../../SharedSettingsStyles";
import {Row} from "../../../SettingsComponent";
import {Spacer} from "../../../../utils/Separator";
import {
    AddButton,
    AddCommandForm,
    StaticCardHeader,
    HelpButton,
    HelpInfoPopup,
    EnabledToggle, ErrorText, FormRow, NameInput,
    StatusBadge, VariableItem,
    VariablesList
} from "../SharedBotStyles";
import { useTranslation, Trans } from 'react-i18next';


export default function PingPongComponent({ botConfig, apply }) {
    const { t } = useTranslation();
    const [config, setConfig] = useState(botConfig);
    const [enabled, setEnabled] = useState(config.pingpong.enabled);
    const [name, setName] = useState('');
    const [nameError, setNameError] = useState('');
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        setEnabled(config.pingpong.enabled);
    }, [config.pingpong.enabled]);

    useEffect(() => {
        if (botConfig) {setConfig(botConfig);}
    }, [botConfig]);

    const updatePingPongConfig = (updater) => {
        apply((prev) => {
            const cfg = prev;
            return {
                ...cfg,
                pingpong: {
                    ...cfg.pingpong,
                    ...updater(cfg.pingpong),
                },
            };
        });
    };

    const addCommand = useCallback(() => {
        const trimmed = name.trim();
        const commands = config.pingpong.commands;

        // Validate
        if (!trimmed) {
            setNameError(t('settings.bot.pingpong.errors.required'));
            return;
        }

        if (commands.some((cmd) => cmd.name === trimmed)) {
            setNameError(t('settings.bot.pingpong.errors.duplicate'));
            return;
        }

        // Reset error & clear input
        setNameError('');
        setName('');

        // Append new command
        updatePingPongConfig((prevConfig) => ({
            commands: [
                ...prevConfig.commands,
                {
                    name: trimmed,
                    enabled: true,
                    triggerType: 'exact',
                    triggers: [
                        {
                            type: 'text',
                            value: t('settings.bot.pingpong.defaults.trigger'),
                        },
                    ],
                    responses: [t('settings.bot.pingpong.defaults.response')],
                },
            ],
        }));
    }, [name, config.pingpong.commands, updatePingPongConfig]);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            addCommand();
        }
    };

    return (
        <SettingsCard>
            <HelpInfoPopup
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title={t('settings.bot.pingpong.title')}
                icon={<FiMessageCircle />}
            >
                <Trans
                    i18nKey="settings.bot.pingpong.preview"
                    components={{
                        br: <br />,
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
                                updatePingPongConfig(() => ({ enabled: newState }));
                            }}
                        />
                        <StatusBadge enabled={enabled}>
                            {enabled
                                ? t('settings.bot.shared.status.enabled')
                                : t('settings.bot.shared.status.disabled')}
                        </StatusBadge>
                    </EnabledToggle>

                    <CardTitle>
                        <FiMessageCircle />
                        {t('settings.bot.pingpong.title')}
                    </CardTitle>

                    <Spacer />

                    <HelpButton onClick={() => setShowHelp(true)} />
                </Row>
            </StaticCardHeader>

            <CardContent>
                    {/* Информация о переменных */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiInfo />
                                {t('settings.bot.pingpong.sections.variables')}
                            </SectionTitle>
                        </SectionHeader>

                        <VariablesList>
                            <VariableItem>
                                <span className="var">${'{user}'}</span>
                                <span className="desc">{t('settings.bot.pingpong.variables.user')}</span>
                            </VariableItem>
                            <VariableItem>
                                <span className="var">${'{last_message}'}</span>
                                <span className="desc">{t('settings.bot.pingpong.variables.lastMessage')}</span>
                            </VariableItem>
                            <VariableItem>
                                <span className="var">${'{random(1000,9999)}'}</span>
                                <span className="desc">{t('settings.bot.pingpong.variables.random')}</span>
                            </VariableItem>
                        </VariablesList>
                    </Section>

                    {/* Добавление новой команды */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiPlus />
                                {t('settings.bot.pingpong.sections.addCommand')}
                            </SectionTitle>
                        </SectionHeader>

                        <AddCommandForm>
                            <FormRow>
                                <NameInput
                                    placeholder={t('settings.bot.pingpong.placeholders.commandName')}
                                    value={name}
                                    $error={!!nameError}
                                    onChange={(e) => {
                                        setNameError('');
                                        setName(e.target.value);
                                    }}
                                    onKeyPress={handleKeyPress}
                                />
                                <AddButton onClick={addCommand}>
                                    <FiPlus />
                                    {t('settings.bot.pingpong.actions.addCommand')}
                                </AddButton>
                            </FormRow>
                            {nameError && <ErrorText>{nameError}</ErrorText>}
                        </AddCommandForm>
                    </Section>

                    {/* Редактор существующих команд */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiSettings />
                                {t('settings.bot.pingpong.sections.manageCommands')}
                            </SectionTitle>
                        </SectionHeader>

                        <PingPongActionEditorComponent
                            botConfig={botConfig}
                            apply={apply}
                        />
                    </Section>
                </CardContent>
        </SettingsCard>
    );
}