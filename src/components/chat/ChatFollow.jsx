import React from 'react';
import styled from 'styled-components';
import {hexToRgba} from "../../utils.js";

const Text = styled.span`
    font-size: ${({theme}) => theme.followMessage[0].fontSize}px;
    //color: ${({theme}) => theme.followMessage[0].textColor};
    //font-family: ${({theme}) => theme.followMessage[0].fontFamily};
    //font-weight: ${({theme}) => theme.followMessage[0].fontWeight};
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
`;


const MessageContainer = styled.div`
    padding: ${({theme}) => {
        return `${theme.followMessage[0].paddingV}px ${theme.followMessage[0].paddingH}px`;
    }};
    display: flex;
    width: auto;
    margin: ${({theme}) => {
        return `${theme.followMessage[0].marginV}px ${theme.followMessage[0].marginH}px`;
    }};
    border-radius: ${({theme}) => theme.followMessage[0].borderRadius}px;
    align-items: flex-start;
    flex-direction: ${({theme}) => theme.followMessage[0].direction};

    border: 1px solid ${({theme}) => {
        return hexToRgba(theme.followMessage[0].borderColor, theme.followMessage[0].borderOpacity);
    }};
    background: ${({theme}) => {
        return hexToRgba(theme.followMessage[0].backgroundColor, theme.followMessage[0].backgroundOpacity);
    }};
    box-shadow: ${({theme}) => {
        const {shadowColor, shadowOpacity, shadowRadius} = theme.followMessage[0];
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

export default function ChatMessage({ message, template }) {

    function applyTemplate(template, data) {
        try {
            return template.replace(/\{(\w+)}/g, (_, key) => {
                return key in data ? data[key] : `{${key}}`;
            });
        } catch (error) {
            console.log("Error applying template:", template, data);
            console.error("Error applying template:", error);
            return 'format error';
        }
    }

    const rendered = applyTemplate(template, { userName: message.userName });

    return (
        <MessageContainer>
            <Text>{rendered}</Text>
        </MessageContainer>
    );
}
