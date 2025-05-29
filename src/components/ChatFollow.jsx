import React from 'react';
import styled from 'styled-components';
import {hexToRgba} from "../utils.js";

/*const MessageContainer = styled.div`
    margin-bottom: 10px;
    padding: 2px 6px;
    display: flex;
    align-items: center;
    border-radius: 6px;
    color: #96f8bb;
    border: #5bf253 solid 1px;
    background: #2f802c;
    box-shadow: rgba(91, 242, 83, 0.5) 0 0 15px;
    font-style: italic;
`;*/


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
`;

export default function ChatMessage({ message }) {
    return (
        <MessageContainer>
            🎉 {message.userName} just followed!
        </MessageContainer>
    );
}
