import React, {useEffect, useState} from "react";
import styled from "styled-components";
import NumericEditorComponent from "../../../../utils/NumericEditorComponent";
import Switch from "../../../../utils/Switch";
import { mergeWithDefaults } from "../../../../utils/defaultBotConfig";
import SurvivalMessagesComponent from "./SurvivalMessagesComponent";
import WinnerMessagesComponent from "./WinnerMessagesComponent";
import CooldownMessagesComponent from "./CooldownMessagesComponent";
import ProtectedUsersMessagesComponent from "./ProtectedUsersMessagesComponent";
import {TagInput} from "./TagInput";
import {FiTarget, FiSettings, FiClock, FiPercent, FiMessageSquare, FiChevronDown, FiChevronUp, FiAlertTriangle} from 'react-icons/fi';
import {
    CardContent,
    CardHeader,
    CardTitle,
    ControlGroup,
    Section,
    SectionHeader,
    SectionTitle,
    SettingsCard,
    InfoBadge,
    WarningBadge
} from "../../SharedSettingsStyles";
import {Spacer} from "../../../../utils/Separator";
import {Row} from "../../../SettingsComponent";
import {
    AddButton,
    AddCommandForm,
    CollapsedPreview,

    CollapsibleHeader,
    EnabledToggle, ErrorText, FormRow, NameInput, ParameterCard, ParameterTitle,
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



export default function Roulette({ selectedTheme, apply }) {
    const config = mergeWithDefaults(selectedTheme);
    const [enabled, setEnabled] = useState(config.bot.roulette.enabled);
    const [allowToBanEditors, setAllowToBanEditors] = useState(config.bot.roulette.allowToBanEditors);
    const [isOpen, setIsOpen] = useState(false);

    const toggleOpen = () => setIsOpen((prev) => !prev);

    useEffect(() => {
        setEnabled(config.bot.roulette.enabled);
        setAllowToBanEditors(config.bot.roulette.allowToBanEditors);
    }, [config.bot.roulette.enabled, config.bot.roulette.allowToBanEditors]);

    const updateRouletteConfig = (updater) => {
        apply((prev) => {
            const cfg = mergeWithDefaults(prev);
            return {
                ...cfg,
                bot: {
                    ...cfg.bot,
                    roulette: {
                        ...cfg.bot.roulette,
                        ...updater(cfg.bot.roulette),
                    },
                },
            };
        });
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
                                updateRouletteConfig(() => ({ enabled: newState }));
                            }}
                        />
                        <StatusBadge enabled={enabled}>
                            {enabled ? 'Включено' : 'Выключено'}
                        </StatusBadge>
                    </EnabledToggle>

                    <CardTitle>
                        <FiTarget />
                        Русская рулетка (mute)
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
                    Бот будет мутить чатерсов, которые используют команды русской рулетки с заданным шансом на заданное время
                    <br /><br />
                    <span className="warning">⚠️ Внимание!</span> Если перезапустить приложение во время мута - роли чата (VIP, mod) не восстановятся.
                    <br /><br />
                    В сообщения можно вставлять переменные:<br />
                    <span className="highlight">${'{user}'}</span> - имя пользователя<br />
                    <span className="highlight">${'{random(1000,9999)}'}</span> - случайное число в диапазоне
                </CollapsedPreview>
            )}

            {isOpen && (
                <CardContent>
                    {/* Основные параметры */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiSettings />
                                Основные параметры
                            </SectionTitle>
                            <WarningBadge>
                                <FiAlertTriangle />
                                Роли не восстанавливаются после перезапуска
                            </WarningBadge>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <ParameterCard>
                                    <ParameterTitle>
                                        <FiClock />
                                        Время мута (сек)
                                    </ParameterTitle>
                                    <NumericEditorComponent
                                        width="150px"
                                        value={config.bot.roulette.muteDuration / 1000}
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
                                        Перезарядка (сек)
                                    </ParameterTitle>
                                    <NumericEditorComponent
                                        width="150px"
                                        value={config.bot.roulette.commandCooldown / 1000}
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
                                        Вероятность (%)
                                    </ParameterTitle>
                                    <NumericEditorComponent
                                        width="150px"
                                        value={config.bot.roulette.chance * 100}
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
                                    <span>Мьютить Редакторов</span>
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
                                Команды рулетки
                            </SectionTitle>
                        </SectionHeader>

                        <TagInput
                            value={config.bot.roulette.commands.join(", ")}
                            onChange={(value) => {
                                const commands = value.split(",").map((cmd) => cmd.trim()).filter(cmd => cmd);
                                updateRouletteConfig(() => ({ commands }));
                            }}
                            placeholder="Введите команды через запятую (например: !rr, !roulette, !русскаярулетка)"
                        />
                    </Section>

                    {/* Сообщения */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiMessageSquare />
                                Настройки сообщений
                            </SectionTitle>
                        </SectionHeader>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <SurvivalMessagesComponent selectedTheme={selectedTheme} apply={apply} />
                            <WinnerMessagesComponent selectedTheme={selectedTheme} apply={apply} />
                            <CooldownMessagesComponent selectedTheme={selectedTheme} apply={apply} />
                            <ProtectedUsersMessagesComponent selectedTheme={selectedTheme} apply={apply} />
                        </div>
                    </Section>
                </CardContent>
            )}
        </SettingsCard>
    );
}