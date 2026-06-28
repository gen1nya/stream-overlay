import React, { useId } from 'react';
import { Portal } from "../../context/PortalContext";
import { Modal } from "../../designSystem/components/Modal";

/**
 * Тонкая обёртка «открыть модалку»: Portal (оверлей/стек/Escape/scroll-lock)
 * + контейнер дизайн-системы Modal.
 *
 * API обратносовместим (`children`, `onClose`). По умолчанию контейнер
 * самоподстраивается под контент (min-width 300px, без max-ограничений) —
 * как старый PopupContainer, — чтобы не ломать существующих потребителей.
 * Размер/поведение можно переопределить пропами.
 */
export default function Popup({
    children,
    onClose,
    id,
    width,
    minWidth = '300px',
    maxWidth = 'none',
    maxHeight = 'none',
    preventOverlayClose = false,
    preventEscapeClose = false,
}) {
    const autoId = useId();

    return (
        <Portal
            id={id || `popup-${autoId}`}
            onClose={onClose}
            preventOverlayClose={preventOverlayClose}
            preventEscapeClose={preventEscapeClose}
        >
            <Modal $width={width} $minWidth={minWidth} $maxWidth={maxWidth} $maxHeight={maxHeight}>
                {children}
            </Modal>
        </Portal>
    );
}
