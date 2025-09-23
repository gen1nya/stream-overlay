import React, {useEffect, useRef, useState} from "react";
import styled, {ThemeProvider} from "styled-components";
import {hexToRgba, lightenColor} from "../../utils.js"
import FFTBars from "./FFTBars";
import useReconnectingWebSocket from "../../hooks/useReconnectingWebSocket";
import ColorThief from "colorthief";

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
    background-color: #535bf2;
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
    height: ${({theme}) => theme.modernPlayer?.mode === 'compact' ? '0' : '60px'};
    margin-top: ${({theme}) => theme.modernPlayer?.mode === 'compact' ? '0' : '8px'};
    border-radius: ${({theme}) => (theme.modernPlayer?.borderRadius || 20) * 0.25}px;
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

    const [shadowColor, setShadowColor] = useState('#1e1e1e');
    const [bgColor, setBgColor] = useState('#1e1e1e');
    const [spectrumColor, setSpectrumColor] = useState('#1e1e1e');
    const [progressColor, setProgressColor] = useState('#1e1e1e');
    const [spectrumPeakColor, setSpectrumPeakColor] = useState('#1e1e1e');
    const [pendingColorData, setPendingColorData] = useState(null);
    const colorApplyTimeoutRef = useRef(null);

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
            const {type, data} = JSON.parse(event.data);
            if (type !== 'metadata') return;
            setMetadata(data);
            setProgress(data.position);
            console.log(data.position);
            setDuration(data.duration || 1);
        },
        onClose: () => console.log('🔴 WebSocket metadata отключен'),
    });

    // progress bar update
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (metadata?.status === 'Playing') {
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
    }, [metadata, duration]);

    useEffect(() => {
        if (!coverRef.current || !metadata?.albumArtBase64) return;
        const colorThief = new ColorThief();
        const img = coverRef.current;

        const onLoad = () => {
            const palette = colorThief.getPalette(img, 6);
            const color = colorThief.getColor(img);
            const shadow = lightenColor(color, 0.2);
            const spectrum = palette[1];
            const spectrumPeak = palette[2];

            const newColors = {
                bg: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
                shadow: `rgb(${shadow[0]}, ${shadow[1]}, ${shadow[2]})`,
                spectrum: `rgb(${spectrum[0]}, ${spectrum[1]}, ${spectrum[2]})`,
                peak: `rgb(${spectrumPeak[0]}, ${spectrumPeak[1]}, ${spectrumPeak[2]})`,
            };

            setPendingColorData(newColors);
        };

        if (img.complete) {
            onLoad();
        } else {
            img.addEventListener('load', onLoad);
        }
        return () => img.removeEventListener('load', onLoad);
    }, [metadata?.albumArtBase64]);

    useEffect(() => {
        if (!pendingColorData) return;

        if (colorApplyTimeoutRef.current) {
            clearTimeout(colorApplyTimeoutRef.current);
        }

        colorApplyTimeoutRef.current = setTimeout(() => {
            setBgColor(pendingColorData.bg);
            setShadowColor(pendingColorData.shadow);
            setSpectrumColor(pendingColorData.spectrum);
            setProgressColor(pendingColorData.spectrum);
            setSpectrumPeakColor(pendingColorData.peak);
            setPendingColorData(null);
        }, 150);
    }, [pendingColorData]);

    useEffect(() => {
        return () => clearTimeout(colorApplyTimeoutRef.current);
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <CardWithCSSVars $bgColor={bgColor} $shadowColor={shadowColor}>
                <TopRow>
                    <Cover
                        ref={coverRef}
                        src={metadata?.albumArtBase64 ? `${metadata.albumArtBase64}` : undefined}
                        alt="Album Art"
                        crossOrigin="anonymous"
                    />
                    <Info>
                        <Title>{metadata ? metadata?.title : ""}</Title>
                        <Artist>{metadata ? metadata?.artist : ""}</Artist>
                        <FFTWrapper key={`fft-${theme.modernPlayer?.mode}`}>
                            <FFTBars
                                bars={48}
                                backgroundColor={"rgba(255,255,255,0.02)"}
                                barColor={spectrumColor}
                                peakColor={spectrumPeakColor}
                            />
                        </FFTWrapper>
                    </Info>
                </TopRow>

                <ProgressBarContainer>
                    <Time>{formatTime(progress)}</Time>
                    <ProgressTrack>
                        <Progress $percent={(progress / duration) * 100} $progressColor={progressColor}/>
                    </ProgressTrack>
                    <Time>{formatTime(duration)}</Time>
                </ProgressBarContainer>
            </CardWithCSSVars>
        </ThemeProvider>
    );
}

export default ModernAudioPlayer;