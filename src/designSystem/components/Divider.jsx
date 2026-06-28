import styled from 'styled-components';
import { tokens } from '../tokens';

export const Divider = styled.div`
    height: 1px;
    background: ${tokens.gradient.divider};
    margin: ${({ margin = `${tokens.space.lg} 0` }) => margin};
`;
