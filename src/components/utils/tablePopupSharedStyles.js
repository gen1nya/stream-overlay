import styled from "styled-components";

export const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
`;

export const Title = styled.h2`
    font-size: 1.8rem;
    font-weight: 600;
    color: #fff;
    margin: 0;
    background: linear-gradient(135deg, #646cff, #7c3aed);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
`;

export const CloseButton = styled.button`
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        background: #444;
        color: #fff;
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
    background: #2a2a2a;
    border-radius: 12px;
    border: 1px solid #444;
`;

export const SearchInputWrapper = styled.div`
    position: relative;
    flex: 1;
`;

export const SearchInput = styled.input`
    box-sizing: border-box;
    width: 100%;
    padding: 12px 44px 12px 44px;
    border: 1px solid #555;
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 1rem;
    transition: all 0.2s ease;

    &::placeholder {
        color: #888;
    }

    &:focus {
        outline: none;
        border-color: #646cff;
        background: #252525;
    }
`;

export const SearchIcon = styled.div`
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #888;
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
    color: #888;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: ${({ visible }) => (visible ? 1 : 0)};
    pointer-events: ${({ visible }) => (visible ? 'auto' : 'none')};
    transition: all 0.2s ease;

    &:hover {
        background: #444;
        color: #fff;
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
    background: #2a2a2a;
    border-radius: 12px;
    border: 1px solid #444;
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
        background: #2a2a2a;
    }

    &::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 4px;
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
    background: #333;
    border-bottom: 1px solid #444;
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
    border-bottom: 1px solid #333;
    transition: all 0.2s ease;

    &:hover {
        background: #333;
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
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
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
    border-radius: 6px;
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
    color: #999;
    font-size: 1rem;
`;

export const EmptyContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 60px;
    color: #999;
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
    border-top: 1px solid #444;
    background: #333;
`;

export const PaginationInfo = styled.span`
    color: #999;
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
    border-radius: 6px;
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        background: #555;
        color: #fff;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;