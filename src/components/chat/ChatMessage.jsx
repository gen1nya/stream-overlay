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
    font-size: ${({theme}) => theme.chatMessage.titleFontSize}px;
    font-family: ${({theme}) => theme.chatMessage.titleFont.family ?? "sans-serif"};
    display: flex;
    align-items: center;
    flex-direction: row;
`

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
    img {
        height: 1em;
    }
`;

export default function ChatMessage({ message, showSourceChannel }) {
    return (
        <MessageContainer>
            <Content>
            <TitleContainer>
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