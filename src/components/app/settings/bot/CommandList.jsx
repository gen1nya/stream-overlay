import React, { useState } from 'react'
import {
    MediumSecondaryButton,
    RemoveButton,
} from '../SettingBloks'
import styled from 'styled-components'
import {Accordion} from "../../../utils/AccordionComponent";
import {FiTrash2} from "react-icons/fi";
import {Row} from "../../SettingsComponent";
import {Spacer} from "../../../utils/Separator";
import { useTranslation } from 'react-i18next';

const CommandListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StyledInput = styled.input`
  margin-left: 0.5rem;
  background: #111;
  border: 1px solid #333;
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
`;

export function CommandList() {
    const { t } = useTranslation();
    const [commands, setCommands] = useState([])

    const addCommand = () => {
        const newCommand = {
            id: crypto.randomUUID(),
            name: t('settings.bot.commandList.newCommand'),
            trigger: '!new',
            enabled: true,
            actions: [],
        }
        setCommands(prev => [...prev, newCommand])
    }

    const toggleCommand = (id) => {
        setCommands(prev =>
            prev.map(cmd =>
                cmd.id === id ? { ...cmd, enabled: !cmd.enabled } : cmd
            )
        )
    }

    const updateTrigger = (id, value) => {
        setCommands(prev =>
            prev.map(cmd =>
                cmd.id === id ? { ...cmd, trigger: value } : cmd
            )
        )
    }

    const removeCommand = (id) => {
        setCommands(prev => prev.filter(cmd => cmd.id !== id))
    }

    return (
        <CommandListWrapper>
            {commands.map(cmd => (
                <Accordion key={cmd.id} title={cmd.trigger || t('settings.bot.commandList.noTrigger')}>

                    <Row>
                        <input
                            type="checkbox"
                            checked={cmd.enabled}
                            onChange={() => toggleCommand(cmd.id)}
                        />
                        {t('settings.bot.commandList.enabled')}
                    </Row>

                    <Row>
                        {t('settings.bot.commandList.trigger')}
                        <StyledInput
                            type="text"
                            value={cmd.trigger}
                            onChange={e => updateTrigger(cmd.id, e.target.value)}
                        />
                    </Row>

                    <Row>
                        <Spacer/>
                        <RemoveButton
                            onClick={() => removeCommand(cmd.id)}>
                            <FiTrash2 size={24}/>
                        </RemoveButton>
                    </Row>

                </Accordion>
            ))}

            <MediumSecondaryButton onClick={addCommand}>
                {t('settings.bot.commandList.addCommand')}
            </MediumSecondaryButton>
        </CommandListWrapper>
    )
}
