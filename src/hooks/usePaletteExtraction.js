import { useEffect, useRef, useState } from 'react';
import ColorThief from 'colorthief';
import { lightenColor } from '../utils.js';

const DEFAULT_COLORS = {
    spectrum: '#1e1e1e',
    peak: '#1e1e1e',
    bg: '#1e1e1e',
    shadow: '#1e1e1e',
    progress: '#1e1e1e',
};

/**
 * Custom hook for extracting color palette from images with race condition protection
 * Uses immediate application strategy - colors are applied as soon as extraction completes
 * CSS transitions in components handle visual smoothness
 */
export function usePaletteExtraction(imageSrc, imgRef, options = {}) {
    const { paletteSize = 6 } = options;

    const [colors, setColors] = useState(DEFAULT_COLORS);

    // Track which imageSrc we're currently processing
    const processingRef = useRef(null);

    useEffect(() => {
        // Mark this imageSrc as the one we want
        processingRef.current = imageSrc;

        // No image - reset immediately
        if (!imageSrc) {
            setColors(DEFAULT_COLORS);
            return;
        }

        const img = imgRef?.current;
        if (!img) return;

        const colorThief = new ColorThief();

        const extractAndApply = () => {
            // Check this is still the image we care about
            if (processingRef.current !== imageSrc) return;

            // CRITICAL: Verify that img.src actually matches what we expect
            if (img.src !== imageSrc) return;

            try {
                const width = img.naturalWidth || img.width;
                const height = img.naturalHeight || img.height;

                if (width === 0 || height === 0) return;

                // Extract colors synchronously
                const palette = colorThief.getPalette(img, paletteSize);
                const color = colorThief.getColor(img);

                // Check again after extraction (this is the critical moment)
                if (processingRef.current !== imageSrc) return;

                // Double-check img.src still matches
                if (img.src !== imageSrc) return;

                if (!color || !palette || palette.length < 3) return;

                const shadow = lightenColor(color, 0.2);
                const spectrum = palette[1] || color;
                const spectrumPeak = palette[2] || color;

                const newColors = {
                    bg: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
                    shadow: `rgb(${shadow[0]}, ${shadow[1]}, ${shadow[2]})`,
                    spectrum: `rgb(${spectrum[0]}, ${spectrum[1]}, ${spectrum[2]})`,
                    peak: `rgb(${spectrumPeak[0]}, ${spectrumPeak[1]}, ${spectrumPeak[2]})`,
                    progress: `rgb(${spectrum[0]}, ${spectrum[1]}, ${spectrum[2]})`,
                };

                // Final check before applying
                if (processingRef.current !== imageSrc || img.src !== imageSrc) return;

                setColors(newColors);

            } catch (error) {
                console.error('Color extraction failed:', error);
            }
        };

        const handleLoad = () => {
            if (processingRef.current !== imageSrc) return;
            if (img.src !== imageSrc) return;
            extractAndApply();
        };

        // ALWAYS wait for load event - don't trust img.complete when src is changing
        img.addEventListener('load', handleLoad, { once: true });

        // Also check if it's already loaded AND src matches
        if (img.complete && img.src === imageSrc && img.naturalWidth > 0 && img.naturalHeight > 0) {
            extractAndApply();
        }

        // Cleanup
        return () => {
            img.removeEventListener('load', handleLoad);
        };
    }, [imageSrc, imgRef, paletteSize]);

    return colors;
}
