import styled from "styled-components";
import { tokens } from "../../designSystem/tokens";
import Button from "../../designSystem/components/Button";

// Селектор темы/бота — кнопка-действие (открывает модалку), показывающая
// текущее значение. Делегирует на DS-примитив Button (neutral), сверху —
// компактный шрифт чипа + жирное значение и акцентная иконка.
export const ThemeIndicator = styled(Button).attrs({ $variant: 'neutral' })`
    font-size: 13px;
    font-weight: ${tokens.font.weight.regular};
    color: ${tokens.color.text.tertiary};

    .theme-name {
        font-weight: ${tokens.font.weight.semibold};
        color: ${tokens.color.text.primary};
    }

    svg {
        width: 14px;
        height: 14px;
        color: ${tokens.color.accent.primary};
    }
`;

export const Header = styled.div`
    box-sizing: border-box;
    padding: ${tokens.space.lg} ${tokens.space.xxl};
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: rgba(26, 26, 26, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid ${tokens.color.border.subtle};
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

export const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: ${tokens.space.lg};
`;

export const HeaderTitle = styled.h1`
    font-size: ${tokens.font.size.xxl};
    font-weight: ${tokens.font.weight.semibold};
    margin: 0;
    background: ${tokens.gradient.accent};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
`;

export const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: ${tokens.space.md};
`;


// Делегирует на DS-примитив Button (как ActionButton в SharedSettingsStyles).
// className-API ("primary"/"secondary") сохранён ради существующих call-site'ов
// тулбара и расширений styled(ActionButton); маппится в $variant.
const variantFromClass = (className = '') =>
    className.includes('primary') ? 'primary'
        : className.includes('danger') ? 'danger'
            : className.includes('secondary') ? 'secondary'
                : 'neutral';

export const ActionButton = styled(Button).attrs((p) => ({
    $variant: p.$variant || variantFromClass(p.className),
}))``;
