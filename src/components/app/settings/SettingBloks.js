import styled from "styled-components";
import { tokens } from "../../../designSystem/tokens";

export const SettingsBlockFull = styled.div`
    width: calc(100% - 12px);
    margin-left: 6px;
    box-shadow: ${tokens.shadow.glow};
    margin-right: 6px;
    margin-top: ${tokens.space.md};
    background: ${tokens.color.bg.surface};
    border-radius: ${tokens.radius.xl};
    padding: 0 ${tokens.space.md} ${tokens.space.md};
    flex-direction: column;
    display: flex;
    gap: ${tokens.space.md};
    box-sizing: border-box;
`;

export const SettingsBlockHalf = styled.div`
    width: calc(50% - 12px);
    margin-left: 6px;
    box-shadow: ${tokens.shadow.glow};
    margin-right: 6px;
    margin-top: ${tokens.space.md};
    background: ${tokens.color.bg.surface};
    border-radius: ${tokens.radius.xl};
    padding: 0 ${tokens.space.md} ${tokens.space.md};
    flex-direction: column;
    display: flex;
    gap: ${tokens.space.md};
    box-sizing: border-box;
`;

export const SettingsBlockTitle = styled.h2`
    font-size: ${tokens.font.size.xxl};
    font-weight: bold;
    color: #d6d6d6;
    margin: 0;
    padding: ${tokens.space.sm} 0;
`;

export const SettingsBlockSubTitle = styled.h3`
    font-size: ${tokens.font.size.xl};
    font-weight: bold;
    color: #d6d6d6;
    margin: 0;
    padding: 0;
`;

export const SmallSubTitle = styled.span`
    font-size: ${tokens.font.size.lg};
`;

export const MediumSecondaryButton = styled.button`
    box-sizing: border-box;
    height: 40px;
    padding: 0 ${tokens.space.lg};
    font-size: ${tokens.font.size.base};
    color: ${tokens.color.text.primary};
    background: ${tokens.color.bg.surface};
    border: 1px solid transparent;
    border-radius: ${tokens.radius.md};
    cursor: pointer;

    white-space: nowrap;
    width: fit-content;
    flex: 0 0 auto;
    align-self: flex-start;

    &:hover {
        background: ${tokens.color.bg.raised};
        border: 1px solid ${tokens.color.accent.primary};
    }
`;

export const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
`;

export const CollapsedPreview = styled.div`
  font-family: ${tokens.font.family.mono};
  background: #222;
  color: #ddd;
  padding: 0.5rem;
  border-radius: ${tokens.radius.md};
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
    font-size: ${tokens.font.size.md};
    cursor: pointer;
    margin-left: 1rem;
    border: 1px solid #e74c3c;
    border-radius: ${tokens.radius.sm};
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
