import styled from "styled-components";

export const SettingsBlockFull = styled.div`
    width: calc(100% - 12px);
    margin-left: 6px;
    box-shadow: 0 0 10px rgba(92, 56, 169, 0.6);
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
    box-shadow: 0 0 10px rgba(92, 56, 169, 0.6);
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

export const SettingsBlockSubTitle = styled.h3`
    font-size: 1.2rem;
    font-weight: bold;
    color: #d6d6d6;
    margin: 0;
    padding: 0;
`;

export const SmallSubTitle = styled.span`
    font-size: 1rem;
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

export const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
`;

export const CollapsedPreview = styled.div`
  font-family: monospace;
  background: #222;
  color: #ddd;
  padding: 0.5rem;
  border-radius: 6px;
  margin-top: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
`;

export const Triangle = styled.span`
  font-size: 1.25rem;
  user-select: none;
  margin-left: 0.5rem;
`;

export const RemoveButton = styled.button`
    background: none;
    color: #e74c3c;
    font-size: 0.9rem;
    cursor: pointer;
    margin-left: 1rem;
    border: 1px solid #e74c3c;
    border-radius: 4px;
    margin-bottom: -4px;
    
    transition:
            background 0.2s ease,
            color 0.2s ease,
            border-color 0.2s ease,
            opacity 0.2s ease;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    &:hover:not(:disabled) {
        background: #e74c3c;
        color: white;
        border-color: white;
    }

    &:hover:disabled {
        border-color: white;
        color: white;
    }
`;