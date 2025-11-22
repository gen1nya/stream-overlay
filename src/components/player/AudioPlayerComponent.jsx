import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import styled, { createGlobalStyle, ThemeProvider } from "styled-components";
import diskImg from "../../assets/disk.png";
import { defaultTheme } from '../../theme';
import {hexToRgba, lightenColor} from "../../utils.js";
import Marquee from "react-fast-marquee";
import useReconnectingWebSocket from '../../hooks/useReconnectingWebSocket';
import FFTDonut from "./FFTDonut";
import ColorThief from "colorthief";
import {generateTrackIdenticon} from "../../utils/identicon.js";

const GlobalStyle = createGlobalStyle`
    html, body, #root {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: transparent !important;
        overflow: hidden;
        scroll-behavior: smooth;
    }
`;

const AudioPlayerContainer = styled.div`
    position: fixed;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    bottom: 20px;
    left: 20px;
    width: 270px;
    height: 330px;
    background-color: ${({theme}) => {
        const bgColor = theme.player?.backgroundColor || "#3e837c";
        const bgOpacity = theme.player?.backgroundOpacity || 1.0;
        return hexToRgba(bgColor, bgOpacity);
    }};
    border-radius: ${({theme}) => {
        const borderRadius = theme.player?.borderRadius
        return borderRadius === "none" ? "0" : borderRadius.topLeft + "px " + borderRadius.topRight + "px " + borderRadius.bottomRight + "px " + borderRadius.bottomLeft + "px";
    }};
    border: 1px solid ${({theme}) => {
        const borderColor = theme.player?.borderColor || "#3e837c";
        const borderOpacity = theme.player?.borderOpacity || 1.0;
        return hexToRgba(borderColor, borderOpacity);
    }};
    padding: 10px;
    box-shadow: ${({theme}) => {
        const shadowColor = theme.player?.shadowColor || "#000";
        const shadowOpacity = theme.player?.shadowOpacity || 0.5;
        const shadowRadius = theme.player?.shadowRadius || 20;
        return hexToRgba(shadowColor, shadowOpacity) + ` 0 0 ${shadowRadius}px`;
    }};
`;

const DiskContainer = styled.div`
    background: transparent;
    width: 250px;
    height: 250px;
    position: relative;
`;

const FFTWrapper = styled.div`
    top: 0;
    left: 0;
  width: 290px;
  height: 290px;
  overflow: hidden;
  position: absolute;
  z-index: -1;
  background: transparent;
`;

const Disk = styled.div`
    width: 250px;
    height: 250px;
    margin: 10px;
    background: url(${diskImg}) no-repeat center center / cover;
    transform-origin: 50% 50%;
    filter: 
        ${({theme}) => {
            const shadowColor = theme.player?.diskShadowColor || "#000";
            const shadowOpacity = theme.player?.diskShadowOpacity || 0.5;
            const color = hexToRgba(shadowColor, shadowOpacity);
            return `drop-shadow(${color} 0 0 7px)`;
        }};
`;

const AlbumArt = styled.img`
    width: 95px;
    height: 95px;
    position: absolute;
    top: 88px;
    left: 88px;
    border-radius: 47px;
    margin-right: 10px;
    transform-origin: 50% 50%;
`;

const Title = styled.div`
    width: 100%;
    text-align: ${({theme}) => theme.player?.text?.textAlign || 'left'};
    font-weight: ${({theme}) => theme.player?.text?.title?.fontWeight || 'bold'};
    font-size: ${({theme}) => theme.player?.text?.title?.fontSize || '14'}px;
    color: ${({theme}) => theme.player?.text?.title?.color || '#ffffff'};;
`;

const Artist = styled.div`
    box-sizing: border-box;
    font-weight: ${({theme}) => theme.player?.text?.artist?.fontWeight || 'bold'};
    text-align: ${({theme}) => theme.player?.text?.textAlign || 'left'};
    font-size: ${({theme}) => theme.player?.text?.artist?.fontSize || '14'}px;
    color: ${({theme}) => theme.player?.text?.artist?.color || '#ffffff'};
    overflow: hidden;
    min-width: 0;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding-left: ${({theme}) => {
        const bottomLeftRadius = theme.player?.borderRadius?.bottomLeft || 0;
        if (bottomLeftRadius <= 40) return '0px';
        return Math.pow(bottomLeftRadius, 0.85) + 1;
    }}px;
    padding-right: ${({theme}) => {
        const bottomRightRadius = theme.player?.borderRadius?.bottomRight || 0;
        if (bottomRightRadius <= 40) return '0px';
        return Math.pow(bottomRightRadius, 0.85) + 1;
    }}px;
    width: 100%;
`;

const Deck = styled.div`
    position: absolute;
    top: 115px;
    left: 0;
    width: auto;
    height: auto;
    z-index: 1;
`;

const ProgressPointer = styled.div`
    position: absolute;
    top: 137px;
    width: auto;
    height: auto;
    left: ${({ $left }) => $left}px;
    transition: left 0.25s linear;
`;

const Wrapper = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
`;

const ConnectionLost = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: red;
    background: rgba(0,0,0,0.5);
    z-index: 10;
`;

const FixedMarquee = styled(Marquee)`
  .rfm-marquee {
    ${({ $paused }) => {
        $paused &&
        `
            transform: none !important;
        `}    
    }
    justify-content: ${({ theme }) => {
        const align = theme.player?.text?.textAlign || 'left';
        switch (align) {
            case 'center': return 'center !important;';
            case 'right': return 'flex-end !important;';
            case 'left': return 'flex-start !important;';
            default: return 'flex-end !important;';
        }
    }};
    
  }
`;

const ArtistContainer = styled.span``;

const TitleContainer = styled.div``;

export default function AudioPlayerComponent() {
    const [theme, setTheme] = useState(defaultTheme);
    const [metadata, setMetadata] = useState(null);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(1);
    const [shouldArtistScroll, setShouldArtistScroll] = useState(false);
    const [pendingColorData, setPendingColorData] = useState(null);
    const colorApplyTimeoutRef = useRef(null);
    const [spectrumPeakColor, setSpectrumPeakColor] = useState('#1e1e1e');
    const [spectrumColor, setSpectrumColor] = useState('#1e1e1e');
    const [albumArtSrc, setAlbumArtSrc] = useState(undefined);

    const timerRef = useRef(null);
    const diskRef = useRef(null);
    const albumRef = useRef(null);
    const diskAnim = useRef(null);
    const artAnim = useRef(null);
    const rampInterval = useRef(null);
    const lastStatus = useRef(null);

    const marqueeWrapperRef = useRef(null);

    useLayoutEffect(() => {
        const container = marqueeWrapperRef.current;
        if (!container) return;

        const realContent = container.querySelector(".rfm-initial-child-container");
        if (!realContent) return;

        const rawClientWidth = container.clientWidth;
        const styles = getComputedStyle(container);
        const paddingLeft = parseFloat(styles.paddingLeft || "0");
        const paddingRight = parseFloat(styles.paddingRight || "0");
        const contentWidth = rawClientWidth - paddingLeft - paddingRight;
        const textWidth = realContent.scrollWidth;
        console .log(`Container width: ${contentWidth}, Text width: ${textWidth}`);
        setShouldArtistScroll(textWidth > contentWidth);
    }, [metadata]);

    const { isConnected: metaConnected } = useReconnectingWebSocket('ws://localhost:5001/ws', {
        onOpen: () => console.log('🟢 WebSocket metadata подключен'),
        onMessage: (event) => {
            const { type, data } = JSON.parse(event.data);
            if (type !== 'metadata') return;
            setMetadata(data);
            setProgress(data.position);
            setDuration(data.duration || 1);
        },
        onClose: () => console.log('🔴 WebSocket metadata отключен'),
    });

    const { isConnected: themeConnected } = useReconnectingWebSocket('ws://localhost:42001', {
        onOpen: (_, socket) => {
            console.log('🟢 WebSocket theme подключен');
            socket.send(JSON.stringify({ channel: 'theme:get' }));
        },
        onMessage: (event) => {
            const { channel, payload } = JSON.parse(event.data);
            if (channel === 'theme:update') {
                setTheme(payload);
            }
        },
        onClose: () => console.log('🔴 WebSocket theme отключен'),
    });

    // Handle album art or identicon generation
    useEffect(() => {
        if (!metadata) {
            setAlbumArtSrc(undefined);
            return;
        }

        // If we have real album art, use it
        if (metadata.albumArtBase64) {
            setAlbumArtSrc(metadata.albumArtBase64);
            return;
        }

        // Otherwise, generate identicon
        const identicon = generateTrackIdenticon(metadata);
        if (identicon) {
            setAlbumArtSrc(identicon.dataUrl);

            // Apply colors from identicon immediately
            const color = identicon.mainColor;
            const shadow = lightenColor(color, 0.2);
            const spectrum = identicon.palette[1] || color;
            const spectrumPeak = identicon.palette[2] || color;

            const newColors = {
                bg: `rgb(${color[0]}, ${color[1]}, ${color[2]}, 0.25)`,
                shadow: `rgb(${shadow[0]}, ${shadow[1]}, ${shadow[2]})`,
                spectrum: `rgb(${spectrum[0]}, ${spectrum[1]}, ${spectrum[2]})`,
                peak: `rgb(${spectrumPeak[0]}, ${spectrumPeak[1]}, ${spectrumPeak[2]})`,
            };

            setPendingColorData(newColors);
        } else {
            setAlbumArtSrc(undefined);
        }
    }, [metadata]);

    // Extract colors from real album art using ColorThief
    useEffect(() => {
        if (!albumRef.current || !metadata?.albumArtBase64) return;
        const colorThief = new ColorThief();
        const img = albumRef.current;

        const onLoad = () => {
            const palette = colorThief.getPalette(img, 6);
            const color = colorThief.getColor(img);
            const shadow = lightenColor(color, 0.2);
            const spectrum = palette[1];
            const spectrumPeak = palette[2];

            const newColors = {
                bg: `rgb(${color[0]}, ${color[1]}, ${color[2]}, 0.25)`,
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
            setSpectrumColor(pendingColorData.spectrum);
            setSpectrumPeakColor(pendingColorData.peak);
        }, 150); // задержка
    }, [pendingColorData]);

    useEffect(() => {
        return () => clearTimeout(colorApplyTimeoutRef.current);
    }, []);


    // Инициализация Web Animations API для Disk и AlbumArt
    useEffect(() => {
        if (diskRef.current) {
            const anim = diskRef.current.animate(
                [ { transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' } ],
                { duration: 1818, iterations: Infinity, fill: 'forwards' }
            );
            anim.pause();
            anim.playbackRate = 0;
            diskAnim.current = anim;
        }
        if (albumRef.current) {
            const anim2 = albumRef.current.animate(
                [ { transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' } ],
                { duration: 1818, iterations: Infinity, fill: 'forwards' }
            );
            anim2.pause();
            anim2.playbackRate = 0;
            artAnim.current = anim2;
        }
        return () => {
            diskAnim.current?.cancel();
            artAnim.current?.cancel();
            if (rampInterval.current) clearInterval(rampInterval.current);
        };
    }, []);

    // Управление скоростью при смене статуса
    useEffect(() => {
        const anim = diskAnim.current;
        const anim2 = artAnim.current;
        if (!anim || !anim2) return;
        const status = metadata?.status;
        if (!status || status === lastStatus.current) return;
        lastStatus.current = status;

        if (rampInterval.current) {
            clearInterval(rampInterval.current);
            rampInterval.current = null;
        }
        const RAMP_STEP = 0.05;
        const INTERVAL = 50;
        if (status === 'Playing') {
            rampInterval.current = window.setInterval(() => {
                anim.playbackRate = Math.min(anim.playbackRate + RAMP_STEP, 1);
                anim2.playbackRate = Math.min(anim2.playbackRate + RAMP_STEP, 1);
                anim.play(); anim2.play();
                if (anim.playbackRate >= 1) {
                    clearInterval(rampInterval.current);
                    rampInterval.current = null;
                }
            }, INTERVAL);
        } else {
            rampInterval.current = window.setInterval(() => {
                anim.playbackRate = Math.max(anim.playbackRate - RAMP_STEP, 0);
                anim2.playbackRate = Math.max(anim2.playbackRate - RAMP_STEP, 0);
                if (anim.playbackRate <= 0) {
                    anim.pause(); anim2.pause();
                    clearInterval(rampInterval.current);
                    rampInterval.current = null;
                }
            }, INTERVAL);
        }
    }, [metadata]);

    // Таймер прогресса
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        // Only start timer if we have valid duration and position
        if (metadata?.status === 'Playing' && duration > 0 && progress >= 0) {
            timerRef.current = setInterval(() => {
                setProgress(prev => {
                    const next = prev + 1;
                    if (next >= duration) { clearInterval(timerRef.current); return duration; }
                    return next;
                });
            }, 1000);
        }
        return () => timerRef.current && clearInterval(timerRef.current);
    }, [metadata, duration, progress]);

    const pointerLeft = 20 + (80 - 20) * (Math.min(progress, duration) / duration);
    const showProgress = duration > 0 && metadata;

    return (
        <ThemeProvider theme={theme}>
            <GlobalStyle />
            <Wrapper>
            <AudioPlayerContainer>
                <FFTWrapper>
                    <FFTDonut
                        bars={128}
                        innerRadiusRatio={0.87}
                        startAngle={-Math.PI}
                        backgroundColor={"rgba(0,0,0,0.00)"}
                        barColor={spectrumColor}
                        peakColor={spectrumPeakColor}
                    />
                </FFTWrapper>
                <DiskContainer>
                    <Disk ref={diskRef} />
                    <AlbumArt
                        ref={albumRef}
                        src={albumArtSrc}
                        alt="Album Art"
                    />
                </DiskContainer>

                <div>
                    <Title ref={marqueeWrapperRef}>
                        <FixedMarquee
                            pauseOnHover={true}
                            play={shouldArtistScroll}
                            key={metadata?.artist}
                        >
                            <TitleContainer>{metadata ? metadata.title : ""}</TitleContainer>
                        </FixedMarquee>
                    </Title>
                    <Artist ref={marqueeWrapperRef}>
                        <FixedMarquee
                            pauseOnHover={true}
                            play={shouldArtistScroll}
                            key={metadata?.artist}
                        >
                            <ArtistContainer>{metadata ? metadata.artist : ""}</ArtistContainer>
                        </FixedMarquee>
                    </Artist>
                </div>

                {showProgress && (
                    <>
                        <Deck>
                            <svg style={{filter: 'drop-shadow(4px 4px 6px rgba(0,0,0,0.4))'}} width={200} height={100} xmlns="http://www.w3.org/2000/svg">
                                <path d="M 0,0 L 70,0 A 32,32 0 0 1 70,65 L 0,65 Z M 20,22 L 80,22 L 80,43 L 20,43 Z" fill="#999" fillRule="evenodd" />
                                <path d="M 20,22 L 80,22 L 80,43 L 20,43 Z" fill="#000" opacity="0.01" />
                            </svg>
                        </Deck>

                        <ProgressPointer $left={pointerLeft}>
                            <svg style={{filter: 'drop-shadow(4px 4px 6px rgba(255,0,0,1))'}} width={5} height={20} xmlns="http://www.w3.org/2000/svg">
                                <path d="M 0,0 L 2,15 L 4,0" fill="#ff0000" fillRule="evenodd" />
                            </svg>
                        </ProgressPointer>
                    </>
                )}

            </AudioPlayerContainer>
            {!(metaConnected && themeConnected) && <ConnectionLost>нет связи с источником</ConnectionLost>}
            </Wrapper>
        </ThemeProvider>
    );
}
