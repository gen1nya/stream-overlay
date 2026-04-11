import styled from "styled-components";
import React, { useMemo } from "react";
import FFTBars from "./FFTBars";

const FFTWrapper = styled.div`
  top: 0;
  left: 0;
  width: ${props => props.$width || '1280px'};
  height: ${props => props.$height || '350px'};
  overflow: hidden;
  position: absolute;
  z-index: -1;
  background: transparent;
`;

export default function LinearFFTDemo() {
    const params = useMemo(() => {
        const searchParams = new URLSearchParams(window.location.search);

        const getParam = (key, defaultValue, parser = (v) => v) => {
            const value = searchParams.get(key);
            return value !== null ? parser(value) : defaultValue;
        };

        const parseBoolean = (value) => {
            if (value === 'true' || value === '1') return true;
            if (value === 'false' || value === '0') return false;
            return value;
        };

        return {
            // wrapper
            width: getParam('width', '1280px'),
            height: getParam('height', '350px'),
            // bars
            bars: getParam('bars', 256, parseInt),
            barColor: getParam('barColor', '#37ff00'),
            barGradient: getParam('barGradient', true, parseBoolean),
            backgroundColor: getParam('backgroundColor', 'rgba(0,0,0,0.00)'),
            smoothDuration: getParam('smoothDuration', 16, parseFloat),
            amplitude: getParam('amplitude', 1, parseFloat),
            // peaks
            peakHold: getParam('peakHold', 10, parseFloat),
            peakFall: getParam('peakFall', 800, parseFloat),
            peakColor: getParam('peakColor', '#ce00ff'),
            peakThickness: getParam('peakThickness', 2, parseFloat),
        };
    }, []);

    return (
        <FFTWrapper $width={params.width} $height={params.height}>
            <FFTBars
                bars={params.bars}
                barColor={params.barColor}
                barGradient={params.barGradient}
                backgroundColor={params.backgroundColor}
                smoothDuration={params.smoothDuration}
                amplitude={params.amplitude}
                peakHold={params.peakHold}
                peakFall={params.peakFall}
                peakColor={params.peakColor}
                peakThickness={params.peakThickness}
            />
        </FFTWrapper>
    );
}
