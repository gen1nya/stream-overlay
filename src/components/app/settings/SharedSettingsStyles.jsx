import { createElement, forwardRef, useContext, useState } from 'react';
import styled, { css } from 'styled-components';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { tokens } from '../../../designSystem/tokens';
import Button from '../../../designSystem/components/Button';
import { FeatureContext } from '../../../designSystem/FeatureContext';

// Фиче-тонировка хедера карточки (по группе раздела). Тинт + акцент-бар живут
// в ::before-оверлее ПОД контентом и ПОД собственным фоном хедера (z-index:-1 в
// изолированном контексте) — поэтому ховер, меняющий background, его НЕ стирает.
// Акцент-бар через inset box-shadow, чтобы шёл по скруглению (overflow:hidden).
const featureHeaderTint = ($feature) => {
    const f = tokens.color.feature[$feature];
    if (!f) return '';
    return css`
        position: relative;
        isolation: isolate;
        border-bottom-color: ${f.softBorder};

        &::before {
            content: '';
            position: absolute;
            inset: 0;
            z-index: -1;
            pointer-events: none;
            border-radius: inherit;
            background:
                linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0) 62%),
                linear-gradient(90deg, ${f.soft} 0%, rgba(30, 30, 30, 0) 82%);
            box-shadow:
                inset 3px 0 0 ${f.base},
                inset 0 1px 0 ${tokens.color.highlight.soft},
                0 0 22px ${f.soft};
        }
    `;
};

// Основная карточка настроек
export const SettingsCard = styled.div`
    width: calc(100% - ${tokens.space.xxl});
    margin: ${tokens.space.md} ${tokens.space.md} 0 ${tokens.space.md};
    background: ${tokens.gradient.surface};
    border: 1px solid ${tokens.color.border.subtle};
    border-radius: ${tokens.radius.xxl};
    padding: 0;
    display: flex;
    flex-direction: column;
    box-shadow: ${tokens.shadow.md};
    transition: ${tokens.transition.slow};
    overflow: hidden;

    &:hover {
        transform: translateY(-1px);
        box-shadow: ${tokens.shadow.lg};
        border-color: ${tokens.color.border.default};
    }
`;

// Заголовок карточки (база). Тонируется по $feature; обёртка ниже берёт
// группу из FeatureContext, поэтому разделы окрашиваются сами.
const CardHeaderBase = styled.div`
    padding: ${tokens.space.xl} ${tokens.space.xxl} ${tokens.space.lg};
    background: ${tokens.gradient.raised};
    border-bottom: 1px solid ${tokens.color.border.default};
    display: flex;
    align-items: center;
    gap: ${tokens.space.md};

    ${({ $feature }) => featureHeaderTint($feature)}
`;

// Явный $feature перебивает контекст; иначе берём группу активного раздела.
export const CardHeader = forwardRef((props, ref) => {
    const ctx = useContext(FeatureContext);
    const { $feature, ...rest } = props;
    return createElement(CardHeaderBase, { ref, $feature: $feature ?? ctx, ...rest });
});
CardHeader.displayName = 'CardHeader';

// Заголовок карточки (база) — иконка красится в цвет группы.
const CardTitleBase = styled.h3`
    margin: 0;
    font-size: ${tokens.font.size.xl};
    font-weight: ${tokens.font.weight.semibold};
    color: ${tokens.color.text.primary};
    display: flex;
    align-items: center;
    gap: 10px;

    /* Только прямая иконка заголовка красится в цвет группы — вложенные svg
       (бейджи в строке заголовка) сохраняют собственный цвет. */
    & > svg {
        width: ${tokens.space.xl};
        height: ${tokens.space.xl};
        color: ${({ $feature }) => tokens.color.feature[$feature]?.base || tokens.color.accent.primary};
    }
`;

export const CardTitle = forwardRef((props, ref) => {
    const ctx = useContext(FeatureContext);
    const { $feature, ...rest } = props;
    return createElement(CardTitleBase, { ref, $feature: $feature ?? ctx, ...rest });
});
CardTitle.displayName = 'CardTitle';

// Подзаголовок карточки
export const CardSubtitle = styled.span`
    font-size: ${tokens.font.size.md};
    color: ${tokens.color.text.muted};
    font-weight: ${tokens.font.weight.regular};
    margin-left: auto;
`;

// Контент карточки
export const CardContent = styled.div`
    padding: ${tokens.space.xxl};
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.xl};
`;

// — Сворачиваемая карточка (примитив) ——————————————————————————————————————
// Один источник коллапса/тоггла/превью вместо локальных CollapsibleHeader в
// каждом компоненте. Хедер кликабелен; контрол в заголовке (Switch/бейдж/help)
// не схлопывает карточку (stopPropagation). Тинт берётся из FeatureContext.
const CollapsibleCardHeader = styled(CardHeader)`
    cursor: pointer;
    user-select: none;
    transition: ${tokens.transition.base};

    &:hover {
        background: ${tokens.gradient.raisedAlt};
    }
`;

const HeaderRight = styled.div`
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: ${tokens.space.md};
`;

const HeaderSubtitle = styled.span`
    font-size: ${tokens.font.size.md};
    color: ${tokens.color.text.muted};
`;

const HeaderControl = styled.div`
    display: flex;
    align-items: center;
    gap: ${tokens.space.sm};
`;

const CollapseChevron = styled.span`
    display: inline-flex;
    align-items: center;
    color: ${tokens.color.text.faint};

    svg {
        width: 18px;
        height: 18px;
    }
`;

// Превью свёрнутого состояния (кликом разворачивается).
const CollapsedPreview = styled.div`
    padding: ${tokens.space.lg} ${tokens.space.xxl};
    color: ${tokens.color.text.tertiary};
    font-size: ${tokens.font.size.md};
    line-height: 1.5;
    cursor: pointer;
    transition: ${tokens.transition.base};

    &:hover {
        background: ${tokens.color.scrim.panel};
    }

    .highlight {
        color: ${tokens.color.accent.primary};
        font-weight: ${tokens.font.weight.medium};
    }
`;

export const CollapsibleCard = forwardRef(function CollapsibleCard(
    {
        title,
        icon,
        subtitle,
        headerControl,
        feature,
        defaultOpen = false,
        open,
        onToggle,
        preview,
        children,
        className,
        ...rest
    },
    ref,
) {
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;

    const toggle = () => {
        const next = !isOpen;
        if (!isControlled) setInternalOpen(next);
        if (onToggle) onToggle(next);
    };

    return (
        <SettingsCard ref={ref} className={className} {...rest}>
            <CollapsibleCardHeader
                $feature={feature}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={toggle}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggle();
                    }
                }}
            >
                <CardTitle $feature={feature}>
                    {icon}
                    {title}
                </CardTitle>
                <HeaderRight>
                    {subtitle ? <HeaderSubtitle>{subtitle}</HeaderSubtitle> : null}
                    {headerControl ? (
                        <HeaderControl onClick={(e) => e.stopPropagation()}>
                            {headerControl}
                        </HeaderControl>
                    ) : null}
                    <CollapseChevron>{isOpen ? <FiChevronUp /> : <FiChevronDown />}</CollapseChevron>
                </HeaderRight>
            </CollapsibleCardHeader>

            {isOpen
                ? children
                : preview != null
                    ? <CollapsedPreview onClick={toggle}>{preview}</CollapsedPreview>
                    : null}
        </SettingsCard>
    );
});
CollapsibleCard.displayName = 'CollapsibleCard';

// Секция внутри карточки
export const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.md};
`;

// Заголовок секции
export const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${tokens.space.sm};
    margin-bottom: ${tokens.space.sm};
    padding-bottom: ${tokens.space.sm};
    border-bottom: 1px solid ${tokens.color.border.subtle};
`;

// Заголовок секции
export const SectionTitle = styled.h4`
    margin: 0;
    font-size: ${tokens.font.size.lg};
    font-weight: ${tokens.font.weight.medium};
    color: ${tokens.color.text.secondary};
    display: flex;
    align-items: center;
    gap: ${tokens.space.sm};

    svg {
        width: ${tokens.space.lg};
        height: ${tokens.space.lg};
        color: ${tokens.color.text.faint};
    }
`;

// Секция с вкладками (более выраженная)
export const TabSection = styled.div`
    background: ${tokens.color.scrim.panel};
    border: 1px solid ${tokens.color.border.subtle};
    border-radius: ${tokens.radius.xl};
    overflow: hidden;
`;

// Заголовок вкладки
export const TabHeader = styled.div`
    padding: ${tokens.space.lg} ${tokens.space.xl};
    background: ${tokens.gradient.raisedAlt};
    border-bottom: 1px solid ${tokens.color.border.default};
    display: flex;
    align-items: center;
    gap: 10px;
`;

// Заголовок вкладки
export const TabTitle = styled.h4`
    margin: 0;
    font-size: ${tokens.font.size.lg};
    font-weight: ${tokens.font.weight.semibold};
    color: ${tokens.color.text.primary};
    display: flex;
    align-items: center;
    gap: ${tokens.space.sm};

    svg {
        width: ${tokens.space.lg};
        height: ${tokens.space.lg};
        color: ${tokens.color.text.faint};
    }
`;

// Контент вкладки
export const TabContent = styled.div`
    padding: ${tokens.space.xl};
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.lg};
`;

// Группа контролов
export const ControlGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.sm};
    min-width: 0;
    flex: ${({flex = "0 0 auto"}) => flex};
`;

// Информационный бейдж
export const InfoBadge = styled.div`
    display: inline-flex;
    align-items: center;
    padding: ${tokens.space.xs} ${tokens.space.sm};
    background: ${tokens.color.accent.soft};
    border: 1px solid ${tokens.color.accent.softBorder};
    border-radius: ${tokens.radius.md};
    font-size: 0.8rem;
    color: ${tokens.color.accent.primary};
    white-space: nowrap;
`;

// Предупреждающий бейдж
export const WarningBadge = styled(InfoBadge)`
    background: ${tokens.color.warning.soft};
    border-color: ${tokens.color.warning.softBorder};
    color: ${tokens.color.warning.text};
`;

// Успешный бейдж
export const SuccessBadge = styled(InfoBadge)`
    background: ${tokens.color.success.soft};
    border-color: ${tokens.color.success.softBorder};
    color: ${tokens.color.success.text};
`;

// Опасный бейдж
export const DangerBadge = styled(InfoBadge)`
    background: ${tokens.color.danger.soft};
    border-color: ${tokens.color.danger.softBorder};
    color: ${tokens.color.danger.text};
`;

// Кастомный скроллбар для контейнеров
export const ScrollableContainer = styled.div`
    overflow-y: auto;
    max-height: ${({maxHeight = "400px"}) => maxHeight};

    /* Custom scrollbar */
    &::-webkit-scrollbar {
        width: ${tokens.space.sm};
    }

    &::-webkit-scrollbar-track {
        background: ${tokens.color.bg.base};
        border-radius: ${tokens.radius.sm};
    }

    &::-webkit-scrollbar-thumb {
        background: ${tokens.color.border.default};
        border-radius: ${tokens.radius.sm};
    }

    &::-webkit-scrollbar-thumb:hover {
        background: ${tokens.color.border.strong};
    }
`;

// Разделительная линия
export const Divider = styled.div`
    height: 1px;
    background: ${tokens.gradient.divider};
    margin: ${({margin = `${tokens.space.lg} 0`}) => margin};
`;

// Контейнер для кнопок действий
export const ActionButtonContainer = styled.div`
    display: flex;
    gap: ${tokens.space.md};
    align-items: center;
    flex-wrap: wrap;

    @media (max-width: 768px) {
        gap: ${tokens.space.sm};
    }
`;

// Базовая кнопка действия — делегирует на примитив Button (ДС).
// className-API ("primary"/"secondary"/"danger") сохранён ради существующих
// call-site'ов и расширений styled(ActionButton); маппится в $variant.
const variantFromClass = (className = '') =>
    className.includes('primary') ? 'primary'
        : className.includes('danger') ? 'danger'
            : className.includes('secondary') ? 'secondary'
                : 'neutral';

export const ActionButton = styled(Button).attrs((p) => ({
    $variant: p.$variant || variantFromClass(p.className),
}))``;

// Вспомогательный текст
export const HelperText = styled.p`
    font-size: ${tokens.font.size.sm};
    color: ${tokens.color.text.faint};
    margin: 0;
    line-height: ${tokens.font.lineHeight.base};

    &.error {
        color: ${tokens.color.danger.text};
    }

    &.success {
        color: ${tokens.color.success.text};
    }

    &.warning {
        color: ${tokens.color.warning.text};
    }
`;
