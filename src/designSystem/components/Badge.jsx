import styled, { css } from 'styled-components';
import { tokens } from '../tokens';

const variants = {
    info: css`
        background: ${tokens.color.accent.soft};
        border-color: ${tokens.color.accent.softBorder};
        color: ${tokens.color.accent.primary};
    `,
    warning: css`
        background: ${tokens.color.warning.soft};
        border-color: ${tokens.color.warning.softBorder};
        color: ${tokens.color.warning.text};
    `,
    success: css`
        background: ${tokens.color.success.soft};
        border-color: ${tokens.color.success.softBorder};
        color: ${tokens.color.success.text};
    `,
    danger: css`
        background: ${tokens.color.danger.soft};
        border-color: ${tokens.color.danger.softBorder};
        color: ${tokens.color.danger.text};
    `,
};

const Badge = styled.div`
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: ${tokens.space.xs} ${tokens.space.sm};
    border: 1px solid;
    border-radius: ${tokens.radius.md};
    font-family: ${tokens.font.family.base};
    font-size: ${tokens.font.size.xs};
    line-height: ${tokens.font.lineHeight.base};
    white-space: nowrap;

    ${({ $variant = 'info' }) => variants[$variant] || variants.info}
`;

export default Badge;
