import React, {useState, useCallback, useEffect} from 'react';
import styled from 'styled-components';
import { mergeWithDefaults } from '../../../../utils/defaultBotConfig';
import Switch from '../../../../utils/Switch';
import PingPongActionEditorComponent from './PingPongActionEditorComponent';
import {FiMessageCircle, FiPlus, FiSettings, FiChevronDown, FiChevronUp, FiInfo} from 'react-icons/fi';
import {
    CardContent,
    CardHeader,
    CardTitle,
    Section,
    SectionHeader,
    SectionTitle,
    SettingsCard,
    InfoBadge,
    ActionButton
} from "../../SharedSettingsStyles";
import {Row} from "../../../SettingsComponent";
import {Spacer} from "../../../../utils/Separator";
import {
    AddButton,
    AddCommandForm,
    CollapsedPreview,

    CollapsibleHeader,
    EnabledToggle, ErrorText, FormRow, NameInput,
    StatusBadge, VariableItem,
    VariablesList
} from "../SharedBotStyles";


const CollapseToggle = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: #999;
    font-size: 0.9rem;
    transition: color 0.2s ease;
    
    svg {
        width: 18px;
        height: 18px;
        transition: transform 0.2s ease;
    }
    
    ${CollapsibleHeader}:hover & {
        color: #ccc;
    }
`;




export default function PingPongComponent({ selectedTheme, apply }) {
    const config = mergeWithDefaults(selectedTheme);
    const [isOpen, setIsOpen] = useState(false);
    const [enabled, setEnabled] = useState(config.bot.pingpong.enabled);
    const [name, setName] = useState('');
    const [nameError, setNameError] = useState('');

    const toggleOpen = () => setIsOpen((prev) => !prev);

    useEffect(() => {
        setEnabled(config.bot.pingpong.enabled);
    }, [config.bot.pingpong.enabled]);

    const updatePingPongConfig = (updater) => {
        apply((prev) => {
            const cfg = mergeWithDefaults(prev);
            return {
                ...cfg,
                bot: {
                    ...cfg.bot,
                    pingpong: {
                        ...cfg.bot.pingpong,
                        ...updater(cfg.bot.pingpong),
                    },
                },
            };
        });
    };

    const addCommand = useCallback(() => {
        const trimmed = name.trim();
        const commands = config.bot.pingpong.commands;

        // Validate
        if (!trimmed) {
            setNameError('Название команды не может быть пустым');
            return;
        }

        if (commands.some((cmd) => cmd.name === trimmed)) {
            setNameError('Команда с таким названием уже существует');
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
                            value: '!пинг',
                        },
                    ],
                    responses: ['понг'],
                },
            ],
        }));
    }, [name, config.bot.pingpong.commands, updatePingPongConfig]);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            addCommand();
        }
    };

    return (
        <SettingsCard>
            <CollapsibleHeader onClick={toggleOpen}>
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
                            {enabled ? 'Включено' : 'Выключено'}
                        </StatusBadge>
                    </EnabledToggle>

                    <CardTitle>
                        <FiMessageCircle />
                        Пинг-Понг команды
                    </CardTitle>

                    <Spacer />

                    <CollapseToggle>
                        {isOpen ? 'Свернуть' : 'Развернуть'}
                        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                    </CollapseToggle>
                </Row>
            </CollapsibleHeader>

            {/* Свернутое описание */}
            {!isOpen && (
                <CollapsedPreview onClick={toggleOpen}>
                    Бот будет отвечать на ключевые слова и команды (например !пинг)
                    <br /><br />
                    В сообщения можно вставлять переменные:<br />
                    <span className="highlight">${'{user}'}</span> - имя пользователя<br />
                    <span className="highlight">${'{last_message}'}</span> - сообщение пользователя<br />
                    <span className="highlight">${'{random(1000,9999)}'}</span> - случайное число в диапазоне
                </CollapsedPreview>
            )}

            {isOpen && (
                <CardContent>
                    {/* Информация о переменных */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiInfo />
                                Доступные переменные
                            </SectionTitle>
                        </SectionHeader>

                        <VariablesList>
                            <VariableItem>
                                <span className="var">${'{user}'}</span>
                                <span className="desc">- имя пользователя</span>
                            </VariableItem>
                            <VariableItem>
                                <span className="var">${'{last_message}'}</span>
                                <span className="desc">- сообщение пользователя</span>
                            </VariableItem>
                            <VariableItem>
                                <span className="var">${'{random(1000,9999)}'}</span>
                                <span className="desc">- случайное число в диапазоне</span>
                            </VariableItem>
                        </VariablesList>
                    </Section>

                    {/* Добавление новой команды */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiPlus />
                                Добавить новую команду
                            </SectionTitle>
                        </SectionHeader>

                        <AddCommandForm>
                            <FormRow>
                                <NameInput
                                    placeholder="Введите название команды (например: Приветствие)"
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
                                    Добавить команду
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
                                Управление командами
                            </SectionTitle>
                        </SectionHeader>

                        <PingPongActionEditorComponent
                            selectedTheme={selectedTheme}
                            apply={apply}
                        />
                    </Section>
                </CardContent>
            )}
        </SettingsCard>
    );
}