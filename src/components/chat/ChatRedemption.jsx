import React from 'react';
import styled from 'styled-components';
import {getLayeredBackgroundStyles, hexToRgba} from '../../utils';

const MessageContainer = styled.div`
    position: relative;
    display: flex;
    width: auto;

    margin: ${({theme, $index = 0}) => {
        const rm = theme.redeemMessage[$index];
        return `${rm.marginV}px ${rm.marginH}px`;
    }};

    border-radius: ${({theme, $index = 0}) => theme.redeemMessage[$index].borderRadius}px;

    border: 1px solid ${({theme, $index = 0}) => {
        const rm = theme.redeemMessage[$index];
        return hexToRgba(rm.borderColor, rm.borderOpacity);
    }};

    background-color: ${({theme, $index = 0}) => {
        const rm = theme.redeemMessage[$index];
        return hexToRgba(rm.backgroundColor, rm.backgroundOpacity);
    }};

    ${({theme, $index = 0}) => getLayeredBackgroundStyles(theme.redeemMessage[$index])}

    box-shadow: ${({theme, $index = 0}) => {
        const rm = theme.redeemMessage[$index];
        return `0 0 ${rm.shadowRadius}px ${hexToRgba(rm.shadowColor, rm.shadowOpacity)}`;
    }};

    backdrop-filter: ${({theme}) => {
        const am = theme.allMessages;
        return am?.blurRadius > 0 ? `blur(${am.blurRadius}px)` : 'none';
    }};
`;

const Content = styled.div`
    display: flex;
    flex-direction: ${({theme, $index = 0}) => theme.redeemMessage[$index].direction};
    align-items: flex-start;

    padding: ${({theme, $index = 0}) => {
        const rm = theme.redeemMessage[$index];
        return `${rm.paddingV}px ${rm.paddingH}px`;
    }};

    font-size: ${({theme, $index = 0}) => theme.redeemMessage[$index].fontSize}px;
    font-family: ${({theme, $index = 0}) => theme.redeemMessage[$index].messageFont.family};
    color: ${({theme}) => theme.allMessages?.textColor ?? '#fff'};

    text-shadow: ${({theme}) => {
        const am = theme.allMessages;
        if (!am) return 'none';
        return `${am.textShadowXPosition}px ${am.textShadowYPosition}px ${am.textShadowRadius}px ${hexToRgba(am.textShadowColor, am.textShadowOpacity)}`;
    }};
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
            <Content $index={_index}>
                {rendered}
            </Content>
        </MessageContainer>
    );
}