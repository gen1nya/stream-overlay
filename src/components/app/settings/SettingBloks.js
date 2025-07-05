import styled from "styled-components";

export const SettingsBlockFull = styled.div`
    width: calc(100% - 12px);
    margin-left: 6px;
    margin-right: 6px;
    margin-top: 12px;
    background: #1e1e1e;
    border-radius: 12px;
    padding: 0 12px 12px;
    flex-direction: column;
    display: flex;
    gap: 12px;
    box-sizing: border-box;
`;

export const SettingsBlockHalf = styled.div`
    width: calc(50% - 12px);
    margin-left: 6px;
    margin-right: 6px;
    margin-top: 12px;
    background: #1e1e1e;
    border-radius: 12px;
    padding: 0 12px 12px;
    flex-direction: column;
    display: flex;
    gap: 12px;
    box-sizing: border-box;
`;

export const SettingsBlockTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: bold;
    color: #d6d6d6;
    margin: 0;
    padding: 8px 0;
`;


export const MediumSecondaryButton = styled.button`
    box-sizing: border-box;
    height: 40px;
    padding: 0 16px;
    font-size: 14px;
    color: #fff;
    background: #1f1f1f;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;

    white-space: nowrap;
    width: fit-content;
    flex: 0 0 auto;
    align-self: flex-start;

    &:hover {
        background: #232323;
        border: 1px solid #646cff;
    }
`;