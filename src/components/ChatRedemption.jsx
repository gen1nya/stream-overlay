import React from 'react';
import styled from 'styled-components';

const MessageContainer = styled.div`
    margin-bottom: 10px;
    padding: 2px 6px;
    display: flex;
    align-items: center;
    border-radius: 6px;
    color: #feb7b7;
    border: #ff2e2e solid 1px;
    background: #822b2b;
    box-shadow: rgba(114, 38, 38, 0.5) 0 0 15px;
    font-style: italic;
`;

export default function ChatRedemption({ message }) {
    return (
        <MessageContainer>
            🎉 {message.userName} spend {message.reward.cost} to {message.reward.title}
        </MessageContainer>
    );
}
