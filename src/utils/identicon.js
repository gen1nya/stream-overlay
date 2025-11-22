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
 * Generate an identicon as a base64 data URL
 * @param {string} seed - String to generate identicon from (e.g., track title)
 * @param {number} size - Size of the identicon in pixels (default: 200)
 * @returns {string} Base64 data URL
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
    return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generate identicon from track metadata
 * @param {Object} metadata - Track metadata object
 * @returns {string|null} Base64 data URL or null
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
