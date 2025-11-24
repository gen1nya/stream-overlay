import React, {useEffect, useRef, useState, useMemo} from "react";
import styled, {ThemeProvider} from "styled-components";
import {hexToRgba, lightenColor} from "../../utils.js"
import FFTBars from "./FFTBars";
import useReconnectingWebSocket from "../../hooks/useReconnectingWebSocket";
import WaveForm from "./WaveForm";
import VUMeter from "./Vumeter";
import {generateTrackIdenticon} from "../../utils/identicon.js";
import {usePaletteExtraction} from "../../hooks/usePaletteExtraction.js";

const ensureRgba = (color, opacity = 1) => {
    if (color.includes('rgba')) return color;
    if (color.includes('rgb')) {
        return color.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
    }
    return color;
};

const updateOpacity = (color, opacity) => {
    if (color.includes('rgba')) {
        return color.replace(/[\d\.]+\)$/g, `${opacity})`);
    }
    return ensureRgba(color, opacity);
};

const blendColors = (baseColor, tintColor, tintOpacity) => {
    if (!baseColor || !tintColor) return baseColor;

    const baseRgb = baseColor.match(/\d+/g)?.map(Number) || [30, 30, 30];
    const tintRgb = hexToRgba(tintColor).match(/\d+/g)?.map(Number) || [0, 0, 0];

    const blended = baseRgb.map((base, i) =>
        Math.round(base * (1 - tintOpacity) + tintRgb[i] * tintOpacity)
    );

    return `rgb(${blended[0]}, ${blended[1]}, ${blended[2]})`;
};

const CardWithCSSVars = styled.div.withConfig({
    shouldForwardProp: (prop) => !prop.startsWith('$')
})`
    --card-bg: ${({$bgColor, theme}) => {
        const config = theme.modernPlayer || {};
        const baseColor = $bgColor || '#1e1e1e';
        const tintColor = config.backgroundTint;
        const tintOpacity = parseFloat(config.backgroundTintOpacity || 0);
        const backgroundOpacity = parseFloat(config.backgroundOpacity || 0.94);

        if (tintColor && tintOpacity > 0) {
            const blended = blendColors(baseColor, tintColor, tintOpacity);
            return ensureRgba(blended, backgroundOpacity);
        }
        return ensureRgba(baseColor, backgroundOpacity);
    }};

    --card-shadow: ${({$shadowColor, theme}) => {
        const config = theme.modernPlayer || {};
        const shadowOpacity = parseFloat(config.shadowOpacity ?? 0.0);
        const shadowRadius = config.shadowRadius ?? 20;

        if (shadowOpacity <= 0) return `0 0 ${shadowRadius}px ${$shadowColor || '#1e1e1e'}`;

        const coverShadowColor = $shadowColor ?? '#1e1e1e';
        const tintColor = config.shadowColor || '#000000';
        const shadowColor = blendColors(coverShadowColor, tintColor, shadowOpacity * 0.7);

        return `0 0 ${shadowRadius}px ${updateOpacity(shadowColor, shadowOpacity)}`;
    }};

    margin: 20px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    color: #fff;
    position: relative;
    transition: background 0.5s ease, box-shadow 0.5s ease;

    background: var(--card-bg);
    box-shadow: var(--card-shadow);
    border-radius: ${({theme}) => theme.modernPlayer?.borderRadius || 20}px;
    width: ${({theme}) => {
        const mode = theme.modernPlayer?.mode || 'compact';
        const config = theme.modernPlayer || {};
        return mode === 'compact' ? `${config.widthCompact || 400}px` : `${config.widthExpanded || 500}px`;
    }};
    min-height: ${({theme}) => {
        const mode = theme.modernPlayer?.mode || 'compact';
        const config = theme.modernPlayer || {};
        const height = mode === 'compact' ? config.heightCompact || 40 : config.heightExpanded || 60;
        return `${Math.max(height, mode === 'compact' ? 40 : 60)}px`;
    }};
    height: ${({theme}) => {
        const mode = theme.modernPlayer?.mode || 'compact';
        const config = theme.modernPlayer || {};
        const height = mode === 'compact' ? config.heightCompact || 40 : config.heightExpanded || 60;
        return `${Math.max(height, mode === 'compact' ? 40 : 60)}px`;
    }};
    border: ${({theme}) => {
        const config = theme.modernPlayer || {};
        const borderOpacity = parseFloat(config.borderOpacity || 0);
        const borderColor = config.borderColor || '#333333';
        return borderOpacity > 0 ? `1px solid ${hexToRgba(borderColor, borderOpacity)}` : 'none';
    }};
`;

const TopRow = styled.div`
    display: flex;
    align-items: flex-start;
    flex-direction: ${({theme}) => theme.modernPlayer?.image?.position === 'right' ? 'row-reverse' : 'row'};
    gap: 16px;
`;

const Cover = styled.img`
    display: ${({theme}) => theme.modernPlayer?.image?.show === false ? 'none' : 'block'};
    width: ${({theme}) => {
        const mode = theme.modernPlayer?.mode || 'compact';
        if (mode === 'compact') {
            return theme.modernPlayer?.image?.compact?.size ?? 48;
        } else {
            return theme.modernPlayer?.image?.extended?.size ?? 80;
        }
    }}px;
    height: ${({theme}) => {
        const mode = theme.modernPlayer?.mode || 'compact';
        if (mode === 'compact') {
            return theme.modernPlayer?.image?.compact?.size ?? 48;
        } else {
            return theme.modernPlayer?.image?.extended?.size ?? 80;
        }
    }}px;
    border-radius: ${({theme}) => (theme.modernPlayer?.borderRadius || 20) * 0.3}px;
    background-color: rgba(83, 91, 242, 0.65);
    object-fit: cover;
    box-shadow: 3px 3px 12px rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
`;

const Info = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    min-width: 0;
    gap: ${({theme}) => theme.modernPlayer?.mode === 'compact' ? '4px' : '4px'};
`;

const Title = styled.div`
    width: 100%;
    text-align: ${({theme}) => theme.modernPlayer?.text?.textAlign || 'left'};
    font-weight: ${({theme}) => theme.modernPlayer?.text?.title?.fontWeight || 'bold'};
    font-size: ${({theme}) => theme.modernPlayer?.text?.title?.fontSize || 16}px;
    font-family: ${({theme}) => theme.modernPlayer?.text?.title?.family || 'Roboto'};
    color: ${({theme}) => theme.modernPlayer?.text?.title?.color || '#ffffff'};
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    line-height: 1.2;
`;

const Artist = styled.div`
    width: 100%;
    text-align: ${({theme}) => theme.modernPlayer?.text?.textAlign || 'left'};
    font-weight: ${({theme}) => theme.modernPlayer?.text?.artist?.fontWeight || 'normal'};
    font-size: ${({theme}) => theme.modernPlayer?.text?.artist?.fontSize || 14}px;
    font-family: ${({theme}) => theme.modernPlayer?.text?.artist?.family || 'Roboto'};
    color: ${({theme}) => theme.modernPlayer?.text?.artist?.color || '#858585'};
    margin-top: 4px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    line-height: 1.2;
`;

const FFTWrapper = styled.div`
    width: 100%;
    height: ${({theme}) => {
        if (theme.modernPlayer?.mode === 'compact') return '0';
        if (theme.modernPlayer?.visualization === 'vumeter') return '80px';
        return '60px'
    }};
    margin-top: ${({theme}) => theme.modernPlayer?.mode === 'compact' ? '0' : '8px'};
    border-radius: 7px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    display: ${({theme}) => theme.modernPlayer?.mode === 'compact' ? 'none' : 'block'};
    position: relative;
`;

const ProgressBarContainer = styled.div`
    display: flex;
    margin-top: 16px;
    align-items: center;
    width: 100%;
`;

const Time = styled.div`
    font-size: 12px;
    color: #aaa;
    width: 40px;
    flex-shrink: 0;
    display: ${({theme}) => theme.modernPlayer?.mode === 'compact' ? 'none' : 'block'};
`;

const ProgressTrack = styled.div`
    flex: 1;
    height: ${({theme}) => theme.modernPlayer?.mode === 'compact' ? '3px' : '6px'};
    background: rgba(255, 255, 255, 0.1);
    border-radius: ${({theme}) => theme.modernPlayer?.mode === 'compact' ? '1.5px' : '3px'};
    margin: ${({theme}) => theme.modernPlayer?.mode === 'compact' ? '0' : '0 10px'};
    overflow: hidden;
`;

const Progress = styled.div`
    height: 100%;
    background: ${({$progressColor, theme}) => {
        const baseColor = $progressColor || '#1e1e1e';
        const tintColor = theme.modernPlayer?.backgroundTint;
        const tintOpacity = parseFloat(theme.modernPlayer?.backgroundTintOpacity || 0);

        if (tintColor && tintOpacity > 0) {
            return blendColors(baseColor, tintColor, tintOpacity * 0.7);
        }
        return baseColor;
    }};
    width: ${({$percent}) => $percent}%;
    transition: width 0.5s ease;
    border-radius: inherit;
`;

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Дефолтная тема
const defaultTheme = {
    modernPlayer: {
        mode: "compact",
        backgroundTint: "#000000",
        backgroundTintOpacity: "0.3",
        backgroundOpacity: "0.94",
        borderOpacity: "1",
        borderRadius: 16,
        shadowOpacity: "0.26",
        shadowRadius: 20,
        widthCompact: 300,
        widthExpanded: 400,
        heightCompact: 64,
        heightExpanded: 80,
        text: {
            textAlign: "left",
            title: {
                fontSize: 16,
                family: "Roboto",
                url: "https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmTggvWl0Qn.ttf",
                color: "#ffffff",
                fontWeight: "bold"
            },
            artist: {
                fontSize: 14,
                family: "Roboto",
                url: "https://fonts.gstatic.com/s/roboto/v48/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmTggvWl0Qn.ttf",
                color: "#858585",
                fontWeight: "normal"
            }
        },
        image: {
            position: "left",
            size: 48
        }
    }
};

function ModernAudioPlayer() {
    const [theme, setTheme] = useState(defaultTheme);
    const [metadata, setMetadata] = useState(null);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(1);
    const timerRef = useRef(null);
    const coverRef = useRef();

    const [coverSrc, setCoverSrc] = useState(undefined);

    // Use the palette extraction hook for real album art
    const paletteColors = usePaletteExtraction(
        metadata?.albumArtBase64,
        coverRef,
        { paletteSize: 6 }
    );

    // WebSocket для получения темы
    const {isConnected: themeConnected} = useReconnectingWebSocket('ws://localhost:42001', {
        onOpen: (_, socket) => {
            console.log('🟢 WebSocket theme подключен');
            socket.send(JSON.stringify({channel: 'theme:get'}));
        },
        onMessage: (event) => {
            const {channel, payload} = JSON.parse(event.data);
            if (channel === 'theme:update') {
                setTheme(payload);
            }
        },
        onClose: () => console.log('🔴 WebSocket theme отключен'),
    });

    // WebSocket для получения метаданных
    const {isConnected: metaConnected} = useReconnectingWebSocket('ws://localhost:5001/ws', {
        onOpen: () => console.log('🟢 WebSocket metadata подключен'),
        onMessage: (event) => {
            if (typeof event.data !== 'string') return;
            // Это текстовое сообщение (JSON)
            try {
                const {type, data} = JSON.parse(event.data);
                if (type !== 'metadata') return;
                setMetadata(data);
                setProgress(data.position);
                console.log("pos:" + data.position);
                console.log("dur:" + data.duration);
                setDuration(data.duration);
            } catch (error) {
                console.warn('Ошибка парсинга JSON:', error);
            }
        },
        onClose: () => console.log('🔴 WebSocket metadata отключен'),
    });

    // progress bar update
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        // Only start timer if we have valid duration and position
        if (metadata?.status === 'Playing' && duration > 0 && progress >= 0) {
            timerRef.current = setInterval(() => {
                setProgress(prev => {
                    const next = prev + 1;
                    if (next >= duration) {
                        clearInterval(timerRef.current);
                        return duration;
                    }
                    return next;
                });
            }, 1000);
        }
        return () => timerRef.current && clearInterval(timerRef.current);
    }, [metadata, duration, progress]);

    // Handle album art or identicon generation
    useEffect(() => {
        if (!metadata) {
            setCoverSrc(undefined);
            return;
        }

        // If we have real album art, use it (palette extraction handled by hook)
        if (metadata.albumArtBase64) {
            setCoverSrc(metadata.albumArtBase64);
            return;
        }

        // Otherwise, generate identicon
        const identicon = generateTrackIdenticon(metadata);
        if (identicon) {
            setCoverSrc(identicon.dataUrl);
        } else {
            setCoverSrc(undefined);
        }
    }, [metadata]);

    const showProgress = duration > 0 && metadata;

    return (
        <ThemeProvider theme={theme}>
            <CardWithCSSVars $bgColor={paletteColors.bg} $shadowColor={paletteColors.shadow}>
                <TopRow>
                    <Cover
                        ref={coverRef}
                        src={coverSrc}
                        alt=""
                        crossOrigin="anonymous"
                    />
                    <Info>
                        <Title>{metadata ? metadata?.title : ""}</Title>
                        <Artist>{metadata ? metadata?.artist : ""}</Artist>
                        <FFTWrapper key={`fft-${theme.modernPlayer?.mode}`}>
                            {/*режим визуализации в зависимости от theme.visualization*/}
                            {theme.modernPlayer?.visualization === 'spectrum' && (
                                <FFTBars
                                    bars={48}
                                    backgroundColor={"rgba(255,255,255,0.02)"}
                                    barColor={paletteColors.spectrum}
                                    peakColor={paletteColors.peak}
                                />
                            )}
                            {(theme.modernPlayer?.visualization === 'waveform' || !theme.modernPlayer?.visualization) && (
                                <WaveForm
                                    backgroundColor={"rgba(255,255,255,0.02)"}
                                    lineColor={paletteColors.peak}
                                    showCenterLine={false}
                                    showGrid={false}
                                />
                            )}
                            {(theme.modernPlayer?.visualization === 'vumeter') && (
                                <VUMeter/>
                            )}
                        </FFTWrapper>
                    </Info>
                </TopRow>

                {showProgress && (
                    <ProgressBarContainer>
                        <Time>{formatTime(progress)}</Time>
                        <ProgressTrack>
                            <Progress $percent={(progress / duration) * 100} $progressColor={paletteColors.progress}/>
                        </ProgressTrack>
                        <Time>{formatTime(duration)}</Time>
                    </ProgressBarContainer>
                )}
            </CardWithCSSVars>
        </ThemeProvider>
    );
}

export default ModernAudioPlayer;