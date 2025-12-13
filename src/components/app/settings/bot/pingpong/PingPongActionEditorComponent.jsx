import React, {Fragment, useCallback} from 'react';
import styled from 'styled-components';
import {Row} from '../../../SettingsComponent';
import {Accordion} from '../../../../utils/AccordionComponent';
import Switch from '../../../../utils/Switch';
import {Spacer} from '../../../../utils/Separator';
import {FiTrash2} from 'react-icons/fi';
import {RemoveButton, TitleRow} from '../../SettingBloks';
import RadioGroup from '../../../../utils/TextRadioGroup';
import {SmallTemplateEditor} from '../../../../utils/SmallTemplateEditor';
import AddTrigger from "./AddTrigger";
import AddResponse from "./AddResponse";
import { useTranslation } from 'react-i18next';

// -----------------------------------------------------------------------------
// Styled‑components
// -----------------------------------------------------------------------------
export const TextInput = styled.input`
    flex: 1;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 16px;
    border: 1px solid ${({$error}) => ($error ? 'red' : '#ccc')};
`;

export const FlagsInput = styled(TextInput)`
    flex: initial;
    width: 150px;
`;

// Status indicator dot (green = enabled, red = disabled)
const StatusDot = styled.span`
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.$enabled ? '#44ff44' : '#ff4444'};
    box-shadow: 0 0 4px ${props => props.$enabled ? '#44ff44' : '#ff4444'};
    border: 1px solid ${props => props.$enabled ? '#33cc33' : '#cc3333'};
    margin-right: 8px;
    vertical-align: middle;
`;

export const Button = styled.button`
    margin-left: ${({$ml = 0}) => $ml}px;
    margin-top: ${({$mt = 0}) => $mt}px;
    padding: 4px 12px;
    border-radius: 4px;
    background: rgba(136, 83, 242, 0.29);
    border: rgba(136, 83, 242, 0.64) 2px solid
`;

// -----------------------------------------------------------------------------
// Helper for immutable config updates in one place
// -----------------------------------------------------------------------------
const updateConfig = (prev, updater) => {
    return updater(prev);
};


// -----------------------------------------------------------------------------
// Main editor component
// -----------------------------------------------------------------------------
export default function PingPongActionEditorComponent({botConfig, apply}) {
    const cfg = botConfig;
    const { t } = useTranslation();

    const removeCommand = useCallback(
        (commandIndex) => {
            apply((prev) => {
                const cfg = prev;
                const updatedCommands = cfg.pingpong.commands.filter((_, i) => i !== commandIndex);
                return {
                    ...cfg,
                    pingpong: {
                        ...cfg.pingpong,
                        commands: updatedCommands,
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
                    const commands = cfg.pingpong.commands.map((cmd, i) =>
                        i === commandIndex ? {...cmd, enabled: !cmd.enabled} : cmd,
                    );
                    return {
                        ...cfg,
                        pingpong: {...cfg.pingpong, commands},
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
                    const commands = cfg.pingpong.commands.map((cmd, i) =>
                        i === commandIndex ? {...cmd, ...patch} : cmd,
                    );
                    return {
                        ...cfg,
                        pingpong: {...cfg.pingpong, commands},
                    };
                }),
            );
        },
        [apply],
    );

    return (
        <Fragment>
            {cfg.pingpong.commands.map((command, commandIndex) => (
                <Row key={commandIndex}>
                    <Accordion
                        title={<><StatusDot $enabled={command.enabled} />{command.name || t('settings.bot.pingpong.action.untitled')}</>}
                        style={{width: '100%'}}
                    >
                        {/* Активность + удаление */}
                        <Row>
                            <span>{t('settings.bot.pingpong.action.active')}</span>
                            <Switch checked={command.enabled} onChange={() => toggleEnabled(commandIndex)}/>
                            <Spacer/>
                            <RemoveButton onClick={() => removeCommand(commandIndex)}>
                                <FiTrash2 size="24px" style={{cursor: 'pointer'}}/>
                            </RemoveButton>

                        </Row>

                        {/* Тип срабатывания */}
                        <Row>
                            <TitleRow>{t('settings.bot.pingpong.action.triggerType.label')}</TitleRow>
                            <RadioGroup
                                defaultSelected={command.triggerType}
                                items={[
                                    {key: 'exact', text: t('settings.bot.pingpong.action.triggerType.exact')},
                                    {key: 'start', text: t('settings.bot.pingpong.action.triggerType.start')},
                                    {key: 'contains', text: t('settings.bot.pingpong.action.triggerType.contains')},
                                ]}
                                direction="horizontal"
                                itemWidth="120px"
                                onChange={(value) => patchCommand(commandIndex, {triggerType: value})}
                            />
                        </Row>

                        {/* Триггеры */}
                        <Accordion title={t('settings.bot.pingpong.action.triggers')}>
                            {command.triggers.map((trigger, triggerIndex) => (
                                <Fragment key={triggerIndex}>
                                    {trigger.type === 'regex' ? (
                                        <div>
                                            <label>{t('settings.bot.pingpong.action.regex')}</label>
                                            <Row>
                                                <SmallTemplateEditor
                                                    hideDelete
                                                    type="text"
                                                    value={trigger.value}
                                                    onChange={(e) => {
                                                        const value = e;
                                                        patchCommand(commandIndex, {
                                                            triggers: command.triggers.map((t, i) =>
                                                                i === triggerIndex ? {...t, value} : t,
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
                                                                i === triggerIndex ? {...t, flags} : t,
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
                                            <label>{t('settings.bot.pingpong.action.text')}</label>
                                            <SmallTemplateEditor
                                                hideDelete={false}
                                                type="text"
                                                value={trigger.value}
                                                onChange={(e) => {
                                                    const text = e;
                                                    patchCommand(commandIndex, {
                                                        triggers: command.triggers.map((t, i) =>
                                                            i === triggerIndex ? {...t, value: text} : t,
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
                        <Accordion title={t('settings.bot.pingpong.action.responsesTitle')}>
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