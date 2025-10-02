import styled, { keyframes } from 'styled-components';

const neonPulse = keyframes`
    0%, 100% {
        box-shadow: 
            0 0 8px rgba(255, 0, 0, 0.6),
            0 0 16px rgba(255, 0, 0, 0.4),
            inset 0 0 8px rgba(255, 0, 0, 0.2);
    }
    50% {
        box-shadow: 
            0 0 12px rgba(255, 0, 0, 0.8),
            0 0 24px rgba(255, 0, 0, 0.6),
            inset 0 0 12px rgba(255, 0, 0, 0.3);
    }
`;

const textGlow = keyframes`
    0%, 100% {
        text-shadow: 
            0 0 4px rgba(255, 255, 255, 0.8),
            0 0 8px rgba(255, 0, 0, 0.6);
    }
    50% {
        text-shadow: 
            0 0 6px rgba(255, 255, 255, 1),
            0 0 12px rgba(255, 0, 0, 0.8);
    }
`;

export const OnlineIndicator = styled.div`
    display: flex;
    margin-top: 4px;
    align-items: center;
    height: 20px;
    gap: 8px;
    padding: 0 12px;
    background: ${props => props.$isOnline
    ? 'rgba(255, 0, 0, 0.14)'
    : 'rgba(128, 128, 128, 0.14)'};
    box-shadow: ${props => props.$isOnline
    ? '0 0 8px rgba(255, 0, 0, 0.6)'
    : '0 0 4px rgba(128, 128, 128, 0.3)'};
    border: 1px solid ${props => props.$isOnline ? '#ff0000' : '#808080'};
    border-radius: 6px;
    animation: ${props => props.$isOnline ? neonPulse : 'none'} 1s ease-in-out infinite;
    transition: all 0.3s ease;
    
    .live-name {
        font-weight: 600;
        font-size: 13px;
        line-height: 20px;
        margin: 0;
        color: ${props => props.$isOnline ? '#fff' : '#999'};
        animation: ${props => props.$isOnline ? textGlow : 'none'} 2s ease-in-out infinite;
        transition: color 0.3s ease;
    }
`;