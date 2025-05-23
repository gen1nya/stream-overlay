import React from 'react';
import styled from 'styled-components';

const MessageContainer = styled.div`
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
`;

export default function ChatMessage({ message }) {
    return (
        <MessageContainer>
            🎉 {message.userName} just followed!
        </MessageContainer>
    );
}
