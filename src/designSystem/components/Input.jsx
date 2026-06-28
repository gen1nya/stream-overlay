import styled, { css } from 'styled-components';
import { tokens } from '../tokens';

const errorStyles = css`
    background: ${tokens.color.danger.soft};
    border-color: ${tokens.color.danger.base};
`;

export const Input = styled.input`
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding: ${tokens.space.md} ${tokens.space.lg};
    background: ${tokens.color.bg.surface};
    border: 1px solid ${({ $error }) => ($error ? tokens.color.danger.base : tokens.color.border.default)};
    border-radius: ${tokens.radius.lg};
    color: ${tokens.color.text.primary};
    font-family: ${tokens.font.family.base};
    font-size: ${tokens.font.size.base};
    line-height: ${tokens.font.lineHeight.base};
    transition: ${tokens.transition.base};

    ${({ $error }) => $error && errorStyles}

    &::placeholder {
        color: ${tokens.color.text.muted};
    }

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

export default Input;
