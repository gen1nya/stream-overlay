import React, {useEffect, useRef, useState} from "react";
import styled, {createGlobalStyle, ThemeProvider} from "styled-components";
import diskImg from "../assets/disk.png";
import { defaultTheme } from '../theme';
import {hexToRgba} from "../utils.js";

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
        console.log("borderRadius", borderRadius);
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
    text-align: ${({theme}) => theme.player?.text?.textAlign || 'left'};
    font-size: 16px;
    font-weight: bold;
    width: 100%;
`;

const Artist = styled.div`
    box-sizing: border-box;
    text-align: ${({theme}) => theme.player?.text?.textAlign || 'left'};
    font-size: 14px;
    color: #b8b8b8;
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

export default function AudioPlayerComponent() {
    const [theme, setTheme] = useState(defaultTheme);
    const [metadata, setMetadata] = useState(null);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(1);

    const timerRef = useRef(null);
    const diskRef = useRef(null);
    const albumRef = useRef(null);
    const diskAnim = useRef(null);
    const artAnim = useRef(null);
    const rampInterval = useRef(null);
    const lastStatus = useRef(null);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:5001/ws');
        ws.onopen = () => console.log('🟢 WebSocket metadata подключен');
        ws.onmessage = (event) => {
            const {type, data} = JSON.parse(event.data);
            if (type !== 'metadata') return;
            setMetadata(data);
            setProgress(data.position);
            setDuration(data.duration || 1);
        };
        ws.onclose = () => console.log('🔴 WebSocket metadata отключен');
        return () => ws.close();
    }, []);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:42001');

        ws.onopen = () => {
            console.log('🟢 WebSocket theme подключен');
            ws.send(JSON.stringify({ channel: 'theme:get' }));
        };

        ws.onmessage = (event) => {
            const { channel, payload } = JSON.parse(event.data);
            if (channel === 'theme:update') {
                setTheme(payload);
            }
        };

        ws.onclose = () => console.log('🔴 WebSocket theme отключен');
        return () => ws.close();
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
        if (metadata?.status === 'Playing') {
            timerRef.current = setInterval(() => {
                setProgress(prev => {
                    const next = prev + 1;
                    if (next >= duration) { clearInterval(timerRef.current); return duration; }
                    return next;
                });
            }, 1000);
        }
        return () => timerRef.current && clearInterval(timerRef.current);
    }, [metadata, duration]);

    const pointerLeft = 20 + (80 - 20) * (Math.min(progress, duration) / duration);

    return (
        <ThemeProvider theme={theme}>
            <GlobalStyle />
            <AudioPlayerContainer>
                <DiskContainer>
                    <Disk ref={diskRef} />
                    <AlbumArt
                        ref={albumRef}
                        src={metadata ? `data:image/png;base64,${metadata.albumArtBase64}` : ""}
                        alt="Album Art"
                    />
                </DiskContainer>

                <div>
                    <Title>{metadata ? metadata.title : ""}</Title>
                    <Artist>{metadata ? metadata.artist : ""}</Artist>
                </div>

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

            </AudioPlayerContainer>
        </ThemeProvider>
    );
}
