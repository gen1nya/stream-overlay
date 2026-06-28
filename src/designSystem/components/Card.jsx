import styled, { css } from 'styled-components';
import { tokens } from '../tokens';

const getFeature = (feature) => tokens.color.feature[feature];

export const Card = styled.div`
    width: calc(100% - (${tokens.space.md} * 2));
    margin: ${tokens.space.md} ${tokens.space.md} 0;
    background: ${tokens.gradient.surface};
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.xxl};
    padding: 0;
    display: flex;
    flex-direction: column;
    box-shadow: ${tokens.shadow.md};
    transition: ${tokens.transition.slow};
    overflow: hidden;

    &:hover {
        transform: translateY(-1px);
        box-shadow: ${tokens.shadow.lg};
        border-color: ${tokens.color.border.strong};
    }
`;

export const CardHeader = styled.div`
    padding: ${tokens.space.xl} ${tokens.space.xxl} ${tokens.space.lg};
    background: ${tokens.gradient.raised};
    border-bottom: 1px solid ${tokens.color.border.default};
    display: flex;
    align-items: center;
    gap: ${tokens.space.md};

    ${({ $feature }) => {
        const feature = getFeature($feature);

        if (!feature) {
            return '';
        }

        return css`
            background:
                linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0) 62%),
                linear-gradient(90deg, ${feature.soft} 0%, rgba(30, 30, 30, 0) 82%),
                ${tokens.gradient.raised};
            border-bottom-color: ${feature.softBorder};
            box-shadow:
                inset 3px 0 0 ${feature.base},
                inset 0 1px 0 ${tokens.color.highlight.soft},
                0 0 22px ${feature.soft};
        `;
    }}
`;

export const CardTitle = styled.h3`
    margin: 0;
    font-family: ${tokens.font.family.base};
    font-size: ${tokens.font.size.xl};
    font-weight: ${tokens.font.weight.semibold};
    line-height: ${tokens.font.lineHeight.tight};
    color: ${tokens.color.text.primary};
    display: flex;
    align-items: center;
    gap: calc(${tokens.space.sm} + 2px);

    svg {
        width: ${tokens.space.xl};
        height: ${tokens.space.xl};
        color: ${({ $feature }) => getFeature($feature)?.base || tokens.color.accent.primary};
    }
`;

export const CardSubtitle = styled.span`
    margin-left: auto;
    font-family: ${tokens.font.family.base};
    font-size: ${tokens.font.size.md};
    font-weight: ${tokens.font.weight.regular};
    line-height: ${tokens.font.lineHeight.base};
    color: ${tokens.color.text.muted};
`;

export const CardContent = styled.div`
    padding: ${tokens.space.xxl};
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.xl};
`;
