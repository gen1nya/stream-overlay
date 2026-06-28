import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useReducer } from 'react';
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
 * PortalProvider - manages the modal stack (overlay chrome, stacking order,
 * escape/backdrop close, scroll lock).
 *
 * Each <Portal> registers an id + options here and renders its OWN children
 * live into the matching container via ReactDOM.createPortal. Children are
 * never snapshotted into provider state — that one-render-stale snapshot was
 * what reset controlled-input carets to the end on every keystroke.
 *
 * Usage:
 * 1. Wrap your app with <PortalProvider>
 * 2. Use the <Portal> component (declarative) to render modal content.
 */
export function PortalProvider({ children }) {
    const [modals, setModals] = useState([]); // [{ id, options }]

    // Container DOM nodes live in a ref (stable identity across renders); a
    // version bump re-renders consumers so a <Portal> can pick up its node.
    const containersRef = useRef(new Map());
    const refCallbacksRef = useRef(new Map());
    const [, bumpVersion] = useReducer(x => x + 1, 0);

    const openModal = useCallback((id, options = {}) => {
        setModals(prev => {
            // Don't add if already exists
            if (prev.some(m => m.id === id)) {
                return prev;
            }
            return [...prev, { id, options }];
        });
    }, []);

    const updateModalOptions = useCallback((id, options) => {
        setModals(prev => {
            const modal = prev.find(m => m.id === id);
            if (!modal) return prev;
            return prev.map(m => m.id === id ? { ...m, options } : m);
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

    // Stable per-id ref callback so React doesn't detach/attach (null→node) the
    // container on every provider render, which would loop with bumpVersion.
    const getContainerRef = useCallback((id) => {
        let cb = refCallbacksRef.current.get(id);
        if (!cb) {
            cb = (node) => {
                if (node) {
                    containersRef.current.set(id, node);
                } else {
                    containersRef.current.delete(id);
                }
                bumpVersion();
            };
            refCallbacksRef.current.set(id, cb);
        }
        return cb;
    }, []);

    const getContainer = useCallback((id) => containersRef.current.get(id), []);

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

    // Drop stale ref callbacks for modals that no longer exist
    useEffect(() => {
        const live = new Set(modals.map(m => m.id));
        for (const id of refCallbacksRef.current.keys()) {
            if (!live.has(id)) refCallbacksRef.current.delete(id);
        }
    }, [modals]);

    const portalRoot = document.getElementById('popup-root');

    const value = {
        openModal,
        updateModalOptions,
        closeModal,
        closeAll,
        closeTopModal,
        getContainer,
        modals,
    };

    return (
        <PortalContext.Provider value={value}>
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
                            <ModalContainer ref={getContainerRef(modal.id)} />
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
 * @returns {{ openModal, updateModalOptions, closeModal, closeAll, closeTopModal, getContainer, modals }}
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
    const { openModal, updateModalOptions, closeModal, getContainer } = usePortal();

    // Keep the latest onClose without re-registering the modal each render.
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const buildOptions = () => ({
        transparentOverlay,
        overlayBackground,
        padding,
        preventOverlayClose,
        preventEscapeClose,
        onClose: () => onCloseRef.current && onCloseRef.current(),
    });

    // Register once on mount, unregister on unmount.
    useEffect(() => {
        openModal(id, buildOptions());
        return () => {
            // Skip onClose callback during unmount - parent already knows about the close
            closeModal(id, { skipOnClose: true });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Keep overlay options in sync when they change (cheap; primitives only).
    useEffect(() => {
        updateModalOptions(id, buildOptions());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, transparentOverlay, overlayBackground, padding, preventOverlayClose, preventEscapeClose]);

    // Render children LIVE into the provider's container for this id. This keeps
    // the modal in this component's render tree, so controlled inputs reconcile
    // synchronously with their state updates and the caret stays put.
    const container = getContainer(id);
    return container ? ReactDOM.createPortal(children, container) : null;
}

export default PortalContext;
