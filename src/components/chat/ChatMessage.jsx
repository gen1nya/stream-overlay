import React from 'react';
import styled from 'styled-components';
import {hexToRgba} from "../../utils.js";

const MessageContainer = styled.div`
    padding: ${({theme}) => { 
        return `${theme.chatMessage.paddingV}px ${theme.chatMessage.paddingH}px`;
    }};
    display: flex;
    width: auto;
    margin: ${({theme}) => {
        return `${theme.chatMessage.marginV}px ${theme.chatMessage.marginH}px`;
    }};
    border-radius: ${({theme}) => theme.chatMessage.borderRadius}px;
    align-items: flex-start;
    flex-direction: ${({theme}) => theme.chatMessage.direction};

    border: 1px solid ${({theme}) => {
        return hexToRgba(theme.chatMessage.borderColor, theme.chatMessage.borderOpacity);
    }};
    background: ${({theme}) => {
        return hexToRgba(theme.chatMessage.backgroundColor, theme.chatMessage.backgroundOpacity);
    }};
    box-shadow: ${({theme}) => {
        const {shadowColor, shadowOpacity, shadowRadius} = theme.chatMessage;
        return `0 0 ${shadowRadius}px ${hexToRgba(shadowColor, shadowOpacity)}`;
    }};
    backdrop-filter: ${({theme}) => {
        if (theme.allMessages?.blurRadius && theme.allMessages?.blurRadius > 0) {
            return `blur(${theme.allMessages.blurRadius}px)`;
        } else {
            return 'none';
        }
    }};
`;

const TitleContainer = styled.div`
    font-size: ${({theme}) => theme.chatMessage.titleFontSize}px;
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
        console.log(theme.allMessages);
        return `${textShadowXPosition}px ${textShadowYPosition}px ${textShadowRadius}px ${hexToRgba(textShadowColor, textShadowOpacity)}`;
    }};
`;

const MessageText = styled.span`
    display: inline-block;
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
        console.log(theme.allMessages);
        return `${textShadowXPosition}px ${textShadowYPosition}px ${textShadowRadius}px ${hexToRgba(textShadowColor, textShadowOpacity)}`;
    }};
    color: ${({theme}) => theme.allMessages?.textColor ?? '#fff'};
    font-size: ${({theme}) => theme.chatMessage.fontSize}px;
    img {
        height: 1em;
    }
`;

export default function ChatMessage({ message, showSourceChannel }) {
    return (
        <MessageContainer>
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
        </MessageContainer>
    );
}