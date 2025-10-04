import styled from "styled-components";

export const ThemeIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 8px;
    font-size: 13px;
    color: #ccc;
    transition: all 0.2s ease;
    cursor: pointer;

    .theme-name {
        font-weight: 600;
        color: #fff;
    }
    
    &:hover {
        background: #333;
        border-color: #646cff;
    }

    svg {
        width: 14px;
        height: 14px;
        color: #646cff;
    }
`;

export const Header = styled.div`
    box-sizing: border-box;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: rgba(26, 26, 26, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid #333;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

export const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

export const HeaderTitle = styled.h1`
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
    background: linear-gradient(135deg, #646cff, #7c3aed);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
`;

export const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;


export const ActionButton = styled.button`
    background: #2a2a2a;
    border: 1px solid #444;
    color: #fff;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
        background: #333;
        border-color: #555;
        transform: translateY(-1px);
    }

    &.primary {
        background: #646cff;
        border-color: #646cff;

        &:hover {
            background: #5a5acf;
            border-color: #5a5acf;
        }
    }

    &.secondary {
        background: #059669;
        border-color: #059669;

        &:hover {
            background: #047857;
            border-color: #047857;
        }
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;