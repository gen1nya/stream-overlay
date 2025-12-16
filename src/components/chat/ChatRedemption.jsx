import React from 'react';
import styled from 'styled-components';
import {generateGradientCSS, getLayeredBackgroundStyles, hexToRgba} from '../../utils';

// Helper to get inset values for color background layer
const getColorLayerInset = (m) => {
    if (m.colorBgPaddingMode === 'individual') {
        const top = m.colorBgPaddingTop ?? m.colorBgPaddingV ?? 0;
        const right = m.colorBgPaddingRight ?? m.colorBgPaddingH ?? 0;
        const bottom = m.colorBgPaddingBottom ?? m.colorBgPaddingV ?? 0;
        const left = m.colorBgPaddingLeft ?? m.colorBgPaddingH ?? 0;
        return `${top}px ${right}px ${bottom}px ${left}px`;
    }
    const h = m.colorBgPaddingH ?? 0;
    const v = m.colorBgPaddingV ?? 0;
    return `${v}px ${h}px`;
};

// Helper to get inset values for gradient layer
const getGradientLayerInset = (m) => {
    if (m.gradientPaddingMode === 'individual') {
        const top = m.gradientPaddingTop ?? m.gradientPaddingV ?? 0;
        const right = m.gradientPaddingRight ?? m.gradientPaddingH ?? 0;
        const bottom = m.gradientPaddingBottom ?? m.gradientPaddingV ?? 0;
        const left = m.gradientPaddingLeft ?? m.gradientPaddingH ?? 0;
        return `${top}px ${right}px ${bottom}px ${left}px`;
    }
    const h = m.gradientPaddingH ?? 0;
    const v = m.gradientPaddingV ?? 0;
    return `${v}px ${h}px`;
};

// Helper to get inset values for image layer
const getImageLayerInset = (m) => {
    if (m.imagePaddingMode === 'individual') {
        const top = m.imagePaddingTop ?? m.imagePaddingV ?? 0;
        const right = m.imagePaddingRight ?? m.imagePaddingH ?? 0;
        const bottom = m.imagePaddingBottom ?? m.imagePaddingV ?? 0;
        const left = m.imagePaddingLeft ?? m.imagePaddingH ?? 0;
        return `${top}px ${right}px ${bottom}px ${left}px`;
    }
    const h = m.imagePaddingH ?? 0;
    const v = m.imagePaddingV ?? 0;
    return `${v}px ${h}px`;
};

// Get max padding value from layer config
const getMaxPadding = (m, prefix) => {
    return Math.max(
        parseFloat(m[`${prefix}PaddingV`]) || 0,
        parseFloat(m[`${prefix}PaddingH`]) || 0,
        parseFloat(m[`${prefix}PaddingTop`]) || 0,
        parseFloat(m[`${prefix}PaddingRight`]) || 0,
        parseFloat(m[`${prefix}PaddingBottom`]) || 0,
        parseFloat(m[`${prefix}PaddingLeft`]) || 0
    );
};

// Get border radius for a specific layer
const getLayerBorderRadius = (m, prefix) => {
    const r = parseFloat(m.borderRadius) || 0;
    const maxPadding = getMaxPadding(m, prefix);
    return Math.max(0, r - maxPadding);
};

const MessageContainer = styled.div`
    position: relative;
    display: flex;
    width: auto;

    margin: ${({theme, $index = 0}) => {
        const rm = theme.redeemMessage[$index];
        return `${rm.marginV}px ${rm.marginH}px`;
    }};

    backdrop-filter: ${({theme}) => {
        const am = theme.allMessages;
        return am?.blurRadius > 0 ? `blur(${am.blurRadius}px)` : 'none';
    }};
`;

// Z-index 0: Color background layer with border, shadow, borderRadius
const ColorLayer = styled.div`
    position: absolute;
    inset: ${({ theme, $index = 0 }) => getColorLayerInset(theme.redeemMessage[$index])};
    z-index: 0;

    background-color: ${({ theme, $index = 0 }) => {
        const m = theme.redeemMessage[$index];
        return hexToRgba(m.backgroundColor, m.backgroundOpacity);
    }};

    border-radius: ${({ theme, $index = 0 }) => getLayerBorderRadius(theme.redeemMessage[$index], 'colorBg')}px;

    border: 1px solid ${({ theme, $index = 0 }) => {
        const m = theme.redeemMessage[$index];
        return hexToRgba(m.borderColor, m.borderOpacity);
    }};

    box-shadow: ${({ theme, $index = 0 }) => {
        const m = theme.redeemMessage[$index];
        return `0 0 ${m.shadowRadius}px ${hexToRgba(m.shadowColor, m.shadowOpacity)}`;
    }};
`;

// Z-index 1: Gradient background layer
const GradientLayer = styled.div`
    position: absolute;
    inset: ${({ theme, $index = 0 }) => getGradientLayerInset(theme.redeemMessage[$index])};
    z-index: 1;
    overflow: hidden;
    pointer-events: none;

    border-radius: ${({ theme, $index = 0 }) => getLayerBorderRadius(theme.redeemMessage[$index], 'gradient')}px;

    ${({theme, $index = 0}) => generateGradientCSS(theme.redeemMessage[$index])}
`;

// Z-index 2: Image background layer
const ImageLayer = styled.div`
    position: absolute;
    inset: ${({ theme, $index = 0 }) => getImageLayerInset(theme.redeemMessage[$index])};
    z-index: 2;
    overflow: hidden;
    pointer-events: none;

    border-radius: ${({ theme, $index = 0 }) => getLayerBorderRadius(theme.redeemMessage[$index], 'image')}px;

    ${({theme, $index = 0}) => getLayeredBackgroundStyles(theme.redeemMessage[$index])}
`;

// Z-index 3: Content layer
const Content = styled.div`
    position: relative;
    z-index: 3;

    display: flex;
    flex-direction: ${({theme, $index = 0}) => theme.redeemMessage[$index].direction};
    align-items: flex-start;

    padding: ${({theme, $index = 0}) => {
        const rm = theme.redeemMessage[$index];
        if (rm.paddingMode === 'individual') {
            const top = rm.paddingTop ?? rm.paddingV ?? 0;
            const right = rm.paddingRight ?? rm.paddingH ?? 0;
            const bottom = rm.paddingBottom ?? rm.paddingV ?? 0;
            const left = rm.paddingLeft ?? rm.paddingH ?? 0;
            return `${top}px ${right}px ${bottom}px ${left}px`;
        }
        return `${rm.paddingV}px ${rm.paddingH}px`;
    }};

    width: 100%;
    box-sizing: border-box;

    font-size: ${({theme, $index = 0}) => theme.redeemMessage[$index].fontSize}px;
    font-family: ${({theme, $index = 0}) => theme.redeemMessage[$index].messageFont.family ?? "sans-serif"};
    color: ${({theme, $index}) => {
        const defaultColor = theme.allMessages?.textColor ?? '#fff'
        const m = theme.redeemMessage[$index];
        return hexToRgba(m.messageFont.color ?? defaultColor, m.messageFont.opacity ?? 1);
    }};

    text-shadow: ${({theme, $index}) => {
        if (!theme.allMessages) return 'none';
        const {
            textShadowColor,
            textShadowOpacity,
            textShadowRadius,
            textShadowXPosition,
            textShadowYPosition
        } = theme.allMessages;
        const m = theme.redeemMessage[$index];
        const shadowColor = m.messageFont?.shadowColor ?? textShadowColor ?? '#000';
        const shadowOpacity = m.messageFont?.shadowOpacity ?? textShadowOpacity ?? 0;
        const shadowRadius = m.messageFont?.shadowRadius ?? textShadowRadius ?? 0;
        return `${textShadowXPosition}px ${textShadowYPosition}px ${shadowRadius}px ${hexToRgba(shadowColor, shadowOpacity)}`;
    }};
`;

export default function ChatRedemption({
                                           message,
                                           currentTheme,
                                           index = 0
                                       }) {
    function applyTemplate(template, data) {
        try {
            return template.replace(/\{(\w+)}/g, (_, key) => {
                return key in data ? data[key] : `{${key}}`;
            });
        } catch (error) {
            console.log("Error applying template:", template, data);
            console.error("Error applying template:", error);
            return 'format error';
        }
    }

    const _index = currentTheme?.redeemMessage?.length > index ? index : 0;
    const template = currentTheme.redeemMessage[_index].template;
    const rendered = applyTemplate(template, {
        userName: message.userName,
        cost: message.reward.cost,
        title: message.reward.title
    });

    return (
        <MessageContainer $index={_index}>
            {/* Background layers */}
            <ColorLayer $index={_index} />
            <GradientLayer $index={_index} />
            <ImageLayer $index={_index} />

            {/* Content layer */}
            <Content $index={_index}>
                {rendered}
            </Content>
        </MessageContainer>
    );
}
