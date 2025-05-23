import React from 'react';
import styled from 'styled-components';

const MessageContainer = styled.div`
    margin-bottom: 10px;
    padding: 2px 6px;
    display: flex;
    align-items: center;
    border-radius: 6px;
    border: #8553f2 solid 1px;
    background: #311e64;
    box-shadow: rgba(133, 83, 242, 0.2) 0 0 15px;
`;

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
            <span dangerouslySetInnerHTML={{ __html: message.htmlBadges }} />
            <Username color={message.color}>{message.username}:</Username>
            <MessageText dangerouslySetInnerHTML={{ __html: message.htmlMessage }} />
        </MessageContainer>
    );
}