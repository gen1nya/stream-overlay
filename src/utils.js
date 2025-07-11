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