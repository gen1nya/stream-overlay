import styled, { css } from 'styled-components';
import { tokens } from '../tokens';

/**
 * Стеклянный блик поверх сплошной заливки. Для кнопок-расширителей
 * (`styled(Button)`/`styled(ActionButton)`), которые задают СВОЙ цвет, но
 * должны сохранить «стекло» примитива и в покое, и на ховере — иначе сплошной
 * `background:` перекрывает градиент-блик примитива (плоско в покое).
 * Border задаёт сам расширитель.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const glassFill = (fill, hover = fill) => css`
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 64%),
        ${fill};

    &:hover:not(:disabled) {
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 64%),
            ${hover};
    }
`;

const raisedButton = ({ fill, hover, border, glow, hoverGlow, activeGlow, drop = '0 8px 18px rgba(0, 0, 0, 0.3)' }) => css`
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 64%),
        ${fill};
    border-color: ${border};
    box-shadow:
        inset 0 1px 0 ${tokens.color.highlight.soft},
        ${drop},
        0 0 18px ${glow};

    &:hover:not(:disabled) {
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 64%),
            ${hover};
        border-color: ${border};
        box-shadow:
            inset 0 1px 0 ${tokens.color.highlight.soft},
            0 10px 22px rgba(0, 0, 0, 0.36),
            0 0 24px ${hoverGlow};
        transform: translateY(-1px);
    }

    &:active:not(:disabled) {
        transform: translateY(0);
        box-shadow:
            inset 0 1px 0 ${tokens.color.highlight.faint},
            0 4px 12px rgba(0, 0, 0, 0.28),
            0 0 12px ${activeGlow};
    }
`;

const neutralStyles = raisedButton({
    fill: tokens.color.fillMuted.neutral,
    hover: tokens.color.fillMuted.neutralHover,
    border: tokens.color.border.default,
    glow: 'rgba(100, 108, 255, 0.04)',
    hoverGlow: 'rgba(100, 108, 255, 0.08)',
    activeGlow: 'rgba(100, 108, 255, 0.04)',
    drop: '0 7px 16px rgba(0, 0, 0, 0.26)',
});

const variantStyles = {
    primary: raisedButton({
        fill: tokens.color.fillMuted.primary,
        hover: tokens.color.fillMuted.primaryHover,
        border: tokens.color.accent.softBorder,
        glow: 'rgba(100, 108, 255, 0.3)',
        hoverGlow: 'rgba(100, 108, 255, 0.45)',
        activeGlow: 'rgba(100, 108, 255, 0.22)',
    }),
    secondary: raisedButton({
        fill: tokens.color.fillMuted.secondary,
        hover: tokens.color.fillMuted.secondaryHover,
        border: tokens.color.success.softBorder,
        glow: 'rgba(16, 185, 129, 0.2)',
        hoverGlow: 'rgba(16, 185, 129, 0.32)',
        activeGlow: 'rgba(16, 185, 129, 0.16)',
    }),
    danger: raisedButton({
        fill: tokens.color.fillMuted.danger,
        hover: tokens.color.fillMuted.dangerHover,
        border: tokens.color.danger.softBorder,
        glow: 'rgba(220, 53, 69, 0.2)',
        hoverGlow: 'rgba(220, 53, 69, 0.34)',
        activeGlow: 'rgba(220, 53, 69, 0.16)',
    }),
    ghost: raisedButton({
        fill: tokens.color.fillMuted.ghost,
        hover: tokens.color.fillMuted.ghostHover,
        border: tokens.color.fillMuted.ghostBorder,
        glow: 'rgba(100, 108, 255, 0.08)',
        hoverGlow: 'rgba(100, 108, 255, 0.18)',
        activeGlow: 'rgba(100, 108, 255, 0.08)',
        drop: '0 5px 12px rgba(0, 0, 0, 0.18)',
    }),
    neutral: neutralStyles,
    default: neutralStyles,
};

const sizeStyles = {
    sm: css`
        padding: calc(${tokens.space.sm} - 2px) ${tokens.space.md};
        font-size: ${tokens.font.size.xs};
    `,
    md: css`
        padding: calc(${tokens.space.sm} + 2px) ${tokens.space.lg};
        font-size: ${tokens.font.size.base};
    `,
};

const Button = styled.button`
    box-sizing: border-box;
    width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${tokens.space.sm};
    color: ${tokens.color.text.primary};
    border: 1px solid;
    border-radius: ${tokens.radius.lg};
    font-family: ${tokens.font.family.base};
    font-weight: ${tokens.font.weight.medium};
    line-height: ${tokens.font.lineHeight.base};
    cursor: pointer;
    transition: ${tokens.transition.base};

    ${({ $size = 'md' }) => sizeStyles[$size] || sizeStyles.md}
    ${({ $variant = 'neutral' }) => variantStyles[$variant] || neutralStyles}

    &:focus-visible {
        outline: none;
        border-color: ${tokens.color.accent.primary};
        box-shadow:
            inset 0 1px 0 ${tokens.color.highlight.soft},
            0 0 0 3px ${tokens.color.accent.softBorder},
            0 0 18px ${tokens.color.accent.softBorder};
    }

    &:disabled {
        opacity: 0.38;
        box-shadow: none;
        cursor: not-allowed;
        transform: none;
    }

    svg {
        width: ${tokens.space.lg};
        height: ${tokens.space.lg};
        flex: 0 0 auto;
        vertical-align: middle;
    }
`;

export default Button;
