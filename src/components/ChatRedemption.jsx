import React from 'react';
import styled from 'styled-components';
import {hexToRgba} from "../utils";

const MessageContainer = styled.div`
    padding: ${({theme}) => {
        return `${theme.redeemMessage.paddingV}px ${theme.redeemMessage.paddingH}px`;
    }};
    display: flex;
    width: auto;
    margin: ${({theme}) => {
        return `${theme.redeemMessage.marginV}px ${theme.redeemMessage.marginH}px`;
    }};
    border-radius: ${({theme}) => theme.redeemMessage.borderRadius}px;
    align-items: flex-start;
    flex-direction: ${({theme}) => theme.redeemMessage.direction};

    border: 1px solid ${({theme}) => {
        return hexToRgba(theme.redeemMessage.borderColor, theme.redeemMessage.borderOpacity);
    }};
    background: ${({theme}) => {
        return hexToRgba(theme.redeemMessage.backgroundColor, theme.redeemMessage.backgroundOpacity);
    }};
    box-shadow: ${({theme}) => {
        const {shadowColor, shadowOpacity, shadowRadius} = theme.redeemMessage;
        return `0 0 ${shadowRadius}px ${hexToRgba(shadowColor, shadowOpacity)}`;
    }};
    font-style: italic;
    color: ${props => props.color || '#fff'};
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
    backdrop-filter: ${({theme}) => {
        if (theme.allMessages.blurRadius && theme.allMessages.blurRadius > 0) {
            return `blur(${theme.allMessages.blurRadius}px)`;
        } else {
            return 'none';
        }
    }};
`;

export default function ChatRedemption({ message }) {
    return (
        <MessageContainer>
            🎉 {message.userName} потратил {message.reward.cost} опыта на {message.reward.title}
        </MessageContainer>
    );
}
