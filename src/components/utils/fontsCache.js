const registeredFonts = new Set();

export function registerFontFace(fontFamily, fontUrl) {
    if (registeredFonts.has(fontFamily)) return;

    const styleSheet = document.styleSheets[0] ?? createStyleSheet();

    const fontFaceRule = `
    @font-face {
      font-family: '${fontFamily}';
      src: url('${fontUrl}') format('woff2');
      font-weight: normal;
      font-style: normal;
    }
  `;

    try {
        styleSheet.insertRule(fontFaceRule, styleSheet.cssRules.length);
        registeredFonts.add(fontFamily);
    } catch (err) {
        console.error('Failed to insert font-face rule:', err);
    }
}

function createStyleSheet() {
    const style = document.createElement('style');
    document.head.appendChild(style);
    return style.sheet;
}

export function loadFont(family, url) {
    if (registeredFonts.has(family)) return;

    const style = document.createElement('style');
    style.id = `font-${family}`;
    style.innerHTML = `
    @font-face {
      font-family: '${family}';
      src: url('${url}') format('woff2');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }`;
    document.head.appendChild(style);
    registeredFonts.add(family);
}

export function preloadAllFonts(fonts) {
    for (const font of fonts) {
        const url = font.files.regular || Object.values(font.files)[0];
        if (url) loadFont(font.family, url);
    }
}