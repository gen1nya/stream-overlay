import styled from "styled-components";
import React from "react";
import ReactDOM from "react-dom";
import {ActionButton, InfoBadge} from "../SharedSettingsStyles";
import { tokens } from "../../../../designSystem/tokens";
import Input from "../../../../designSystem/components/Input";
import { FiHelpCircle, FiX } from "react-icons/fi";

// Help button for opening info popup
const HelpButtonStyled = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.lg};
    background: ${tokens.color.accent.soft};
    color: ${tokens.color.accent.primary};
    cursor: pointer;
    transition: ${tokens.transition.base};

    &:hover {
        background: rgba(100, 108, 255, 0.2);
        border-color: ${tokens.color.accent.primary};
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

// Popup overlay
const PopupOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${tokens.color.scrim.strong};
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: ${tokens.z.modal};
    padding: ${tokens.space.xl};
`;

// Popup container
const PopupContainer = styled.div`
    background: ${tokens.gradient.surface};
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.xxl};
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: ${tokens.shadow.xl};
`;

const PopupHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${tokens.space.xl} ${tokens.space.xxl};
    border-bottom: 1px solid ${tokens.color.border.subtle};
    background: ${tokens.gradient.raised};
    border-radius: ${tokens.radius.xxl} ${tokens.radius.xxl} 0 0;

    h3 {
        margin: 0;
        font-size: ${tokens.font.size.xl};
        font-weight: ${tokens.font.weight.semibold};
        color: ${tokens.color.text.primary};
        display: flex;
        align-items: center;
        gap: 10px;

        svg {
            color: ${tokens.color.accent.primary};
        }
    }
`;

const CloseButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.lg};
    background: rgba(107, 114, 128, 0.1);
    color: ${tokens.color.text.faint};
    cursor: pointer;
    transition: ${tokens.transition.base};

    &:hover {
        background: rgba(220, 38, 38, 0.1);
        border-color: ${tokens.color.danger.base};
        color: ${tokens.color.danger.base};
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

const PopupContent = styled.div`
    padding: ${tokens.space.xxl};
    color: ${tokens.color.text.tertiary};
    line-height: 1.7;
    font-size: 0.95rem;

    .highlight {
        color: #00ffdd;
        font-weight: ${tokens.font.weight.medium};
    }

    .warning {
        color: #fbbf24;
        font-weight: ${tokens.font.weight.medium};
    }

    p {
        margin: 0 0 ${tokens.space.lg} 0;
    }

    ul {
        margin: 0 0 ${tokens.space.lg} 0;
        padding-left: ${tokens.space.xl};
    }

    li {
        margin-bottom: ${tokens.space.sm};
    }
`;

// Help Info Popup Component - uses Portal to render at popup-root level
export const HelpInfoPopup = ({ isOpen, onClose, title, icon, children }) => {
    if (!isOpen) return null;

    const portalRoot = document.getElementById('popup-root') || document.body;

    return ReactDOM.createPortal(
        <PopupOverlay onClick={onClose}>
            <PopupContainer onClick={(e) => e.stopPropagation()}>
                <PopupHeader>
                    <h3>
                        {icon}
                        {title}
                    </h3>
                    <CloseButton onClick={onClose}>
                        <FiX />
                    </CloseButton>
                </PopupHeader>
                <PopupContent>
                    {children}
                </PopupContent>
            </PopupContainer>
        </PopupOverlay>,
        portalRoot
    );
};

// Help Button Component
export const HelpButton = ({ onClick }) => (
    <HelpButtonStyled onClick={onClick} type="button">
        <FiHelpCircle />
    </HelpButtonStyled>
);

export const EnabledToggle = styled.div`
    display: flex;
    align-items: center;
    gap: ${tokens.space.md};
    padding: ${tokens.space.md} ${tokens.space.lg};
    background: ${props => props.enabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)'};
    border: 1px solid ${props => props.enabled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(107, 114, 128, 0.3)'};
    border-radius: ${tokens.radius.lg};
    transition: ${tokens.transition.base};
`;

export const StatusBadge = styled(InfoBadge)`
    background: ${props => props.enabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)'};
    border-color: ${props => props.enabled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(107, 114, 128, 0.3)'};
    color: ${props => props.enabled ? tokens.color.success.base : '#6b7280'};
`;

export const AddCommandForm = styled.div`
    background: ${tokens.color.scrim.soft};
    border: 1px solid ${tokens.color.border.subtle};
    border-radius: ${tokens.radius.xl};
    padding: ${tokens.space.xl};
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.lg};
    box-sizing: border-box;
`;

export const FormRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${tokens.space.md};
    flex-wrap: wrap;
`;

// Адоптировано на примитив Input (ДС). Локально остаётся только layout-экстра.
export const NameInput = styled(Input)`
    flex: 1;
    min-width: 250px;
`;

export const AddButton = styled(ActionButton)`
    background: ${tokens.color.accent.primary};
    border-color: ${tokens.color.accent.primary};

    &:hover {
        background: ${tokens.color.accent.primaryHover};
        border-color: ${tokens.color.accent.primaryHover};
    }
`;

export const ErrorText = styled.span`
    color: ${tokens.color.danger.base};
    font-size: ${tokens.font.size.sm};
    margin-top: ${tokens.space.xs};
`;

export const VariablesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.sm};
    padding: ${tokens.space.lg};
    background: ${tokens.color.scrim.panel};
    border-radius: ${tokens.radius.lg};
    border: 1px solid ${tokens.color.border.subtle};
    box-sizing: border-box;
`;

export const VariableItem = styled.div`
    display: flex;
    gap: ${tokens.space.sm};
    font-size: ${tokens.font.size.md};

    .var {
        color: #00ffdd;
        font-weight: ${tokens.font.weight.medium};
        min-width: 140px;
    }

    .desc {
        color: ${tokens.color.text.tertiary};
    }
`;

export const ParameterCard = styled.div`
    background: ${tokens.color.scrim.soft};
    border: 1px solid ${tokens.color.border.subtle};
    border-radius: ${tokens.radius.lg};
    padding: ${tokens.space.lg};
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.sm};
    box-sizing: border-box;
`;

export const ParameterTitle = styled.h5`
    margin: 0;
    font-size: ${tokens.font.size.md};
    font-weight: ${tokens.font.weight.semibold};
    color: ${tokens.color.text.secondary};
    display: flex;
    align-items: center;
    gap: 6px;

    svg {
        width: 14px;
        height: 14px;
        color: ${tokens.color.text.faint};
    }
`;
