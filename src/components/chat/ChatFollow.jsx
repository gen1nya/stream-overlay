import React from 'react';
import styled, {css} from 'styled-components';
import {hexToRgba} from "../../utils.js";

const Text = styled.span`
    font-size: ${({theme, $index}) => theme.followMessage[$index].fontSize}px;
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

const getFollowMessageStyle = ({ theme, $index }) => {
    const m = theme.followMessage[$index];
    const blur = theme.allMessages?.blurRadius ?? 0;

    return css`
    padding: ${m.paddingV}px ${m.paddingH}px;
    margin: ${m.marginV}px ${m.marginH}px;
    border-radius: ${m.borderRadius}px;
    flex-direction: ${m.direction};
    border: 1px solid ${hexToRgba(m.borderColor, m.borderOpacity)};
    background: ${hexToRgba(m.backgroundColor, m.backgroundOpacity)};
    box-shadow: 0 0 ${m.shadowRadius}px ${hexToRgba(m.shadowColor, m.shadowOpacity)};
    backdrop-filter: ${blur > 0 ? `blur(${blur}px)` : 'none'};
  `;
};

const MessageContainer = styled.div`
  display: flex;
  width: auto;
  align-items: flex-start;

  ${getFollowMessageStyle}
`;

export default function ChatMessage({
                                        message,
                                        currentTheme,
                                        index = 0
                                    }) {

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

    const _index = currentTheme?.followMessage?.length > index ? index : 0;
    const template = currentTheme.followMessage[_index].template;
    const rendered = applyTemplate(template, { userName: message.userName });

    return (
        <MessageContainer $index={_index}>
            <Text $index={_index}>{rendered}</Text>
        </MessageContainer>
    );
}
