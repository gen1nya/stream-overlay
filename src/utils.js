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
