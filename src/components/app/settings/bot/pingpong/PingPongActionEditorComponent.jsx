import React, { useCallback, useState, Fragment } from 'react';
import styled from 'styled-components';
import { mergeWithDefaults } from '../../../../utils/defaultBotConfig';
import { Row } from '../../../SettingsComponent';
import { Accordion } from '../../../../utils/AccordionComponent';
import Switch from '../../../../utils/Switch';
import { Spacer } from '../../../../utils/Separator';
import { FiTrash2 } from 'react-icons/fi';
import {RemoveButton, TitleRow} from '../../SettingBloks';
import RadioGroup from '../../../../utils/TextRadioGroup';
import { SmallTemplateEditor } from '../../../../utils/SmallTemplateEditor';
import AddTrigger from "./AddTrigger";
import AddResponse from "./AddResponse";

// -----------------------------------------------------------------------------
// Styled‑components
// -----------------------------------------------------------------------------
export const TextInput = styled.input`
  flex: 1;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 16px;
  border: 1px solid ${({ $error }) => ($error ? 'red' : '#ccc')};
`;

export const FlagsInput = styled(TextInput)`
  flex: initial;
  width: 150px;
`;

export const Button = styled.button`
  margin-left: ${({ $ml = 0 }) => $ml}px;
  margin-top: ${({ $mt = 0 }) => $mt}px;
  padding: 4px 12px;
  border-radius: 4px;
  background: rgba(136, 83, 242, 0.29);
  border: rgba(136, 83, 242, 0.64) 2px solid
`;

// -----------------------------------------------------------------------------
// Helper for immutable config updates in one place
// -----------------------------------------------------------------------------
const updateConfig = (prev, updater) => {
    const cfg = mergeWithDefaults(prev);
    return updater(cfg);
};


// -----------------------------------------------------------------------------
// Main editor component
// -----------------------------------------------------------------------------
export default function PingPongActionEditorComponent({ selectedTheme, apply }) {
    const cfg = mergeWithDefaults(selectedTheme);

    const removeCommand = useCallback(
        (commandIndex) => {
            apply((prev) => {
                const cfg = mergeWithDefaults(prev);
                const updatedCommands = cfg.bot.pingpong.commands.filter((_, i) => i !== commandIndex);
                return {
                    ...cfg,
                    bot: {
                        ...cfg.bot,
                        pingpong: {
                            ...cfg.bot.pingpong,
                            commands: updatedCommands,
                        },
                    },
                };
            });
        },
        [apply]
    );


    const toggleEnabled = useCallback(
        (commandIndex) => {
            apply((prev) =>
                updateConfig(prev, (cfg) => {
                    const commands = cfg.bot.pingpong.commands.map((cmd, i) =>
                        i === commandIndex ? { ...cmd, enabled: !cmd.enabled } : cmd,
                    );
                    return {
                        ...cfg,
                        bot: { ...cfg.bot, pingpong: { ...cfg.bot.pingpong, commands } },
                    };
                }),
            );
        },
        [apply],
    );

    const patchCommand = useCallback(
        (commandIndex, patch) => {
            apply((prev) =>
                updateConfig(prev, (cfg) => {
                    const commands = cfg.bot.pingpong.commands.map((cmd, i) =>
                        i === commandIndex ? { ...cmd, ...patch } : cmd,
                    );
                    return {
                        ...cfg,
                        bot: { ...cfg.bot, pingpong: { ...cfg.bot.pingpong, commands } },
                    };
                }),
            );
        },
        [apply],
    );

    return (
        <Fragment>
            {cfg.bot.pingpong.commands.map((command, commandIndex) => (
                <Row key={commandIndex}>
                    <Accordion title={ (command.enabled ? "✅" : "⛔") + command.name || 'Без имени'} style={{ width: '100%' }}>
                        {/* Активность + удаление */}
                        <Row>
                            <span>Активно:</span>
                            <Switch checked={command.enabled} onChange={() => toggleEnabled(commandIndex)} />
                            <Spacer />
                            <RemoveButton onClick={() => removeCommand(commandIndex)} >
                                <FiTrash2 size="24px" style={{ cursor: 'pointer'}} />
                            </RemoveButton>

                        </Row>

                        {/* Тип срабатывания */}
                        <Row>
                            <TitleRow>Тип срабатывания:</TitleRow>
                            <RadioGroup
                                defaultSelected={command.triggerType}
                                items={[
                                    { key: 'exact', text: 'точно' },
                                    { key: 'start', text: 'в начале' },
                                    { key: 'contains', text: 'где угодно' },
                                ]}
                                direction="horizontal"
                                itemWidth="120px"
                                onChange={(value) => patchCommand(commandIndex, { triggerType: value })}
                            />
                        </Row>

                        {/* Триггеры */}
                        <Accordion title="Триггеры">
                            {command.triggers.map((trigger, triggerIndex) => (
                                <Fragment key={triggerIndex}>
                                    {trigger.type === 'regex' ? (
                                        <div>
                                            <label>RegEx</label>
                                            <Row>
                                                <SmallTemplateEditor
                                                    hideDelete
                                                    type="text"
                                                    value={trigger.value}
                                                    onChange={(e) => {
                                                        const value = e;
                                                        patchCommand(commandIndex, {
                                                            triggers: command.triggers.map((t, i) =>
                                                                i === triggerIndex ? { ...t, value } : t,
                                                            ),
                                                        });
                                                    }}
                                                />
                                                <SmallTemplateEditor
                                                    width="150px"
                                                    type="text"
                                                    value={trigger.flags}
                                                    onChange={(e) => {
                                                        const flags = e;
                                                        patchCommand(commandIndex, {
                                                            triggers: command.triggers.map((t, i) =>
                                                                i === triggerIndex ? { ...t, flags } : t,
                                                            ),
                                                        });
                                                    }}
                                                    onDelete={() =>
                                                        patchCommand(commandIndex, {
                                                            triggers: command.triggers.filter((_, i) => i !== triggerIndex),
                                                        })
                                                    }
                                                />
                                            </Row>
                                        </div>
                                    ) : (
                                        <div>
                                            <label>Текст</label>
                                            <SmallTemplateEditor
                                                hideDelete={false}
                                                type="text"
                                                value={trigger.value}
                                                onChange={(e) => {
                                                    const text = e;
                                                    patchCommand(commandIndex, {
                                                        triggers: command.triggers.map((t, i) =>
                                                            i === triggerIndex ? { ...t, value: text } : t,
                                                        ),
                                                    });
                                                }}
                                                onDelete={() =>
                                                    patchCommand(commandIndex, {
                                                        triggers: command.triggers.filter((_, i) => i !== triggerIndex),
                                                    })
                                                }
                                            />
                                        </div>
                                    )}
                                </Fragment>
                            ))}

                            <AddTrigger
                                commandIndex={commandIndex}
                                apply={apply}
                                updateConfig={updateConfig}
                            />
                        </Accordion>

                        {/* Ответы */}
                        <Accordion title="Ответы (выбирается случайный)">
                            {command.responses.map((response, responseIndex) => (
                                <SmallTemplateEditor
                                    key={responseIndex}
                                    value={response}
                                    onChange={(value) =>
                                        patchCommand(commandIndex, {
                                            responses: command.responses.map((r, i) => (i === responseIndex ? value : r)),
                                        })
                                    }
                                    onDelete={() =>
                                        patchCommand(commandIndex, {
                                            responses: command.responses.filter((_, i) => i !== responseIndex),
                                        })
                                    }
                                />
                            ))}

                            <AddResponse
                                commandIndex={commandIndex}
                                apply={apply}
                                updateConfig={updateConfig}
                            />
                        </Accordion>
                    </Accordion>
                </Row>
            ))}
        </Fragment>
    );
}