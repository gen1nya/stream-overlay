import React, {useEffect, useRef, useState} from "react";
import styled from "styled-components";
import {hexToRgba, lightenColor} from "../utils.js"
import FFTBars from "./FFTBars";
import useReconnectingWebSocket from "../hooks/useReconnectingWebSocket";
import ColorThief from "colorthief";

const Card = styled.div`
    margin: 20px;
    background: #1e1e1e;
    border-radius: 20px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    width: 500px;
    color: #fff;
    background: ${({ $bgColor }) => $bgColor || '#1e1e1e'};
    box-shadow: 0 0 20px ${({ $shadowColor }) => $shadowColor};
    transition: background 0.5s ease, box-shadow 0.5s ease;
`;

const TopRow = styled.div`
  display: flex;
  align-items: top;
`;

const Cover = styled.img`
    width: 160px;
    height: 160px;
    border-radius: 12px;
    background-color: #535bf2;
    object-fit: cover;
    box-shadow: 3px 3px 12px rgba(0, 0, 0, 0.1);
`;

const Info = styled.div`
  margin-left: 20px;
  flex: 1;
`;

const Title = styled.div`
    font-size: 20px;
    width: 320px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    font-weight: bold;
`;

const Artist = styled.div`
    font-size: 16px;
    color: #999;
    width: 320px;
    margin-top: 4px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
`;

const FFTWrapper = styled.div`
  width: 100%;
  height: 92px;
  margin-top: 8px;
  border-radius: 12px;
  border: 1px solid #333;
  overflow: hidden;
`;

const ProgressBarContainer = styled.div`
  display: flex;
    margin-top: 20px;
  align-items: center;
`;

const Time = styled.div`
  font-size: 14px;
  color: #aaa;
  width: 40px;
`;

const ProgressTrack = styled.div`
  flex: 1;
  height: 6px;
  background: #333;
  border-radius: 3px;
  margin: 0 10px;
  overflow: hidden;
`;

const Progress = styled.div`
    height: 100%;
    background: ${({ $progressColor }) => $progressColor || '#1e1e1e'};
    width: ${({ $percent }) => $percent}%;
    transition: width 0.5s ease;
`;

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ModernAudioPlayer() {
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

    const { isConnected: metaConnected } = useReconnectingWebSocket('ws://localhost:5001/ws', {
        onOpen: () => console.log('🟢 WebSocket metadata подключен'),
        onMessage: (event) => {
            const { type, data } = JSON.parse(event.data);
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
                    if (next >= duration) { clearInterval(timerRef.current); return duration; }
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
            setBgColor(pendingColorData.bg);
            setShadowColor(pendingColorData.shadow);
            setSpectrumColor(pendingColorData.spectrum);
            setProgressColor(pendingColorData.spectrum);
            setSpectrumPeakColor(pendingColorData.peak);
            setPendingColorData(null);
        }, 150); // задержка
    }, [pendingColorData]);

    useEffect(() => {
        return () => clearTimeout(colorApplyTimeoutRef.current);
    }, []);

    return (
        <Card $bgColor={bgColor} $shadowColor={shadowColor}>
            <TopRow>
                <Cover
                    ref={coverRef}
                    src={metadata?.albumArtBase64 ? `data:image/png;base64,${metadata.albumArtBase64}` : undefined}
                    alt="Album Art"
                    crossOrigin="anonymous"
                />
                <Info>
                    <Title>{metadata ? metadata?.title : ""}</Title>
                    <Artist>{metadata ? metadata?.artist : ""}</Artist>
                    <FFTWrapper>
                        <FFTBars
                            bars = {48}
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
                    <Progress $percent={(progress / duration) * 100} $progressColor={progressColor} />
                </ProgressTrack>
                <Time>{formatTime(duration)}</Time>
            </ProgressBarContainer>
        </Card>
    );
};
