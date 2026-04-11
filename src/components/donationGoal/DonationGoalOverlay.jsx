import React, { useState, useMemo } from 'react';
import styled, { css, keyframes, ThemeProvider } from 'styled-components';
import merge from 'lodash/merge';
import useReconnectingWebSocket from '../../hooks/useReconnectingWebSocket';
import { defaultTheme, defaultDonationGoal } from '../../theme';
import { hexToRgba } from '../../utils.js';
import { registerFontFace } from '../utils/fontsCache';

// ─── Helpers ─────────────────────────────────────────────────────

function gradientCSS(gradientCfg) {
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

function bgCSS(bgCfg) {
    switch (bgCfg.type) {
        case 'gradient': {
            const grad = gradientCSS(bgCfg.gradient);
            return grad || bgCfg.color;
        }
        case 'image': {
            const { src, mode } = bgCfg.image;
            if (!src) return hexToRgba(bgCfg.color, bgCfg.opacity);
            if (mode === 'repeat') {
                return `url(${src}) repeat`;
            }
            return `url(${src}) center/100% 100% no-repeat`;
        }
        default:
            return hexToRgba(bgCfg.color, bgCfg.opacity);
    }
}

function threePartBgStyles(imgCfg) {
    const images = [];
    const positions = [];
    const sizes = [];

    if (imgCfg.top) {
        images.push(`url(${imgCfg.top})`);
        positions.push('top center');
        sizes.push('100% auto');
    }
    if (imgCfg.bottom) {
        images.push(`url(${imgCfg.bottom})`);
        positions.push('bottom center');
        sizes.push('100% auto');
    }
    if (imgCfg.middle) {
        images.push(`url(${imgCfg.middle})`);
        positions.push(`${imgCfg.middleAlign || 'center'} center`);
        sizes.push('100% auto');
    }

    if (!images.length) return '';
    return css`
        background-image: ${images.join(', ')};
        background-position: ${positions.join(', ')};
        background-size: ${sizes.join(', ')};
        background-repeat: no-repeat;
        background-origin: border-box;
        background-clip: border-box;
    `;
}

const insetStr = (p) => `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;

// ─── Animations ──────────────────────────────────────────────────

const pulseAnim = keyframes`
    0%, 100% {
        box-shadow: 0 0 8px rgba(10, 240, 213, 0.6), 0 0 16px rgba(10, 240, 213, 0.4);
        transform: scale(1);
    }
    50% {
        box-shadow: 0 0 16px rgba(10, 240, 213, 0.8), 0 0 32px rgba(10, 240, 213, 0.6);
        transform: scale(1.01);
    }
`;

const glowAnim = keyframes`
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.3); }
`;

const shakeAnim = keyframes`
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
    20%, 40%, 60%, 80% { transform: translateX(2px); }
`;

// ─── Styled: View Container ──────────────────────────────────────

const ViewContainer = styled.div`
    width: ${({ $cfg }) => $cfg.container.width}px;
    height: ${({ $cfg }) => $cfg.container.height}px;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    overflow: hidden;
`;

const ContentContainer = styled.div`
    position: relative;
    width: 100%;
    box-sizing: border-box;
    margin: ${({ $cfg }) => insetStr($cfg.container.margin)};
    padding: ${({ $cfg }) => insetStr($cfg.container.padding)};
    transform: ${({ $cfg }) => {
        const { x, y } = $cfg.container.offset;
        return (x === 0 && y === 0) ? 'none' : `translate(${x}px, ${y}px)`;
    }};
`;

// ─── Styled: Background ─────────────────────────────────────────

const BgLayer = styled.div`
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;

    ${({ $cfg }) => {
        const bg = $cfg.background;
        const common = css`
            border-radius: ${bg.borderRadius}px;
            border: ${bg.borderWidth}px solid ${hexToRgba(bg.borderColor, bg.borderOpacity)};
            box-shadow: 0 0 ${bg.shadowRadius}px ${hexToRgba(bg.shadowColor, bg.shadowOpacity)};
        `;

        switch (bg.type) {
            case 'gradient': {
                const grad = gradientCSS(bg.gradient);
                return css`
                    background: ${grad || hexToRgba(bg.color.color, bg.color.opacity)};
                    ${common}
                `;
            }
            case 'image': {
                const img = bg.image;
                if (img.mode === 'three-part') {
                    return css`
                        background-color: ${img.backgroundColor};
                        ${threePartBgStyles(img)}
                        ${common}
                    `;
                }
                if (img.src) {
                    return css`
                        background-color: ${img.backgroundColor};
                        background-image: url(${img.src});
                        background-size: 100% 100%;
                        background-repeat: no-repeat;
                        ${common}
                    `;
                }
                return css`
                    background-color: ${img.backgroundColor};
                    ${common}
                `;
            }
            default:
                return css`
                    background-color: ${hexToRgba(bg.color.color, bg.color.opacity)};
                    ${common}
                `;
        }
    }}
`;

// ─── Styled: Decor Images ───────────────────────────────────────

const DecorWrapper = styled.div`
    position: absolute;
    left: 0;
    right: 0;
    pointer-events: none;
    z-index: 1;
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

// ─── Styled: Content (above bg) ─────────────────────────────────

const ContentInner = styled.div`
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
`;

// ─── Styled: Title ──────────────────────────────────────────────

const Title = styled.div`
    font-family: ${({ $cfg }) => $cfg.title.font.family || 'Roboto, sans-serif'};
    font-size: ${({ $cfg }) => $cfg.title.font.size}px;
    color: ${({ $cfg }) => hexToRgba($cfg.title.color, $cfg.title.opacity)};
    text-align: ${({ $cfg }) => $cfg.title.align};
    text-shadow: ${({ $cfg }) => {
        const t = $cfg.title;
        if (t.shadowOpacity === 0 && t.shadowRadius === 0) return 'none';
        return `0 0 ${t.shadowRadius}px ${hexToRgba(t.shadowColor, t.shadowOpacity)}`;
    }};
    margin-top: ${({ $cfg }) => $cfg.title.margin.top}px;
    margin-bottom: ${({ $cfg }) => $cfg.title.margin.bottom}px;
`;

// ─── Styled: Progress Bar ───────────────────────────────────────

const BarContainer = styled.div`
    position: relative;
    width: 100%;
    height: ${({ $cfg }) => $cfg.bar.height}px;
    border-radius: ${({ $cfg }) => $cfg.bar.borderRadius}px;
    border: ${({ $cfg }) => $cfg.bar.borderWidth}px solid
        ${({ $cfg }) => hexToRgba($cfg.bar.borderColor, $cfg.bar.borderOpacity)};
    overflow: hidden;
    background: ${({ $cfg }) => bgCSS($cfg.bar.background)};
`;

const FillTrack = styled.div`
    position: absolute;
    top: ${({ $cfg }) => $cfg.bar.fill.padding.top}px;
    left: ${({ $cfg }) => $cfg.bar.fill.padding.left}px;
    bottom: ${({ $cfg }) => $cfg.bar.fill.padding.bottom}px;
    right: ${({ $cfg }) => $cfg.bar.fill.padding.right}px;
`;

const FillBar = styled.div`
    height: 100%;
    width: ${({ $pct }) => Math.min($pct, 100)}%;
    border-radius: ${({ $cfg }) => $cfg.bar.fill.borderRadius}px;
    background: ${({ $cfg }) => bgCSS($cfg.bar.fill.background)};
    position: relative;

    ${({ $cfg }) => {
        const anim = $cfg.animation.fillTransition;
        if (!anim.enabled) return '';
        return css`
            transition: width ${anim.duration}ms ${anim.easing};
        `;
    }}

    ${({ $isComplete, $cfg }) => {
        if (!$isComplete || !$cfg.animation.celebration.enabled) return '';
        const celebType = $cfg.animation.celebration.type;
        const dur = $cfg.animation.celebration.duration;
        const animMap = { pulse: pulseAnim, glow: glowAnim, shake: shakeAnim };
        const anim = animMap[celebType] || pulseAnim;
        return css`
            animation: ${anim} ${dur}ms ease-in-out infinite;
        `;
    }}
`;

// ─── Styled: Cap ────────────────────────────────────────────────

const CapElement = styled.div`
    position: absolute;
    right: 0;
    top: 50%;
    transform: translate(50%, -50%);
    z-index: 1;

    ${({ $cfg }) => {
        const cap = $cfg.bar.cap;
        if (cap.type === 'image' && cap.image.src) {
            return css`
                width: ${cap.image.width}px;
                height: ${cap.image.height}px;
                transform: translate(
                    calc(50% + ${cap.image.offset.x}px),
                    calc(-50% + ${cap.image.offset.y}px)
                );
            `;
        }
        const shape = cap.shape;
        const size = shape.size;
        const bg = shape.background.type === 'gradient'
            ? gradientCSS(shape.background.gradient)
            : shape.background.color;

        return css`
            width: ${size}px;
            height: ${size}px;
            background: ${bg};
            border: ${shape.borderWidth}px solid ${shape.borderColor};
            box-shadow: ${shape.glow.opacity > 0
                ? `0 0 ${shape.glow.radius}px ${hexToRgba(shape.glow.color, shape.glow.opacity)}`
                : 'none'};

            ${shape.form === 'circle' && css`border-radius: 50%;`}
            ${shape.form === 'diamond' && css`
                transform: translate(50%, -50%) rotate(45deg);
                border-radius: 2px;
            `}
        `;
    }}
`;

const CapImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: contain;
`;

const CapSvg = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 100%;
        height: 100%;
    }
`;

// ─── Styled: Progress Label ─────────────────────────────────────

const LabelOnBar = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    font-family: ${({ $cfg }) => $cfg.progressLabel.font.family || 'Roboto, sans-serif'};
    font-size: ${({ $cfg }) => $cfg.progressLabel.font.size}px;
    color: ${({ $cfg }) => hexToRgba($cfg.progressLabel.color, $cfg.progressLabel.opacity)};
    text-shadow: ${({ $cfg }) => {
        const l = $cfg.progressLabel;
        if (l.shadowOpacity === 0 && l.shadowRadius === 0) return 'none';
        return `0 0 ${l.shadowRadius}px ${hexToRgba(l.shadowColor, l.shadowOpacity)}`;
    }};
    pointer-events: none;
`;

const LabelBelow = styled.div`
    font-family: ${({ $cfg }) => $cfg.progressLabel.font.family || 'Roboto, sans-serif'};
    font-size: ${({ $cfg }) => $cfg.progressLabel.font.size}px;
    color: ${({ $cfg }) => hexToRgba($cfg.progressLabel.color, $cfg.progressLabel.opacity)};
    text-align: ${({ $cfg }) => $cfg.progressLabel.align};
    text-shadow: ${({ $cfg }) => {
        const l = $cfg.progressLabel;
        if (l.shadowOpacity === 0 && l.shadowRadius === 0) return 'none';
        return `0 0 ${l.shadowRadius}px ${hexToRgba(l.shadowColor, l.shadowOpacity)}`;
    }};
    margin-top: 4px;
`;

// ─── Component ───────────────────────────────────────────────────

export default function DonationGoalOverlay() {
    const [goalData, setGoalData] = useState({
        current: 350,
        target: 1000,
        title: 'Цель сбора',
        currency: '₽'
    });
    const [currentTheme, setCurrentTheme] = useState(defaultTheme);
    const [currentThemeName] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('theme');
    });

    const cfg = useMemo(() => {
        const userCfg = currentTheme.donationGoal;
        return userCfg ? merge({}, defaultDonationGoal, userCfg) : defaultDonationGoal;
    }, [currentTheme.donationGoal]);

    function applyTheme(theme) {
        setCurrentTheme(theme);
        const fonts = [
            theme?.donationGoal?.title?.font,
            theme?.donationGoal?.progressLabel?.font
        ];
        fonts.forEach(font => {
            if (font?.family && font?.url) {
                registerFontFace(font.family, font.url);
            }
        });
    }

    function requestTheme(socket, themeName) {
        if (themeName) {
            socket.send(JSON.stringify({
                channel: 'theme:get-by-name',
                payload: { name: themeName }
            }));
        } else {
            socket.send(JSON.stringify({ channel: 'theme:get' }));
        }
    }

    useReconnectingWebSocket('ws://localhost:42001', {
        onOpen: (_, socket) => {
            requestTheme(socket, currentThemeName);
            socket.send(JSON.stringify({ channel: 'da:goal-request' }));
        },
        onMessage: (event) => {
            const { channel, payload } = JSON.parse(event.data);
            switch (channel) {
                case 'da:goal-update': {
                    if (payload) setGoalData(payload);
                    break;
                }
                case 'theme:update-by-name': {
                    const { name, theme } = payload;
                    if (currentThemeName !== name) break;
                    if (!theme) break;
                    applyTheme(theme);
                    break;
                }
                case 'theme:update': {
                    if (currentThemeName) break;
                    applyTheme(payload);
                    break;
                }
            }
        },
    });

    const { current, target, title: goalName, currency } = goalData;
    const percentage = target > 0 ? (current / target) * 100 : 0;
    const isComplete = current >= target;

    // Title text with substitutions
    const titleText = cfg.title.text
        .replace('{goalName}', goalName)
        .replace('{current}', current.toLocaleString())
        .replace('{target}', target.toLocaleString())
        .replace('{currency}', currency);

    // Progress label text
    const labelText = cfg.progressLabel.format === 'percentage'
        ? `${Math.min(Math.round(percentage), 100)}%`
        : `${current.toLocaleString()} / ${target.toLocaleString()} ${currency}`;

    // Render cap
    const renderCap = () => {
        if (!cfg.bar.cap.enabled) return null;
        const cap = cfg.bar.cap;

        if (cap.type === 'image' && cap.image.src) {
            return (
                <CapElement $cfg={cfg}>
                    <CapImage src={cap.image.src} alt="" />
                </CapElement>
            );
        }

        if (cap.type === 'shape') {
            if (cap.shape.form === 'custom' && cap.shape.customSvg) {
                return (
                    <CapElement $cfg={cfg}>
                        <CapSvg dangerouslySetInnerHTML={{ __html: cap.shape.customSvg }} />
                    </CapElement>
                );
            }
            return <CapElement $cfg={cfg} />;
        }
        return null;
    };

    return (
        <ThemeProvider theme={currentTheme}>
            <ViewContainer $cfg={cfg}>
                <ContentContainer $cfg={cfg}>
                    {/* Background layer */}
                    <BgLayer $cfg={cfg} />

                    {/* Decor images */}
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

                    {/* Content */}
                    <ContentInner>
                        <Title $cfg={cfg}>{titleText}</Title>

                        <BarContainer $cfg={cfg}>
                            <FillTrack $cfg={cfg}>
                                <FillBar $cfg={cfg} $pct={percentage} $isComplete={isComplete}>
                                    {renderCap()}
                                </FillBar>
                            </FillTrack>

                            {cfg.progressLabel.placement === 'on-bar' && (
                                <LabelOnBar $cfg={cfg}>{labelText}</LabelOnBar>
                            )}
                        </BarContainer>

                        {cfg.progressLabel.placement === 'below' && (
                            <LabelBelow $cfg={cfg}>{labelText}</LabelBelow>
                        )}
                    </ContentInner>
                </ContentContainer>
            </ViewContainer>
        </ThemeProvider>
    );
}
