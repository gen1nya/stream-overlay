import styled, { css } from 'styled-components';
import { tokens } from '../tokens';

const errorStyles = css`
    background-color: ${tokens.color.danger.soft};
    border-color: ${tokens.color.danger.base};
`;

export const Select = styled.select`
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding: ${tokens.space.md} calc(${tokens.space.xxxl} + ${tokens.space.sm}) ${tokens.space.md} ${tokens.space.lg};
    appearance: none;
    background-color: ${tokens.color.bg.surface};
    background-image:
        linear-gradient(45deg, transparent 50%, ${tokens.color.text.muted} 50%),
        linear-gradient(135deg, ${tokens.color.text.muted} 50%, transparent 50%);
    background-position:
        calc(100% - ${tokens.space.xl}) 50%,
        calc(100% - ${tokens.space.lg}) 50%;
    background-size: ${tokens.space.sm} ${tokens.space.sm}, ${tokens.space.sm} ${tokens.space.sm};
    background-repeat: no-repeat;
    border: 1px solid ${({ $error }) => ($error ? tokens.color.danger.base : tokens.color.border.default)};
    border-radius: ${tokens.radius.lg};
    color: ${tokens.color.text.primary};
    font-family: ${tokens.font.family.base};
    font-size: ${tokens.font.size.base};
    line-height: ${tokens.font.lineHeight.base};
    transition: ${tokens.transition.base};
    cursor: pointer;

    ${({ $error }) => $error && errorStyles}

    &:hover:not(:disabled) {
        border-color: ${({ $error }) => ($error ? tokens.color.danger.base : tokens.color.border.strong)};
    }

    &:focus {
        outline: none;
        border-color: ${({ $error }) => ($error ? tokens.color.danger.base : tokens.color.accent.primary)};
        box-shadow: ${tokens.shadow.focus};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        color: ${tokens.color.text.disabled};
    }
`;

export default Select;
