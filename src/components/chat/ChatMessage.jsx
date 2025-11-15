import React from 'react';
import {generateGradientCSS, getLayeredBackgroundStyles, hexToRgba} from "../../utils.js";
import styled, { css } from 'styled-components';

const MessageContainer = styled.div`
    position: relative;
    display: flex;
    width: auto;

    margin: ${({ theme }) =>
            `${theme.chatMessage.marginV}px ${theme.chatMessage.marginH}px`};

    border-radius: ${({ theme }) => theme.chatMessage.borderRadius}px;

    border: 1px solid
    ${({ theme }) =>
            hexToRgba(theme.chatMessage.borderColor, theme.chatMessage.borderOpacity)};
    
    background-color: ${({ theme }) =>
            hexToRgba(theme.chatMessage.backgroundColor, theme.chatMessage.backgroundOpacity)};

    ${({ theme }) => getLayeredBackgroundStyles(theme.chatMessage)}
    ${({ theme }) => generateGradientCSS(theme.chatMessage)}

    box-shadow: ${({ theme }) => {
        const { shadowColor, shadowOpacity, shadowRadius } = theme.chatMessage;
        return `0 0 ${shadowRadius}px ${hexToRgba(shadowColor, shadowOpacity)}`;
    }};

    backdrop-filter: ${({ theme }) =>
            theme.allMessages?.blurRadius > 0
                    ? `blur(${theme.allMessages.blurRadius}px)`
                    : 'none'};
`;

const Content = styled.div`
  display: flex;
  flex-direction: ${({theme}) => theme.chatMessage.direction};
  align-items: flex-start;

  padding: ${({theme}) =>
    `${theme.chatMessage.paddingV}px ${theme.chatMessage.paddingH}px`};

  width: 100%;           /* чтобы фон всегда перекрывался контентом */
  box-sizing: border-box;
`;


const TitleContainer = styled.div`
    font-size: ${({ theme }) => theme.chatMessage.titleFontSize}px;
    font-family: ${({ theme }) => theme.chatMessage.titleFont.family ?? "sans-serif"};
    background: ${({ $tcolor, theme }) =>
            theme.chatMessage.titleBackgroundMode === "solid" ? $tcolor : "transparent"};
    border-radius: 8px;
    padding: 0 0 0 6px;
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
   /* text-shadow: ${({theme}) => {
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
    }};*/
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
        <MessageContainer onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
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