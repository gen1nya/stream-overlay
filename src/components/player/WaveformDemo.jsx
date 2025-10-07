import styled from "styled-components";
import React, { useMemo } from "react";
import WaveForm from "./WaveForm";

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

export default function WaveformDemo() {
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
            lineColor: getParam('lineColor', '#37ff00'),
            lineWidth: getParam('lineWidth', 2, parseFloat),
            backgroundColor: getParam('backgroundColor', 'rgba(197,89,89,0.06)'),
            gridColor: getParam('gridColor', 'rgba(255,255,255,0.1)'),
            centerLineColor: getParam('centerLineColor', 'rgba(255,255,255,0.3)'),
            showGrid: getParam('showGrid', true, parseBoolean),
            showCenterLine: getParam('showCenterLine', true, parseBoolean),
            smoothDuration: getParam('smoothDuration', 16, parseFloat),
            amplitude: getParam('amplitude', 1, parseFloat),
            width: getParam('width', '1280px'),
            height: getParam('height', '350px'),
        };
    }, []);

    return (
        <FFTWrapper $width={params.width} $height={params.height}>
            <WaveForm
                lineColor={params.lineColor}
                lineWidth={params.lineWidth}
                backgroundColor={params.backgroundColor}
                gridColor={params.gridColor}
                centerLineColor={params.centerLineColor}
                showGrid={params.showGrid}
                showCenterLine={params.showCenterLine}
                smoothDuration={params.smoothDuration}
                amplitude={params.amplitude}
            />
        </FFTWrapper>
    );
}