import styled, { css } from 'styled-components';
import { tokens } from '../tokens';

const getFeature = (feature) => tokens.color.feature[feature];

export const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.md};
`;

export const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${tokens.space.sm};
    margin-bottom: ${tokens.space.sm};
    padding-bottom: ${tokens.space.sm};
    border-bottom: 1px solid ${tokens.color.border.subtle};

    ${({ $feature }) => {
        const feature = getFeature($feature);

        if (!feature) {
            return '';
        }

        return css`
            padding: ${tokens.space.sm} ${tokens.space.md};
            background: ${feature.soft};
            border-bottom-color: ${feature.softBorder};
            box-shadow: inset 3px 0 0 ${feature.base};
            border-radius: ${tokens.radius.md};
        `;
    }}
`;

export const SectionTitle = styled.h4`
    margin: 0;
    font-family: ${tokens.font.family.base};
    font-size: ${tokens.font.size.lg};
    font-weight: ${tokens.font.weight.medium};
    line-height: ${tokens.font.lineHeight.tight};
    color: ${tokens.color.text.secondary};
    display: flex;
    align-items: center;
    gap: ${tokens.space.sm};

    svg {
        width: ${tokens.space.lg};
        height: ${tokens.space.lg};
        color: ${({ $feature }) => getFeature($feature)?.base || tokens.color.text.faint};
    }
`;
