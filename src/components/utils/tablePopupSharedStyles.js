import styled from "styled-components";
import { tokens } from "../../designSystem/tokens";

export const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
`;

export const Title = styled.h2`
    font-size: 1.8rem;
    font-weight: 600;
    color: ${tokens.color.text.primary};
    margin: 0;
    background: ${tokens.gradient.accent};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
`;

export const CloseButton = styled.button`
    background: none;
    border: none;
    color: ${tokens.color.text.muted};
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: ${tokens.transition.base};

    &:hover {
        background: ${tokens.color.border.default};
        color: ${tokens.color.text.primary};
    }

    svg {
        width: 20px;
        height: 20px;
    }
`;

export const SearchSection = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 0;
    background: ${tokens.color.bg.raised};
    border-radius: ${tokens.radius.xl};
    border: 1px solid ${tokens.color.border.default};
`;

export const SearchInputWrapper = styled.div`
    position: relative;
    flex: 1;
`;

export const SearchInput = styled.input`
    box-sizing: border-box;
    width: 100%;
    padding: 12px 44px 12px 44px;
    border: 1px solid ${tokens.color.border.strong};
    border-radius: ${tokens.radius.lg};
    background: ${tokens.color.bg.surface};
    color: ${tokens.color.text.primary};
    font-size: 1rem;
    transition: ${tokens.transition.base};

    &::placeholder {
        color: ${tokens.color.text.faint};
    }

    &:focus {
        outline: none;
        border-color: ${tokens.color.accent.primary};
        background: #252525;
    }
`;

export const SearchIcon = styled.div`
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: ${tokens.color.text.faint};
    pointer-events: none;

    svg {
        width: 16px;
        height: 16px;
    }
`;

export const ClearButton = styled.button`
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: ${tokens.color.text.faint};
    cursor: pointer;
    padding: 4px;
    border-radius: ${tokens.radius.sm};
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: ${({ visible }) => (visible ? 1 : 0)};
    pointer-events: ${({ visible }) => (visible ? 'auto' : 'none')};
    transition: ${tokens.transition.base};

    &:hover {
        background: ${tokens.color.border.default};
        color: ${tokens.color.text.primary};
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

export const PopupContent = styled.div`
    display: flex;
    padding: 24px;
    flex-direction: column;
    gap: 16px;
    min-width: 900px;
    max-width: 1200px;
    max-height: 85vh;
    height: 85vh;
`;

export const TableContainer = styled.div`
    flex: 1;
    background: ${tokens.color.bg.raised};
    border-radius: ${tokens.radius.xl};
    border: 1px solid ${tokens.color.border.default};
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
`;

export const TableScrollContainer = styled.div`
    flex: 1;
    overflow-y: auto;

    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-track {
        background: ${tokens.color.bg.raised};
    }

    &::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: ${tokens.radius.sm};
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #666;
    }
`;

export const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
`;

export const TableHeader = styled.thead`
    background: ${tokens.color.bg.raisedAlt};
    border-bottom: 1px solid ${tokens.color.border.default};
    position: sticky;
    top: 0;
    z-index: 1;
`;

export const TableHeaderCell = styled.th`
    padding: 16px 20px;
    text-align: left;
    font-size: 0.9rem;
    font-weight: 600;
    color: #d6d6d6;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
`;

export const TableBody = styled.tbody``;

export const TableRow = styled.tr`
    border-bottom: 1px solid ${tokens.color.border.subtle};
    transition: ${tokens.transition.base};

    &:hover {
        background: ${tokens.color.bg.raisedAlt};
    }

    &:last-child {
        border-bottom: none;
    }
`;

export const TableCell = styled.td`
    padding: 16px 20px;
    color: #d6d6d6;
    font-size: 0.95rem;
`;

export const ActionButton = styled.button`
    background: none;
    border: none;
    color: ${({ danger }) => (danger ? '#ff5555' : '#646cff')};
    cursor: pointer;
    padding: 8px;
    border-radius: ${tokens.radius.md};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: ${tokens.transition.base};
    margin-right: 4px;

    &:hover {
        background: ${({ danger }) => (danger ? '#ff555520' : '#646cff20')};
        transform: scale(1.05);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

export const GuaranteedBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: ${tokens.radius.md};
    font-size: 0.85rem;
    font-weight: 600;
    background: ${({ active }) => (active ? '#3a960520' : '#55555520')};
    color: ${({ active }) => (active ? '#3a9605' : '#999')};
    border: 1px solid ${({ active }) => (active ? '#3a9605' : '#555')};

    svg {
        width: 12px;
        height: 12px;
    }
`;

export const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px;
    color: ${tokens.color.text.muted};
    font-size: 1rem;
`;

export const EmptyContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 60px;
    color: ${tokens.color.text.muted};
    text-align: center;

    svg {
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
    }

    h3 {
        margin: 0 0 8px 0;
        color: #d6d6d6;
        font-size: 1.1rem;
    }

    p {
        margin: 0;
        font-size: 0.95rem;
    }
`;

export const PaginationContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-top: 1px solid ${tokens.color.border.default};
    background: ${tokens.color.bg.raisedAlt};
`;

export const PaginationInfo = styled.span`
    color: ${tokens.color.text.muted};
    font-size: 0.9rem;
`;

export const PaginationControls = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

export const PaginationButton = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: ${({ disabled }) => (disabled ? '#2a2a2a' : '#444')};
    color: ${({ disabled }) => (disabled ? '#555' : '#d6d6d6')};
    border: none;
    border-radius: ${tokens.radius.md};
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    transition: ${tokens.transition.base};

    &:hover:not(:disabled) {
        background: #555;
        color: ${tokens.color.text.primary};
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;