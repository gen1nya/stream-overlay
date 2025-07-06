import React, {useState} from 'react';
import styled from 'styled-components';
import {hexToRgba} from "../../utils";
import {defaultTheme} from "../../theme";

const MessageContainer = styled.div`
    ${({theme, $index = 0}) => {
        const rm = theme.redeemMessage[$index];
        const am = theme.allMessages;

        return `
            padding: ${rm.paddingV}px ${rm.paddingH}px;
            display: flex;
            width: auto;
            margin: ${rm.marginV}px ${rm.marginH}px;
            border-radius: ${rm.borderRadius}px;
            align-items: flex-start;
            flex-direction: ${rm.direction};
            border: 1px solid ${hexToRgba(rm.borderColor, rm.borderOpacity)};
            background: ${hexToRgba(rm.backgroundColor, rm.backgroundOpacity)};
            box-shadow: 0 0 ${rm.shadowRadius}px ${hexToRgba(rm.shadowColor, rm.shadowOpacity)};
            font-style: italic;
            font-size: ${rm.fontSize}px;
            color: ${am?.textColor ?? '#fff'};
            text-shadow: ${
                    am
                            ? `${am.textShadowXPosition}px ${am.textShadowYPosition}px ${am.textShadowRadius}px ${hexToRgba(am.textShadowColor, am.textShadowOpacity)}`
                            : 'none'
            };
            backdrop-filter: ${
                    am?.blurRadius && am.blurRadius > 0
                            ? `blur(${am.blurRadius}px)`
                            : 'none'
            };
        `;
    }}
`;

export default function ChatRedemption({
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

    const _index = currentTheme?.redeemMessage?.length > index ? index : 0;
    const template = currentTheme.redeemMessage[_index].template;
    const rendered = applyTemplate(template, {
        userName: message.userName,
        cost: message.reward.cost,
        title: message.reward.title
    });

    return (
        <MessageContainer $index={_index}>
            {rendered}
        </MessageContainer>
    );
}
