import styled from "styled-components";
import {ActionButton, CardHeader, InfoBadge} from "../SharedSettingsStyles";

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