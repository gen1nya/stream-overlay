import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';

const PortalContext = createContext(null);

// Base z-index for modals
const BASE_Z_INDEX = 10000;

const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.$transparent ? 'transparent' : (props.$overlayBackground || 'rgba(0, 0, 0, 0.5)')};
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: ${props => props.$zIndex};
    padding: ${props => props.$padding || '0'};
`;

const ModalContainer = styled.div`
    position: relative;
`;

/**
 * PortalProvider - manages modal stack
 *
 * Usage:
 * 1. Wrap your app with <PortalProvider>
 * 2. Use usePortal() hook to open/close modals
 * 3. Or use <Portal> component for declarative approach
 */
export function PortalProvider({ children }) {
    const [modals, setModals] = useState([]);

    const openModal = useCallback((id, content, options = {}) => {
        setModals(prev => {
            // Don't add if already exists
            if (prev.some(m => m.id === id)) {
                return prev;
            }
            return [...prev, { id, content, options }];
        });
    }, []);

    const closeModal = useCallback((id, options = {}) => {
        setModals(prev => {
            const modal = prev.find(m => m.id === id);
            if (!modal) return prev;
            if (modal.options?.onClose && !options.skipOnClose) {
                modal.options.onClose();
            }
            return prev.filter(m => m.id !== id);
        });
    }, []);

    const closeAll = useCallback(() => {
        setModals(prev => {
            prev.forEach(modal => {
                if (modal?.options?.onClose) {
                    modal.options.onClose();
                }
            });
            return [];
        });
    }, []);

    const closeTopModal = useCallback(() => {
        setModals(prev => {
            if (prev.length === 0) return prev;
            const topModal = prev[prev.length - 1];
            if (topModal?.options?.onClose) {
                topModal.options.onClose();
            }
            return prev.slice(0, -1);
        });
    }, []);

    // Handle Escape key to close top modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && modals.length > 0) {
                const topModal = modals[modals.length - 1];
                if (!topModal.options.preventEscapeClose) {
                    closeTopModal();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [modals, closeTopModal]);

    // Prevent body scroll when modals are open
    useEffect(() => {
        if (modals.length > 0) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [modals.length]);

    const portalRoot = document.getElementById('popup-root');

    return (
        <PortalContext.Provider value={{ openModal, closeModal, closeAll, closeTopModal, modals }}>
            {children}
            {portalRoot && ReactDOM.createPortal(
                <>
                    {modals.map((modal, index) => (
                        <ModalOverlay
                            key={modal.id}
                            $zIndex={BASE_Z_INDEX + index}
                            $transparent={modal.options.transparentOverlay}
                            $overlayBackground={modal.options.overlayBackground}
                            $padding={modal.options.padding}
                            onClick={(e) => {
                                if (e.target === e.currentTarget && !modal.options.preventOverlayClose) {
                                    closeModal(modal.id);
                                }
                            }}
                        >
                            <ModalContainer onClick={e => e.stopPropagation()}>
                                {typeof modal.content === 'function'
                                    ? modal.content({ close: () => closeModal(modal.id) })
                                    : modal.content
                                }
                            </ModalContainer>
                        </ModalOverlay>
                    ))}
                </>,
                portalRoot
            )}
        </PortalContext.Provider>
    );
}

/**
 * Hook to access portal manager
 *
 * @returns {{ openModal, closeModal, closeAll, closeTopModal }}
 *
 * Example:
 * const { openModal, closeModal } = usePortal();
 * openModal('my-modal', <MyModalContent onClose={() => closeModal('my-modal')} />);
 */
export function usePortal() {
    const context = useContext(PortalContext);
    if (!context) {
        throw new Error('usePortal must be used within a PortalProvider');
    }
    return context;
}

/**
 * Declarative Portal component
 *
 * Usage:
 * {showModal && (
 *     <Portal id="my-modal" onClose={() => setShowModal(false)}>
 *         <MyModalContent />
 *     </Portal>
 * )}
 */
export function Portal({
    id,
    children,
    onClose,
    transparentOverlay = false,
    overlayBackground,
    padding,
    preventOverlayClose = false,
    preventEscapeClose = false
}) {
    const { openModal, closeModal } = usePortal();

    useEffect(() => {
        const handleClose = () => {
            if (onClose) onClose();
        };

        openModal(id, children, {
            transparentOverlay,
            overlayBackground,
            padding,
            preventOverlayClose,
            preventEscapeClose,
            onClose: handleClose
        });

        return () => {
            // Skip onClose callback during unmount - parent already knows about the close
            closeModal(id, { skipOnClose: true });
        };
    }, [id, children, openModal, closeModal, onClose, transparentOverlay, overlayBackground, padding, preventOverlayClose, preventEscapeClose]);

    return null;
}

export default PortalContext;
