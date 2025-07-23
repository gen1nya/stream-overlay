import React from 'react';
import styled, {css} from 'styled-components';
import {getLayeredBackgroundStyles, hexToRgba} from "../../utils.js";

const Text = styled.span`
    font-size: ${({theme, $index}) => theme.followMessage[$index].fontSize}px;
    font-family: ${({theme, $index}) => theme.followMessage[$index].messageFont.family};
    color: ${({theme}) => theme.allMessages?.textColor ?? '#fff'};
    text-shadow: ${({theme}) => {
        if (!theme.allMessages) return 'none';
        const {
            textShadowColor,
            textShadowOpacity,
            textShadowRadius,
            textShadowXPosition,
            textShadowYPosition
        } = theme.allMessages;
        return `${textShadowXPosition}px ${textShadowYPosition}px ${textShadowRadius}px ${hexToRgba(textShadowColor, textShadowOpacity)}`;
    }};
`;

const MessageContainer = styled.div`
    position: relative;
    display: flex;
    width: auto;

    margin: ${({theme, $index}) => {
        const m = theme.followMessage[$index];
        return `${m.marginV}px ${m.marginH}px`;
    }};

    border-radius: ${({theme, $index}) => theme.followMessage[$index].borderRadius}px;

    border: 1px solid ${({theme, $index}) => {
        const m = theme.followMessage[$index];
        return hexToRgba(m.borderColor, m.borderOpacity);
    }};

    background-color: ${({theme, $index}) => {
        const m = theme.followMessage[$index];
        return hexToRgba(m.backgroundColor, m.backgroundOpacity);
    }};

    ${({ theme, $index }) => getLayeredBackgroundStyles(theme.followMessage[$index])}

    box-shadow: ${({theme, $index}) => {
        const m = theme.followMessage[$index];
        return `0 0 ${m.shadowRadius}px ${hexToRgba(m.shadowColor, m.shadowOpacity)}`;
    }};

    backdrop-filter: ${({theme}) =>
            theme.allMessages?.blurRadius > 0
                    ? `blur(${theme.allMessages.blurRadius}px)`
                    : 'none'};
`;

const Content = styled.div`
    display: flex;
    align-items: flex-start;

    padding: ${({theme, $index}) => {
        const m = theme.followMessage[$index];
        return `${m.paddingV}px ${m.paddingH}px`;
    }};

    width: 100%;
    box-sizing: border-box;
`;

export default function ChatMessage({
                                        message,
                                        currentTheme,
                                        index = 0
                                    }) {
    function applyTemplate(template, data) {
        try {
            return template.replace(/\{(\w+)}/g, (_, key) =>
                key in data ? data[key] : `{${key}}`
            );
        } catch (error) {
            console.error("Error applying template:", error);
            return 'format error';
        }
    }

    const _index = currentTheme?.followMessage?.length > index ? index : 0;
    const template = currentTheme.followMessage[_index].template;
    const rendered = applyTemplate(template, {userName: message.userName});

    return (
        <MessageContainer $index={_index}>
            <Content $index={_index}>
                <Text $index={_index}>{rendered}</Text>
            </Content>
        </MessageContainer>
    );
}
