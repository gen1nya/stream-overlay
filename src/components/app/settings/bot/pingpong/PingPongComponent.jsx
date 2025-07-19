import React, {useState, useCallback, Fragment} from 'react';
import styled from 'styled-components';
import {
    CollapsedPreview,
    SettingsBlockFull,
    SettingsBlockTitle,
    TitleRow,
    Triangle,
} from '../../SettingBloks';
import { mergeWithDefaults } from '../../../../utils/defaultBotConfig';
import Switch from '../../../../utils/Switch';
import { Row } from '../../../SettingsComponent';
import { Spacer } from '../../../../utils/Separator';
import PingPongActionEditorComponent from './PingPongActionEditorComponent';

// ────────────────────────────────────────────────────────────────────────────────
// Styled Elements
// ────────────────────────────────────────────────────────────────────────────────
const NameInput = styled.input`
  padding: 4px 8px;
  border: 1px solid ${({ $error }) => ($error ? 'red' : '#ccc')};
  border-radius: 4px;
  outline: none;
  width: 220px;
  &:focus {
    border-color: #888;
  }
`;

const AddButton = styled.button`
  margin-left: 8px;
  padding: 4px 12px;
  border-radius: 6px;
  background: rgba(136, 83, 242, 0.29);
  border: rgba(136, 83, 242, 0.64) 2px solid;
  color: #fff;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
  &:hover {
    opacity: 0.9;
  }
`;

// ────────────────────────────────────────────────────────────────────────────────
export default function PingPongComponent({ selectedTheme, apply }) {
    const config = mergeWithDefaults(selectedTheme);

    const [isOpen, setIsOpen] = useState(false);
    const [enabled, setEnabled] = useState(config.bot.pingpong.enabled);

    // ───────────── New‑command state ─────────────
    const [name, setName] = useState('');
    const [nameError, setNameError] = useState(false);

    const toggleOpen = () => setIsOpen((prev) => !prev);

    const addCommand = useCallback(() => {
        const trimmed = name.trim();
        const commands = mergeWithDefaults(selectedTheme).bot.pingpong.commands;
        const nameExists = commands.some((cmd) => cmd.name === trimmed);

        // Validate
        if (!trimmed || nameExists) {
            setNameError(true);
            return;
        }

        // Reset error & clear input
        setNameError(false);
        setName('');

        // Append new command
        apply((prev) => {
            const cfg = mergeWithDefaults(prev);
            return {
                ...cfg,
                bot: {
                    ...cfg.bot,
                    pingpong: {
                        ...cfg.bot.pingpong,
                        commands: [
                            ...cfg.bot.pingpong.commands,
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
                    },
                },
            };
        });
    }, [name, apply, selectedTheme]);

    return (
        <SettingsBlockFull>
            {/* ───── Header / Toggle ───── */}
            <SettingsBlockTitle as="div">
                <Row onClick={toggleOpen} style={{ cursor: 'pointer' }}>
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
                                        pingpong: {
                                            ...cfg.bot.pingpong,
                                            enabled: newState,
                                        },
                                    },
                                };
                            });
                        }}
                    />
                    <span>Пинг-Понг</span>
                    <Spacer />
                    <Triangle>{isOpen ? '▲' : '▼'}</Triangle>
                </Row>
            </SettingsBlockTitle>

            {/* ───── Collapsed preview ───── */}
            {!isOpen && (
                <CollapsedPreview onClick={toggleOpen} style={{ cursor: 'pointer' }}>
                  <span>
                    Бот будет отвечать на ключевые слова и команды (например !пинг)
                  </span>
                </CollapsedPreview>
            )}

            {/* ───── Expanded content ───── */}
            {isOpen && (
                <Fragment>
                    {/* Add‑command form */}
                    <TitleRow style={{ marginTop: '8px' }}>Добавить команду:</TitleRow>
                    <Row style={{ alignItems: 'center', margin: '0px 0 4px' }}>
                        <NameInput
                            placeholder="Название команды"
                            value={name}
                            $error={nameError}
                            onChange={(e) => {
                                setNameError(false);
                                setName(e.target.value);
                            }}
                        />
                        <AddButton onClick={addCommand}>Добавить</AddButton>
                    </Row>

                    {/* Existing commands editor */}
                    <PingPongActionEditorComponent
                        selectedTheme={selectedTheme}
                        apply={apply}
                    />
                </Fragment>
            )}
        </SettingsBlockFull>
    );
}
