import React from 'react';
import styled, { css } from 'styled-components';
import { hexToRgba } from '../../utils.js';

// ─── Helpers ──────────────────────────────────────────────────────

const insetStr = (i) => `${i.top}px ${i.right}px ${i.bottom}px ${i.left}px`;

function v2GradientCSS(gradientCfg) {
    const { gradients = [] } = gradientCfg;
    if (!gradients.length) return '';
    const g = gradients[0];
    const stops = g.stops
        .map(s => `${hexToRgba(s.color, s.alpha)} ${s.position}%`)
        .join(', ');
    if (g.type === 'linear') {
        return `linear-gradient(${g.angle}deg, ${stops})`;
    }
    return `radial-gradient(circle at ${g.center.x}% ${g.center.y}%, ${stops})`;
}

function getAutoHeaderBg(hex) {
    if (!hex) return '#000000';
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    const linear = (v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    const lum = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    return lum > 0.179 ? '#0d001a' : '#e7e5ea';
}

// ─── Styled: Wrapper ──────────────────────────────────────────────

const Wrapper = styled.div`
    position: relative;
    display: flex;
    flex-direction: ${({ $cfg }) => {
        const { position, layout } = $cfg.content.header;
        if (position === 'outside' && layout === 'left') return 'row';
        return 'column';
    }};
    align-items: ${({ $cfg }) => {
        const { position, layout } = $cfg.content.header;
        if (position === 'outside' && layout === 'left') return 'flex-start';
        return 'stretch';
    }};
    width: auto;
    margin: ${({ $cfg }) =>
        `${$cfg.background.margin.vertical}px ${$cfg.background.margin.horizontal}px`};
`;

// ─── Styled: Content (background container) ───────────────────────

const Content = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    padding: ${({ $cfg }) => insetStr($cfg.background.padding)};
    min-width: 0;
    flex: 1;
`;

// ─── Styled: Background layers (absolute inside Content) ──────────

const BgLayerBase = styled.div`
    position: absolute;
    pointer-events: none;
    overflow: hidden;
`;

const ColorBgLayer = styled(BgLayerBase)`
    z-index: 0;
    inset: ${({ $cfg }) => insetStr($cfg.background.layerInset.color)};
    ${({ $cfg }) => {
        const c = $cfg.background.color;
        return css`
            background-color: ${hexToRgba(c.color, c.opacity)};
            border-radius: ${c.borderRadius}px;
            border: 1px solid ${hexToRgba(c.borderColor, c.borderOpacity)};
            box-shadow: 0 0 ${c.shadowRadius}px ${hexToRgba(c.shadowColor, c.shadowOpacity)};
        `;
    }}
`;

const GradientBgLayer = styled(BgLayerBase)`
    z-index: 1;
    inset: ${({ $cfg }) => insetStr($cfg.background.layerInset.gradient)};
    ${({ $cfg }) => {
        const grad = v2GradientCSS($cfg.background.gradient);
        if (!grad) return '';
        return css`background: ${grad};`;
    }}
    border-radius: ${({ $cfg }) => $cfg.background.color.borderRadius}px;
`;

const ImageBgLayer = styled(BgLayerBase)`
    z-index: 2;
    inset: ${({ $cfg }) => insetStr($cfg.background.layerInset.image)};
    ${({ $cfg }) => {
        const img = $cfg.background.image;
        if (!img.src) return '';
        return css`
            background-color: ${img.backgroundColor};
            background-image: url(${img.src});
            background-size: 100% 100%;
            background-repeat: no-repeat;
            border: ${img.borderWidth}px solid ${img.borderColor};
            border-radius: ${img.borderRadius}px;
            box-shadow: 0 0 ${img.shadowRadius}px ${img.shadowColor};
        `;
    }}
`;

// ─── Styled: Content inner (above bg layers) ──────────────────────

const ContentInner = styled.div`
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: ${({ $cfg }) => {
        const { position, layout } = $cfg.content.header;
        if (position === 'inside' && layout === 'left') return 'row';
        return 'column';
    }};
    align-items: ${({ $cfg }) => {
        const { position, layout } = $cfg.content.header;
        if (position === 'inside' && layout === 'left') return 'flex-start';
        return 'stretch';
    }};
`;

// ─── Styled: Decor images ─────────────────────────────────────────

const DecorWrapper = styled.div`
    position: absolute;
    left: 0;
    right: 0;
    pointer-events: none;
    z-index: 4;
    ${({ $placement }) => $placement === 'top' ? 'top: 0;' : 'bottom: 0;'}
    transform: ${({ $translate }) =>
        ($translate.x === 0 && $translate.y === 0)
            ? 'none'
            : `translate(${$translate.x}px, ${$translate.y}px)`};
`;

const DecorImg = styled.img`
    display: block;
    width: 100%;
    height: auto;
`;

// ─── Styled: Header ───────────────────────────────────────────────

const HeaderOuter = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    align-self: ${({ $cfg }) => {
        const align = $cfg.content.header.align;
        if (align === 'center') return 'center';
        if (align === 'right') return 'flex-end';
        return 'flex-start';
    }};
    transform: ${({ $cfg }) => {
        const t = $cfg.content.header.translate;
        return (t.x === 0 && t.y === 0) ? 'none' : `translate(${t.x}px, ${t.y}px)`;
    }};
    gap: ${({ $cfg }) => {
        const e = $cfg.content.header.emotes;
        return e.position === 'outside' ? `${e.gap}px` : '0';
    }};
`;

const HeaderBox = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    font-size: ${({ $cfg }) => $cfg.content.header.font.size}px;
    font-family: ${({ $cfg }) => $cfg.content.header.font.family || 'sans-serif'};

    ${({ $cfg }) => {
        const bg = $cfg.content.header.background;
        if (!bg.enabled) return '';
        return css`
            background: ${hexToRgba(bg.color, bg.opacity)};
            border: ${bg.borderWidth}px solid ${hexToRgba(bg.borderColor, bg.borderOpacity)};
            border-radius: ${bg.borderRadius}px;
            box-shadow: 0 0 ${bg.shadowRadius}px ${hexToRgba(bg.shadowColor, bg.shadowOpacity)};
            padding: ${bg.paddingV ?? 2}px ${bg.paddingH ?? 6}px;
        `;
    }}
`;

const BadgeContainer = styled.span`
    display: flex;
    align-items: center;
    gap: 2px;
    margin-right: 6px;

    img {
        height: ${({ $cfg }) => $cfg.content.header.font.size}px !important;
        width: auto !important;
        vertical-align: middle;
    }
`;

const Username = styled.span`
    display: flex;
    align-items: center;
    font-weight: bold;
    margin-right: 6px;
    color: ${({ $color }) => $color || '#fff'};
`;

// ─── Styled: Emotes container (outside header) ───────────────────

const EmotesOutside = styled.div`
    display: flex;
    align-items: center;
    font-size: ${({ $cfg }) => $cfg.content.header.font.size}px;
    font-family: ${({ $cfg }) => $cfg.content.header.font.family || 'sans-serif'};
    background: ${({ $cfg }) => {
        const bg = $cfg.content.header.background;
        return bg.enabled ? hexToRgba(bg.color, bg.opacity) : 'transparent';
    }};
    border: ${({ $cfg }) => {
        const bg = $cfg.content.header.background;
        return bg.enabled ? `${bg.borderWidth}px solid ${hexToRgba(bg.borderColor, bg.borderOpacity)}` : 'none';
    }};
    border-radius: ${({ $cfg }) => {
        const bg = $cfg.content.header.background;
        return bg.enabled ? `${bg.borderRadius}px` : '0';
    }};
    box-shadow: ${({ $cfg }) => {
        const bg = $cfg.content.header.background;
        return bg.enabled ? `0 0 ${bg.shadowRadius}px ${hexToRgba(bg.shadowColor, bg.shadowOpacity)}` : 'none';
    }};
    padding: ${({ $cfg }) => {
        const bg = $cfg.content.header.background;
        return bg.enabled ? `${bg.paddingV ?? 2}px ${bg.paddingH ?? 6}px` : '0';
    }};

    &::before {
        content: '\\200b';
    }

    img {
        height: ${({ $cfg }) => $cfg.content.header.font.size}px !important;
        width: auto !important;
        vertical-align: middle;
    }
`;

// ─── Styled: Message text ─────────────────────────────────────────

const MessageText = styled.span`
    position: relative;
    z-index: 3;
    display: inline-block;
    font-family: ${({ $cfg }) => $cfg.content.text.font.family || 'sans-serif'};
    font-size: ${({ $cfg }) => $cfg.content.text.font.size}px;
    color: ${({ $cfg }) => hexToRgba($cfg.content.text.color, $cfg.content.text.opacity)};
    text-align: ${({ $cfg }) => $cfg.content.text.align};
    text-shadow: ${({ $cfg }) => {
        const t = $cfg.content.text;
        if (t.shadowOpacity === 0 && t.shadowRadius === 0) return 'none';
        return `0 0 ${t.shadowRadius}px ${hexToRgba(t.shadowColor, t.shadowOpacity)}`;
    }};
    overflow-wrap: anywhere;
    ${({ $cfg }) => {
        const { position, layout } = $cfg.content.header;
        if (position === 'inside' && layout === 'left') return 'flex: 1; min-width: 0;';
        return '';
    }}

    img {
        height: ${({ $cfg }) => $cfg.content.text.emoteSize}px !important;
        width: auto !important;
        vertical-align: middle;
    }
`;

// ─── Component ────────────────────────────────────────────────────

export default function ChatMessageV2({ message, showSourceChannel, onClick, v2Config }) {
    const cfg = v2Config;
    const { header } = cfg.content;
    const headerIsOutside = header.position === 'outside';

    const nameColor = header.customColor.enabled
        ? header.customColor.color
        : message.color;

    const tcolor = getAutoHeaderBg(message.color);

    // Build header element
    const headerElement = (
        <HeaderOuter $cfg={cfg}>
            {header.emotes.position === 'outside' && header.emotes.placement === 'left' && message.htmlBadges && (
                <EmotesOutside $cfg={cfg} dangerouslySetInnerHTML={{ __html: message.htmlBadges }} />
            )}
            <HeaderBox $cfg={cfg} $tcolor={tcolor}>
                {header.emotes.position === 'inside' && message.htmlBadges && (
                    <BadgeContainer $cfg={cfg} dangerouslySetInnerHTML={{ __html: message.htmlBadges }} />
                )}
                <Username $color={nameColor}>{message.userName}:</Username>
            </HeaderBox>
            {header.emotes.position === 'outside' && header.emotes.placement === 'right' && message.htmlBadges && (
                <EmotesOutside $cfg={cfg} dangerouslySetInnerHTML={{ __html: message.htmlBadges }} />
            )}
        </HeaderOuter>
    );

    // Background layers (only render active type + always render color as base)
    const bgType = cfg.background.type;

    return (
        <Wrapper $cfg={cfg} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
            {/* Header outside: render before Content */}
            {headerIsOutside && headerElement}

            <Content $cfg={cfg}>
                {/* Background layers */}
                <ColorBgLayer $cfg={cfg} />
                {bgType === 'gradient' && <GradientBgLayer $cfg={cfg} />}
                {bgType === 'image' && <ImageBgLayer $cfg={cfg} />}

                {/* Decor images — absolute, under content, ignore padding */}
                {cfg.background.headerDecor.image && (
                    <DecorWrapper
                        $translate={cfg.background.headerDecor.translate}
                        $placement="top"
                    >
                        <DecorImg src={cfg.background.headerDecor.image} alt="" />
                    </DecorWrapper>
                )}
                {cfg.background.footerDecor.image && (
                    <DecorWrapper
                        $translate={cfg.background.footerDecor.translate}
                        $placement="bottom"
                    >
                        <DecorImg src={cfg.background.footerDecor.image} alt="" />
                    </DecorWrapper>
                )}

                <ContentInner $cfg={cfg}>
                    {/* Header inside */}
                    {!headerIsOutside && headerElement}

                    {/* Message text */}
                    <MessageText
                        $cfg={cfg}
                        dangerouslySetInnerHTML={{ __html: message.htmlMessage }}
                    />
                </ContentInner>
            </Content>
        </Wrapper>
    );
}
