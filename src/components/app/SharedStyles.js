import styled from "styled-components";

export const ThemeIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(42, 42, 42, 0.7);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(68, 68, 68, 0.6);
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
        background: rgba(51, 51, 51, 0.8);
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
    background: rgba(42, 42, 42, 0.7);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(68, 68, 68, 0.6);
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
        background: rgba(51, 51, 51, 0.8);
        border-color: #555;
        transform: translateY(-1px);
    }

    &.primary {
        background: rgba(100, 108, 255, 0.8);
        border-color: #646cff;

        &:hover {
            background: rgba(90, 90, 207, 0.9);
            border-color: #5a5acf;
        }
    }

    &.secondary {
        background: rgba(5, 150, 105, 0.25);
        border-color: rgba(5, 150, 105, 0.6);

        &:hover {
            background: rgba(4, 120, 87, 0.7);
            border-color: #02cc93;
        }
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;