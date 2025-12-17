import React from 'react';
import {generateGradientCSS, getLayeredBackgroundStyles, hexToRgba} from "../../utils.js";
import styled, { css, useTheme } from 'styled-components';

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

    margin: ${({ theme }) =>
            `${theme.chatMessage.marginV}px ${theme.chatMessage.marginH}px`};

    backdrop-filter: ${({ theme }) =>
            theme.allMessages?.blurRadius > 0
                    ? `blur(${theme.allMessages.blurRadius}px)`
                    : 'none'};
`;

// Z-index 0: Color background layer with border, shadow, borderRadius
const ColorLayer = styled.div`
    position: absolute;
    inset: ${({ theme }) => getColorLayerInset(theme.chatMessage)};
    z-index: 0;

    background-color: ${({ theme }) =>
            hexToRgba(theme.chatMessage.backgroundColor, theme.chatMessage.backgroundOpacity)};

    border-radius: ${({ theme }) => getLayerBorderRadius(theme.chatMessage, 'colorBg')}px;

    border: 1px solid ${({ theme }) =>
            hexToRgba(theme.chatMessage.borderColor, theme.chatMessage.borderOpacity)};

    box-shadow: ${({ theme }) => {
        const { shadowColor, shadowOpacity, shadowRadius } = theme.chatMessage;
        return `0 0 ${shadowRadius}px ${hexToRgba(shadowColor, shadowOpacity)}`;
    }};
`;

// Z-index 1: Gradient background layer
const GradientLayer = styled.div`
    position: absolute;
    inset: ${({ theme }) => getGradientLayerInset(theme.chatMessage)};
    z-index: 1;
    overflow: hidden;
    pointer-events: none;

    border-radius: ${({ theme }) => getLayerBorderRadius(theme.chatMessage, 'gradient')}px;

    ${({ theme }) => generateGradientCSS(theme.chatMessage)}
`;

// Z-index 2: Image background layer
const ImageLayer = styled.div`
    position: absolute;
    inset: ${({ theme }) => getImageLayerInset(theme.chatMessage)};
    z-index: 2;
    overflow: hidden;
    pointer-events: none;

    border-radius: ${({ theme }) => getLayerBorderRadius(theme.chatMessage, 'image')}px;

    ${({ theme }) => getLayeredBackgroundStyles(theme.chatMessage)}
`;

// Z-index 3: Content layer
const Content = styled.div`
    position: relative;
    z-index: 3;

    display: flex;
    flex-direction: ${({theme}) => theme.chatMessage.direction};
    align-items: flex-start;

    padding: ${({theme}) => {
        const m = theme.chatMessage;
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


const TitleContainer = styled.div`
    font-size: ${({ theme }) => theme.chatMessage.titleFontSize}px;
    font-family: ${({ theme }) => theme.chatMessage.titleFont.family ?? "sans-serif"};
    background: ${({ $tcolor, theme }) =>
            theme.chatMessage.titleBackgroundMode === "solid" ? $tcolor : "transparent"};
    border-radius: 8px;
    padding: ${({ theme }) => {
        const m = theme.chatMessage;
        if (m.headerPaddingMode === 'individual') {
            const top = m.headerPaddingTop ?? m.headerPaddingV ?? 0;
            const right = m.headerPaddingRight ?? m.headerPaddingH ?? 0;
            const bottom = m.headerPaddingBottom ?? m.headerPaddingV ?? 0;
            const left = m.headerPaddingLeft ?? m.headerPaddingH ?? 6;
            return `${top}px ${right}px ${bottom}px ${left}px`;
        }
        const v = m.headerPaddingV ?? 0;
        const h = m.headerPaddingH ?? 6;
        return `${v}px ${h}px`;
    }};
    transform: ${({ theme }) => {
        const m = theme.chatMessage;
        const x = m.headerOffsetX ?? 0;
        const y = m.headerOffsetY ?? 0;
        return x === 0 && y === 0 ? 'none' : `translate(${x}px, ${y}px)`;
    }};
    display: flex;
    align-items: center;
    flex-direction: row;
`;

const ChannelAvatar = styled.img`
    height: 1em;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    margin-right: 4px;
    vertical-align: middle;
    display: inline-block;
`;

const BadgeContainer = styled.span`
    display: flex;
    align-items: center;
    gap: 2px;
    margin-right: 6px;
`;

const Username = styled.span`
    display: flex;
    align-items: center;
    font-weight: bold;
    margin-right: 6px;
    font-size: ${({theme}) => theme.chatMessage.titleFontSize}px;
    color: ${props => props.color || '#fff'};
`;

const MessageText = styled.span`
    display: inline-block;
    font-family: ${({theme}) => theme.chatMessage.messageFont.family ?? "sans-serif"};
    text-shadow: ${({theme}) => {
        if (!theme.allMessages) {
            return 'none';
        }
        const {
            textShadowColor,
            textShadowOpacity,
            textShadowRadius,
            textShadowXPosition,
            textShadowYPosition
        } = theme.allMessages;
        const m = theme.chatMessage;
        const shadowColor = m.messageFont?.shadowColor ?? textShadowColor ?? '#000';
        const shadowOpacity = m.messageFont?.shadowOpacity ?? textShadowOpacity ?? 0;
        const shadowRadius = m.messageFont?.shadowRadius ?? textShadowRadius ?? 0;
        return `${textShadowXPosition}px ${textShadowYPosition}px ${shadowRadius}px ${hexToRgba(shadowColor, shadowOpacity)}`;
    }};
    color: ${({theme}) => {
        const defaultColor = theme.allMessages?.textColor ?? '#fff';
        return hexToRgba(theme.chatMessage.messageFont.color ?? defaultColor, theme.chatMessage.messageFont.opacity ?? 1);
    }};
    font-size: ${({theme}) => theme.chatMessage.fontSize}px;
    padding: ${({theme}) => {
        const m = theme.chatMessage;
        if (m.textPaddingMode === 'individual') {
            const top = m.textPaddingTop ?? m.textPaddingV ?? 0;
            const right = m.textPaddingRight ?? m.textPaddingH ?? 0;
            const bottom = m.textPaddingBottom ?? m.textPaddingV ?? 0;
            const left = m.textPaddingLeft ?? m.textPaddingH ?? 0;
            return `${top}px ${right}px ${bottom}px ${left}px`;
        }
        const v = m.textPaddingV ?? 0;
        const h = m.textPaddingH ?? 0;
        return `${v}px ${h}px`;
    }};
    transform: ${({ theme }) => {
        const m = theme.chatMessage;
        const x = m.textOffsetX ?? 0;
        const y = m.textOffsetY ?? 0;
        return x === 0 && y === 0 ? 'none' : `translate(${x}px, ${y}px)`;
    }};
    overflow-wrap: anywhere;
    img {
        height: 1em;
    }
`;

export function getBackgroundForTextColor(hex) {
    if (!hex) return "#000000";

    const cleanHex = hex.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    // Гамма-коррекция (sRGB -> линейное)
    const linear = (v) =>
        v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

    const R = linear(r);
    const G = linear(g);
    const B = linear(b);

    // Относительная яркость по WCAG
    const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;

    // Порог 0.179 — это рекомендация WCAG
    return luminance > 0.179 ? "#0d001a" : "#e7e5ea";
}

export default function ChatMessage({ message, showSourceChannel, onClick }) {
    return (
        <MessageContainer
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            {/* Background layers */}
            <ColorLayer />
            <GradientLayer />
            <ImageLayer />

            {/* Content layer */}
            <Content>
                <TitleContainer $tcolor={getBackgroundForTextColor(message.color)}>
                    {message.sourceChannel?.avatarUrl && showSourceChannel && (
                        <ChannelAvatar
                            src={message.sourceChannel.avatarUrl}
                            alt={message.sourceChannel.displayName}
                        />
                    )}
                    <BadgeContainer
                        dangerouslySetInnerHTML={{ __html: message.htmlBadges }}
                    />
                    <Username color={message.color}>{message.userName}:</Username>
                </TitleContainer>
                <MessageText dangerouslySetInnerHTML={{__html: message.htmlMessage}}/>
            </Content>
        </MessageContainer>
    );
}
