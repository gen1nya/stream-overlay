import styled from "styled-components";
import React from "react";
import ReactDOM from "react-dom";
import {ActionButton, CardHeader, InfoBadge} from "../SharedSettingsStyles";
import { FiHelpCircle, FiX } from "react-icons/fi";

// Static header without collapse functionality
export const StaticCardHeader = styled(CardHeader)`
    cursor: default;
`;

// Help button for opening info popup
const HelpButtonStyled = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid #444;
    border-radius: 8px;
    background: rgba(100, 108, 255, 0.1);
    color: #646cff;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(100, 108, 255, 0.2);
        border-color: #646cff;
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
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
`;

// Popup container
const PopupContainer = styled.div`
    background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
    border: 1px solid #444;
    border-radius: 16px;
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const PopupHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #333;
    background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);
    border-radius: 16px 16px 0 0;

    h3 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 10px;

        svg {
            color: #646cff;
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
    border: 1px solid #444;
    border-radius: 8px;
    background: rgba(107, 114, 128, 0.1);
    color: #888;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(220, 38, 38, 0.1);
        border-color: #dc2626;
        color: #dc2626;
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

const PopupContent = styled.div`
    padding: 24px;
    color: #ccc;
    line-height: 1.7;
    font-size: 0.95rem;

    .highlight {
        color: #00ffdd;
        font-weight: 500;
    }

    .warning {
        color: #fbbf24;
        font-weight: 500;
    }

    p {
        margin: 0 0 16px 0;
    }

    ul {
        margin: 0 0 16px 0;
        padding-left: 20px;
    }

    li {
        margin-bottom: 8px;
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

// Legacy - keeping for backward compatibility
export const CollapsibleHeader = styled(CardHeader)`
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: linear-gradient(135deg, #333 0%, #3a3a3a 100%);
    }
`;

export const CollapsedPreview = styled.div`
    padding: 20px 24px;
    color: #ccc;
    line-height: 1.6;
    border-bottom: 1px solid #333;
    cursor: pointer;
    transition: all 0.2s ease;
    background: rgba(30, 30, 30, 0.3);

    &:hover {
        background: rgba(30, 30, 30, 0.5);
        color: #fff;
    }

    .highlight {
        color: #00ffdd;
        font-weight: 500;
    }
`;

export const EnabledToggle = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: ${props => props.enabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)'};
    border: 1px solid ${props => props.enabled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(107, 114, 128, 0.3)'};
    border-radius: 8px;
    transition: all 0.2s ease;
`;

export const StatusBadge = styled(InfoBadge)`
    background: ${props => props.enabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)'};
    border-color: ${props => props.enabled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(107, 114, 128, 0.3)'};
    color: ${props => props.enabled ? '#22c55e' : '#6b7280'};
`;

export const AddCommandForm = styled.div`
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid #333;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-sizing: border-box;
`;

export const FormRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
`;

export const NameInput = styled.input`
    flex: 1;
    min-width: 250px;
    padding: 12px 16px;
    border: 1px solid ${({ $error }) => ($error ? '#dc2626' : '#555')};
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 14px;
    transition: all 0.2s ease;
    
    &::placeholder {
        color: #888;
    }
    
    &:focus {
        outline: none;
        border-color: ${({ $error }) => ($error ? '#dc2626' : '#646cff')};
        background: #252525;
    }
    
    ${({ $error }) => $error && `
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
    `}
`;

export const AddButton = styled(ActionButton)`
    background: #646cff;
    border-color: #646cff;
    
    &:hover {
        background: #5a5acf;
        border-color: #5a5acf;
    }
`;

export const ErrorText = styled.span`
    color: #dc2626;
    font-size: 0.85rem;
    margin-top: 4px;
`;

export const VariablesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    background: rgba(30, 30, 30, 0.5);
    border-radius: 8px;
    border: 1px solid #333;
    box-sizing: border-box;
`;

export const VariableItem = styled.div`
    display: flex;
    gap: 8px;
    font-size: 0.9rem;
    
    .var {
        color: #00ffdd;
        font-weight: 500;
        min-width: 140px;
    }
    
    .desc {
        color: #ccc;
    }
`;

export const ParameterCard = styled.div`
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-sizing: border-box;
`;

export const ParameterTitle = styled.h5`
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #e0e0e0;
    display: flex;
    align-items: center;
    gap: 6px;
    
    svg {
        width: 14px;
        height: 14px;
        color: #888;
    }
`;