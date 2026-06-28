import React from 'react';
import styled from 'styled-components';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import { tokens } from '../tokens';
import { CardHeader, CardTitle, CardContent } from './Card';
import Button from './Button';

/**
 * Modal — примитивы chrome модального окна для оболочки.
 *
 * Граница ответственности: примитивы рендерят ТОЛЬКО карточку модалки
 * (контейнер + header/body/footer/close). Оверлей (backdrop, центрирование,
 * z-index-стек, Escape, scroll-lock, live-render детей для фикса каретки)
 * остаётся за `Portal`/`PortalContext`. Каноничный паттерн:
 *
 *   {open && (
 *     <Portal id="my-modal" onClose={close}>
 *       <Modal>
 *         <ModalHeader $feature="bot">
 *           <ModalTitle $feature="bot"><FiIcon/>Заголовок</ModalTitle>
 *           <ModalClose onClick={close} />
 *         </ModalHeader>
 *         <ModalBody>…</ModalBody>
 *         <ModalFooter>
 *           <Button $variant="ghost" onClick={close}>Отмена</Button>
 *           <Button $variant="primary" onClick={save}>Сохранить</Button>
 *         </ModalFooter>
 *       </Modal>
 *     </Portal>
 *   )}
 *
 * Визуально зеркалит обновлённый Card («Raised Glow muted») — те же поверхности
 * и токены, но без hover-lift (это контейнер, а не интерактивная карточка).
 */

// — Контейнер ————————————————————————————————————————————————————————————
export const Modal = styled.div`
    box-sizing: border-box;
    width: ${({ $width }) => $width || '100%'};
    min-width: ${({ $minWidth }) => $minWidth || 'auto'};
    max-width: ${({ $maxWidth }) => $maxWidth || '600px'};
    max-height: ${({ $maxHeight }) => $maxHeight || '85vh'};
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: ${tokens.gradient.surface};
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.xxl};
    box-shadow:
        inset 0 1px 0 ${tokens.color.highlight.soft},
        ${tokens.shadow.xl},
        0 0 40px rgba(100, 108, 255, 0.06);
`;

// — Header ———————————————————————————————————————————————————————————————
// Наследует CardHeader (gradient.raised, border-bottom, $feature-тонирование),
// добавляет space-between под заголовок + крестик.
export const ModalHeader = styled(CardHeader)`
    justify-content: space-between;
`;

// Наследует CardTitle (иконка+текст, $feature svg-цвет).
export const ModalTitle = styled(CardTitle)``;

// — Body —————————————————————————————————————————————————————————————————
// Наследует CardContent (padding xxl, gap xl), добавляет внутренний скролл.
export const ModalBody = styled(CardContent)`
    overflow-y: auto;
    min-height: 0;
`;

// — Footer ———————————————————————————————————————————————————————————————
export const ModalFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: ${({ $align }) => $align || 'flex-end'};
    gap: ${tokens.space.md};
    padding: ${tokens.space.lg} ${tokens.space.xxl};
    border-top: 1px solid ${tokens.color.border.subtle};
`;

// — Close ————————————————————————————————————————————————————————————————
const CloseButtonStyled = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.lg};
    background: ${tokens.color.highlight.faint};
    color: ${tokens.color.text.faint};
    cursor: pointer;
    transition: ${tokens.transition.base};

    &:hover {
        background: ${tokens.color.danger.soft};
        border-color: ${tokens.color.danger.base};
        color: ${tokens.color.danger.base};
    }

    &:focus-visible {
        outline: none;
        border-color: ${tokens.color.accent.primary};
        box-shadow: ${tokens.shadow.focus};
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

export function ModalClose({ onClick, label = 'Close', ...rest }) {
    return (
        <CloseButtonStyled type="button" onClick={onClick} aria-label={label} {...rest}>
            <FiX />
        </CloseButtonStyled>
    );
}

// — ConfirmDialog ————————————————————————————————————————————————————————
// Центрированный диалог подтверждения (круглая иконка + заголовок + текст +
// две кнопки). Chrome-only: оборачивайте в <Portal>. Заменяет дублированные
// локальные ConfirmModal (Lottery/Roulette и т.п.).
const confirmTone = {
    danger: { base: tokens.color.danger.base, soft: tokens.color.danger.soft, button: 'danger' },
    warning: { base: tokens.color.warning.base, soft: tokens.color.warning.soft, button: 'danger' },
    primary: { base: tokens.color.accent.primary, soft: tokens.color.accent.soft, button: 'primary' },
};

const ConfirmCard = styled(Modal)`
    max-width: ${({ $maxWidth }) => $maxWidth || '420px'};
    padding: ${tokens.space.xxl};
    align-items: center;
    text-align: center;
    gap: ${tokens.space.lg};
`;

const ConfirmIcon = styled.div`
    width: 64px;
    height: 64px;
    border-radius: ${tokens.radius.circle};
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${({ $tone }) => confirmTone[$tone]?.soft || confirmTone.danger.soft};

    svg {
        width: 32px;
        height: 32px;
        color: ${({ $tone }) => confirmTone[$tone]?.base || confirmTone.danger.base};
    }
`;

const ConfirmTitle = styled.h3`
    margin: 0;
    font-family: ${tokens.font.family.base};
    font-size: ${tokens.font.size.xl};
    font-weight: ${tokens.font.weight.semibold};
    color: ${tokens.color.text.primary};
`;

const ConfirmText = styled.p`
    margin: 0;
    color: ${tokens.color.text.muted};
    font-size: ${tokens.font.size.md};
    line-height: ${tokens.font.lineHeight.relaxed};
`;

const ConfirmButtons = styled.div`
    display: flex;
    gap: ${tokens.space.md};
    justify-content: center;
    margin-top: ${tokens.space.sm};
`;

export function ConfirmDialog({
    title,
    text,
    icon,
    variant = 'danger',
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    confirmDisabled = false,
    children,
    ...rest
}) {
    const tone = confirmTone[variant] ? variant : 'danger';
    return (
        <ConfirmCard role="alertdialog" {...rest}>
            <ConfirmIcon $tone={tone}>{icon || <FiAlertTriangle />}</ConfirmIcon>
            {title && <ConfirmTitle>{title}</ConfirmTitle>}
            {text && <ConfirmText>{text}</ConfirmText>}
            {children}
            <ConfirmButtons>
                <Button $variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
                <Button
                    $variant={confirmTone[tone].button}
                    onClick={onConfirm}
                    disabled={confirmDisabled}
                >
                    {confirmLabel}
                </Button>
            </ConfirmButtons>
        </ConfirmCard>
    );
}
