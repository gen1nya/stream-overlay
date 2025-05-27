import React from 'react';
import styled from 'styled-components';

const MessageContainer = styled.div`
    padding: 2px 6px;
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

function hexToRgba(hex, opacity) {
    const cleanHex = hex.replace('#', '');
    const bigint = parseInt(cleanHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

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