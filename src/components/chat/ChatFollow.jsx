import React from 'react';
import styled from 'styled-components';
import {generateGradientCSS, getLayeredBackgroundStyles, hexToRgba} from "../../utils.js";

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

const Text = styled.span`
    font-size: ${({theme, $index}) => theme.followMessage[$index].fontSize}px;
    font-family: ${({theme, $index}) => theme.followMessage[$index].messageFont.family ?? "sans-serif"};
    color: ${({theme, $index}) => {
        const defaultColor = theme.allMessages?.textColor ?? '#fff'
        const m = theme.followMessage[$index];
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
        const m = theme.followMessage[$index];
        const shadowColor = m.messageFont?.shadowColor ?? textShadowColor ?? '#000';
        const shadowOpacity = m.messageFont?.shadowOpacity ?? textShadowOpacity ?? 0;
        const shadowRadius = m.messageFont?.shadowRadius ?? textShadowRadius ?? 0;
        return `${textShadowXPosition}px ${textShadowYPosition}px ${shadowRadius}px ${hexToRgba(shadowColor, shadowOpacity)}`;
    }};
`;

const MessageContainer = styled.div`
    position: relative;
    display: flex;
    width: auto;

    margin: ${({theme, $index}) => {
        const m = theme.followMessage[$index];
        return `${m.marginV}px ${m.marginH}px`;
    }};

    backdrop-filter: ${({theme}) =>
            theme.allMessages?.blurRadius > 0
                    ? `blur(${theme.allMessages.blurRadius}px)`
                    : 'none'};
`;

// Z-index 0: Color background layer with border, shadow, borderRadius
const ColorLayer = styled.div`
    position: absolute;
    inset: ${({ theme, $index }) => getColorLayerInset(theme.followMessage[$index])};
    z-index: 0;

    background-color: ${({ theme, $index }) => {
        const m = theme.followMessage[$index];
        return hexToRgba(m.backgroundColor, m.backgroundOpacity);
    }};

    border-radius: ${({ theme, $index }) => getLayerBorderRadius(theme.followMessage[$index], 'colorBg')}px;

    border: 1px solid ${({ theme, $index }) => {
        const m = theme.followMessage[$index];
        return hexToRgba(m.borderColor, m.borderOpacity);
    }};

    box-shadow: ${({ theme, $index }) => {
        const m = theme.followMessage[$index];
        return `0 0 ${m.shadowRadius}px ${hexToRgba(m.shadowColor, m.shadowOpacity)}`;
    }};
`;

// Z-index 1: Gradient background layer
const GradientLayer = styled.div`
    position: absolute;
    inset: ${({ theme, $index }) => getGradientLayerInset(theme.followMessage[$index])};
    z-index: 1;
    overflow: hidden;
    pointer-events: none;

    border-radius: ${({ theme, $index }) => getLayerBorderRadius(theme.followMessage[$index], 'gradient')}px;

    ${({theme, $index}) => generateGradientCSS(theme.followMessage[$index])}
`;

// Z-index 2: Image background layer
const ImageLayer = styled.div`
    position: absolute;
    inset: ${({ theme, $index }) => getImageLayerInset(theme.followMessage[$index])};
    z-index: 2;
    overflow: hidden;
    pointer-events: none;

    border-radius: ${({ theme, $index }) => getLayerBorderRadius(theme.followMessage[$index], 'image')}px;

    ${({theme, $index}) => getLayeredBackgroundStyles(theme.followMessage[$index])}
`;

// Z-index 3: Content layer
const Content = styled.div`
    position: relative;
    z-index: 3;

    display: flex;
    align-items: flex-start;

    padding: ${({theme, $index}) => {
        const m = theme.followMessage[$index];
        if (m.paddingMode === 'individual') {
            const top = m.paddingTop ?? m.paddingV ?? 0;
            const right = m.paddingRight ?? m.paddingH ?? 0;
            const bottom = m.paddingBottom ?? m.paddingV ?? 0;
            const left = m.paddingLeft ?? m.paddingH ?? 0;
            return `${top}px ${right}px ${bottom}px ${left}px`;
        }
        return `${m.paddingV}px ${m.paddingH}px`;
    }};

    width: 100%;
    box-sizing: border-box;
`;

export default function ChatMessage({
                                        message,
                                        currentTheme,
                                        index = 0
                                    }) {
    function applyTemplate(template, data) {
        try {
            return template.replace(/\{(\w+)}/g, (_, key) =>
                key in data ? data[key] : `{${key}}`
            );
        } catch (error) {
            console.error("Error applying template:", error);
            return 'format error';
        }
    }

    const _index = currentTheme?.followMessage?.length > index ? index : 0;
    const template = currentTheme.followMessage[_index].template;
    const rendered = applyTemplate(template, {userName: message.userName});

    return (
        <MessageContainer $index={_index}>
            {/* Background layers */}
            <ColorLayer $index={_index} />
            <GradientLayer $index={_index} />
            <ImageLayer $index={_index} />

            {/* Content layer */}
            <Content $index={_index}>
                <Text $index={_index}>{rendered}</Text>
            </Content>
        </MessageContainer>
    );
}
