import React from 'react';
import styled from 'styled-components';
import { tokens } from '../../designSystem/tokens';

const SwitchLabel = styled.label`
    position: relative;
    display: inline-block;
    margin-top: ${tokens.space.xs};
    width: 52px;
    height: 28px;
`;

const SwitchInput = styled.input`
    opacity: 0;
    width: 0;
    height: 0;
`;

const SwitchSlider = styled.span`
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({ checked }) => (checked ? tokens.color.accent.primary : '#3A3A3A')};
    transition: ${tokens.transition.base};
    border-radius: ${tokens.radius.lg};
    border: 1px solid ${({ checked }) => (checked ? tokens.color.accent.primary : tokens.color.border.strong)};

    &:hover {
        background-color: ${({ checked }) => (checked ? tokens.color.accent.primary : tokens.color.border.default)};
    }

    &::before {
        content: '';
        position: absolute;
        height: 20px;
        width: 20px;
        left: 4px;
        bottom: 3px;
        background-color: ${({ checked }) => (checked ? '#E8F4FD' : '#CCCCCC')};
        border-radius: ${tokens.radius.sm};
        transition: ${tokens.transition.base};
        transform: ${({ checked }) => (checked ? 'translateX(24px)' : 'translateX(0)')};
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    &:active::before {
        width: 22px;
    }
`;

const Switch = ({ checked, onChange, ...props }) => (
    <SwitchLabel>
        <SwitchInput type="checkbox" checked={checked} onChange={onChange} {...props} />
        <SwitchSlider checked={checked} />
    </SwitchLabel>
);

export default Switch;
