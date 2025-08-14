const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'native', 'prebuilds');
const dest = path.resolve(__dirname, '..', 'dist-backend', 'native', 'prebuilds');

if (!fs.existsSync(src)) {
    console.warn(`[prebuilds] nothing to copy: ${src} not found`);
    process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`[prebuilds] copied:\n  ${src}\n→ ${dest}`);
