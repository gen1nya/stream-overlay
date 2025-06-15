import React from 'react';
import styled from 'styled-components';
import {hexToRgba} from "../utils.js";

const Text = styled.span`
    font-size: ${({theme}) => theme.followMessage.fontSize}px;
    //color: ${({theme}) => theme.followMessage.textColor};
    //font-family: ${({theme}) => theme.followMessage.fontFamily};
    //font-weight: ${({theme}) => theme.followMessage.fontWeight};
    text-shadow: ${({theme}) => {
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
    color: ${({theme}) => theme.allMessages.textColor};
`;


const MessageContainer = styled.div`
    padding: ${({theme}) => {
        return `${theme.followMessage.paddingV}px ${theme.followMessage.paddingH}px`;
    }};
    display: flex;
    width: auto;
    margin: ${({theme}) => {
        return `${theme.followMessage.marginV}px ${theme.followMessage.marginH}px`;
    }};
    border-radius: ${({theme}) => theme.followMessage.borderRadius}px;
    align-items: flex-start;
    flex-direction: ${({theme}) => theme.followMessage.direction};

    border: 1px solid ${({theme}) => {
        return hexToRgba(theme.followMessage.borderColor, theme.followMessage.borderOpacity);
    }};
    background: ${({theme}) => {
        return hexToRgba(theme.followMessage.backgroundColor, theme.followMessage.backgroundOpacity);
    }};
    box-shadow: ${({theme}) => {
        const {shadowColor, shadowOpacity, shadowRadius} = theme.followMessage;
        return `0 0 ${shadowRadius}px ${hexToRgba(shadowColor, shadowOpacity)}`;
    }};
    backdrop-filter: ${({theme}) => {
        if (theme.allMessages.blurRadius && theme.allMessages.blurRadius > 0) {
            return `blur(${theme.allMessages.blurRadius}px)`;
        } else {
            return 'none';
        }
    }};
`;

export default function ChatMessage({ message }) {
    return (
        <MessageContainer>
            <Text>
                🎉 {message.userName} just followed!
            </Text>

        </MessageContainer>
    );
}
