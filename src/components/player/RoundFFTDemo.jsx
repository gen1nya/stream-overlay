import styled from "styled-components";
import React, { useMemo } from "react";
import FFTDonut from "./FFTDonut";

const FFTWrapper = styled.div`
    top: 0;
    left: 0;
    width: ${props => props.$width || '500px'};
    height: ${props => props.$height || '500px'};
    overflow: hidden;
    position: absolute;
    z-index: -1;
    background: transparent;
`;

export default function RoundFFTDemo() {
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
            width: getParam('width', '500px'),
            height: getParam('height', '500px'),
            // bars
            bars: getParam('bars', 256, parseInt),
            barColor: getParam('barColor', '#ce00ff'),
            barGradient: getParam('barGradient', true, parseBoolean),
            backgroundColor: getParam('backgroundColor', 'rgba(0,0,0,0.00)'),
            smoothDuration: getParam('smoothDuration', 60, parseFloat),
            // peaks
            peakHold: getParam('peakHold', 500, parseFloat),
            peakFall: getParam('peakFall', 800, parseFloat),
            peakColor: getParam('peakColor', '#57fe04'),
            peakThickness: getParam('peakThickness', 2, parseFloat),
            // ring geometry
            innerRadiusRatio: getParam('innerRadiusRatio', 0.6, parseFloat),
            sectorGap: getParam('sectorGap', 0.01, parseFloat),
            startAngle: getParam('startAngle', -Math.PI / 2, parseFloat),
            inactiveSector: getParam('inactiveSector', 0, parseFloat),
        };
    }, []);

    return (
        <FFTWrapper $width={params.width} $height={params.height}>
            <FFTDonut
                bars={params.bars}
                barColor={params.barColor}
                barGradient={params.barGradient}
                backgroundColor={params.backgroundColor}
                smoothDuration={params.smoothDuration}
                peakHold={params.peakHold}
                peakFall={params.peakFall}
                peakColor={params.peakColor}
                peakThickness={params.peakThickness}
                innerRadiusRatio={params.innerRadiusRatio}
                sectorGap={params.sectorGap}
                startAngle={params.startAngle}
                inactiveSector={params.inactiveSector}
            />
        </FFTWrapper>
    );
}
