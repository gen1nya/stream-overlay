import React from 'react';
import styled from 'styled-components';
import {hexToRgba} from "../utils.js";

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
`;

const TitleContainer = styled.div`
    display: flex;
    flex-direction: row;
`

const Username = styled.span`
    font-weight: bold;
    margin-right: 6px;
    font-size: ${({theme}) => theme.chatMessage.titleFontSize}px;
    color: ${props => props.color || '#fff'};
`;

const MessageText = styled.span`
    display: inline-block;
    font-size: ${({theme}) => theme.chatMessage.fontSize}px;
`;

export default function ChatMessage({ message }) {
    return (
        <MessageContainer>
            <TitleContainer>
                <span dangerouslySetInnerHTML={{__html: message.htmlBadges}}/>
                <Username color={message.color}>{message.username}:</Username>
            </TitleContainer>
            <MessageText dangerouslySetInnerHTML={{__html: message.htmlMessage}}/>
        </MessageContainer>
    );
}