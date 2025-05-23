import React from 'react';
import styled from 'styled-components';

const MessageContainer = styled.div`
    padding: 2px 6px;
    display: flex;
    width: auto;
    margin: ${({ theme }) => {
        return `${theme.chatMessage.marginV}px ${theme.chatMessage.marginH}px`;
    }};
    border-radius: ${({ theme }) => theme.chatMessage.borderRadius}px;
    align-items: flex-start;
    flex-direction: ${({ theme}) => theme.chatMessage.direction};
    border: ${({ theme }) => theme.chatMessage.borderColor } solid 1px;
    background: ${({ theme }) => theme.chatMessage.backgroundColor};
    box-shadow: ${({ theme }) => {
        const { shadowColor, shadowOpacity, shadowRadius } = theme.chatMessage;

        // Преобразуем HEX в RGB:
        const hexToRgb = (hex) => {
            const cleanHex = hex.replace('#', '');
            const bigint = parseInt(cleanHex, 16);
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            return `${r}, ${g}, ${b}`;
        };

        const rgb = hexToRgb(shadowColor);
        return `rgba(${rgb}, ${shadowOpacity}) 0 0 ${shadowRadius}px`;
    }};
`;

const TitleContainer = styled.div`
    display: flex;
    flex-direction: row;
`

const Username = styled.span`
    font-weight: bold;
    margin-right: 6px;
    color: ${props => props.color || '#fff'};
`;

const MessageText = styled.span`
    display: inline-block;
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