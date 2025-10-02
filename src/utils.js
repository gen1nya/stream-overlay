import { css } from 'styled-components';
import {isEasingArray} from "framer-motion";

export function hexToRgba(hex, opacity) {
    const cleanHex = hex.replace('#', '');
    const bigint = parseInt(cleanHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function lightenColor([r, g, b], amount = 0.4) {
    return [
        Math.min(255, Math.floor(r + (255 - r) * amount)),
        Math.min(255, Math.floor(g + (255 - g) * amount)),
        Math.min(255, Math.floor(b + (255 - b) * amount)),
    ];
}

export const parseRgbaToHexAndAlpha = (rgba) => {
    if (!rgba || typeof rgba !== 'string') {
        return { hex: '#000000', alpha: 1 };
    }

    if (rgba.startsWith('#')) {
        return { hex: rgba, alpha: 1 };
    }

    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) {
        return { hex: '#000000', alpha: 1 };
    }

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    const a = match[4] ? parseFloat(match[4]) : 1;

    const hex = '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');

    return { hex, alpha: a };
};

export function downscaleSpectrumWeighted(input, targetSize) {
    const inputSize = input.length;
    const output = new Array(targetSize);
    const curveFactor = 0.8;

    for (let i = 0; i < targetSize; i++) {
        const scaled = Math.pow(i / targetSize, curveFactor);
        const start = Math.floor(inputSize * scaled);
        const end = Math.floor(inputSize * Math.pow((i + 1) / targetSize, curveFactor));

        let sum = 0;
        let weightSum = 0;

        for (let j = start; j < end; j++) {
            const weight = 1 / (j + 1); // можно поиграться с весами
            sum += input[j] * weight;
            weightSum += weight;
        }

        output[i] = weightSum > 0 ? sum / weightSum : 0;
    }

    return output;
}

export function downscaleSpectrum(input, targetSize, mode = 'avg') {
    const factor = input.length / targetSize;
    const output = new Array(targetSize);

    for (let i = 0; i < targetSize; i++) {
        const start = Math.floor(i * factor);
        const end = Math.floor((i + 1) * factor);

        let val;
        if (mode === 'max') {
            val = -Infinity;
            for (let j = start; j < end; j++) {
                if (input[j] > val) val = input[j];
            }
        } else if (mode === 'min') {
            val = Infinity;
            for (let j = start; j < end; j++) {
                if (input[j] < val) val = input[j];
            }
        } else { // 'avg' or default
            let sum = 0;
            for (let j = start; j < end; j++) {
                sum += input[j];
            }
            val = sum / (end - start);
        }

        output[i] = val;
    }

    return output;
}

export function getMatrix3dFromRotation(xDeg, yDeg, perspective = 800) {
    const xRad = (xDeg * Math.PI) / 180;
    const yRad = (yDeg * Math.PI) / 180;

    const cosX = Math.cos(xRad);
    const sinX = Math.sin(xRad);
    const cosY = Math.cos(yRad);
    const sinY = Math.sin(yRad);

    // rotateX * rotateY
    const m11 = cosY;
    const m12 = sinX * sinY;
    const m13 = cosX * sinY;
    const m21 = 0;
    const m22 = cosX;
    const m23 = -sinX;
    const m31 = -sinY;
    const m32 = sinX * cosY;
    const m33 = cosX * cosY;

    const perspectiveZ = -1 / perspective;

    const matrix = [
        m11, m12, m13, 0,
        m21, m22, m23, 0,
        m31, m32, m33, perspectiveZ,
        0,    0,    0, 1
    ];

    return `matrix3d(${matrix.map(n => n.toFixed(10)).join(',')})`;
}

export function getLayeredBackgroundStyles(themeObject) {
    if (!themeObject || themeObject.backgroundMode !== 'image') return '';

    const { backgroundImages = {} } = themeObject;
    const layers = [];
    const positions = [];
    const sizes = [];

    if (backgroundImages.top) {
        layers.push(`url(${backgroundImages.top})`);
        positions.push('top center');
        sizes.push('100% auto');
    }
    if (backgroundImages.bottom) {
        layers.push(`url(${backgroundImages.bottom})`);
        positions.push('bottom center');
        sizes.push('100% auto');
    }
    if (backgroundImages.middle) {
        const middleAlign = backgroundImages.middleAlign || 'center';
        layers.push(`url(${backgroundImages.middle})`);
        positions.push(`${middleAlign} center`);
        sizes.push('100% auto');
    }

    if (!layers.length) return '';

    return css`
        background-image: ${layers.join(', ')};
        background-position: ${positions.join(', ')};
        background-size: ${sizes.join(', ')};
        background-repeat: no-repeat;
        background-origin: border-box;
        background-clip: border-box;
    `;
}

export function generateGradientCSS(themeObject) {
    if (!themeObject || themeObject.backgroundMode !== 'gradient') return '';
    const { backgroundGradients = [] } = themeObject;
    if (!backgroundGradients.length) return '';
    const { type, angle, center, stops } = backgroundGradients[0];

    const stopStrings = stops
        .map(stop => `${hexToRgba(stop.color, stop.alpha)} ${stop.position}%`)
        .join(', ');

    console.log('Generating gradient CSS:', {
        type, angle, center, stops, stopStrings
    });
    if (type === 'linear') {
        return css`
            background: linear-gradient(${angle}deg, ${stopStrings});
        `;
    } else {
        return css`
            background: radial-gradient(circle at ${center.x}% ${center.y}%, ${stopStrings});
        `;
    }
}