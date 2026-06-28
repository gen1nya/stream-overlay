import styled from 'styled-components';
import { tokens } from '../tokens';

export const ScrollArea = styled.div`
    overflow-y: auto;
    max-height: ${({ maxHeight = '400px' }) => maxHeight};

    &::-webkit-scrollbar {
        width: ${tokens.space.sm};
    }

    &::-webkit-scrollbar-track {
        background: ${tokens.color.bg.base};
        border-radius: ${tokens.radius.sm};
    }

    &::-webkit-scrollbar-thumb {
        background: ${tokens.color.border.default};
        border-radius: ${tokens.radius.sm};
    }

    &::-webkit-scrollbar-thumb:hover {
        background: ${tokens.color.border.strong};
    }
`;
