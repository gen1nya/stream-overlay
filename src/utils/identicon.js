/**
 * Generate a simple hash from a string
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Convert HSL to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {[number, number, number]} RGB array [r, g, b]
 */
function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [
        Math.round(255 * f(0)),
        Math.round(255 * f(8)),
        Math.round(255 * f(4))
    ];
}

/**
 * Generate an identicon as a base64 data URL with color palette
 * @param {string} seed - String to generate identicon from (e.g., track title)
 * @param {number} size - Size of the identicon in pixels (default: 200)
 * @returns {{dataUrl: string, palette: Array<[number, number, number]>}} Object with data URL and RGB color palette
 */
export function generateIdenticon(seed, size = 200) {
    if (!seed) {
        return null;
    }

    const hash = simpleHash(seed);
    const gridSize = 5; // 5x5 grid
    const cellSize = size / gridSize;

    // Generate color from hash
    const hue = hash % 360;
    const saturation = 50 + (hash % 30); // 50-80%
    const lightness = 40 + (hash % 20);  // 40-60%
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const bgColor = `hsl(${hue}, ${saturation}%, ${lightness - 25}%)`; // Darker background

    // Generate RGB palette compatible with ColorThief format
    const baseRgb = hslToRgb(hue, saturation, lightness);
    const palette = [
        baseRgb, // Main color
        hslToRgb(hue, saturation, lightness + 10), // Lighter variant
        hslToRgb(hue, saturation, lightness - 10), // Darker variant
        hslToRgb((hue + 30) % 360, saturation, lightness), // Complementary hue
        hslToRgb((hue - 30 + 360) % 360, saturation, lightness), // Another complementary
        hslToRgb(hue, saturation, lightness - 25), // Background color
    ];

    // Generate pattern (symmetric for better aesthetics)
    const pattern = [];
    for (let y = 0; y < gridSize; y++) {
        pattern[y] = [];
        for (let x = 0; x < Math.ceil(gridSize / 2); x++) {
            const index = y * Math.ceil(gridSize / 2) + x;
            const bit = (hash >> index) & 1;
            pattern[y][x] = bit === 1;

            // Mirror for symmetry
            if (x !== gridSize - 1 - x) {
                pattern[y][gridSize - 1 - x] = bit === 1;
            }
        }
    }

    // Generate SVG
    const rects = [];
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (pattern[y][x]) {
                rects.push(`<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`);
            }
        }
    }

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <rect width="${size}" height="${size}" fill="${bgColor}"/>
            ${rects.join('')}
        </svg>
    `.trim();

    // Convert SVG to base64 data URL
    const base64 = btoa(unescape(encodeURIComponent(svg)));
    const dataUrl = `data:image/svg+xml;base64,${base64}`;

    return {
        dataUrl,
        palette,
        mainColor: baseRgb
    };
}

/**
 * Generate identicon from track metadata
 * @param {Object} metadata - Track metadata object
 * @returns {{dataUrl: string, palette: Array<[number, number, number]>, mainColor: [number, number, number]}|null} Identicon object or null
 */
export function generateTrackIdenticon(metadata) {
    if (!metadata) {
        return null;
    }

    // Use title + artist as seed for consistent identicons per track
    const seed = `${metadata.title || ''}${metadata.artist || ''}`;

    if (!seed.trim()) {
        return null;
    }

    return generateIdenticon(seed);
}
