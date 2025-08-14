// dist-backend/native/index.js (или src/native/index.ts с тем же смыслом)
import fs from "fs";
import path from "path";

const nodeGypBuild = require('node-gyp-build');

function loadAddon(dir) {
    try {
        return nodeGypBuild(dir);
    } catch (e: any) {
        const rel = path.join(dir, 'build', 'Release');
        if (fs.existsSync(rel)) {
            const f = fs.readdirSync(rel).find((x) => x.endsWith('.node'));
            if (f) return require(path.join(rel, f));
        }
        e.message += `\nAlso looked in: ${rel} ${fs.existsSync(rel) ? `[${fs.readdirSync(rel).join(', ')}]` : '(missing)'}`;
        throw e;
    }
}

// ВАЖНО: не делай path.join(__dirname, 'native', '...') — __dirname уже указывает на /native
const mediaDir = path.join(__dirname, 'media');
const fftDir   = path.join(__dirname, 'fft');

exports.media = loadAddon(mediaDir);
exports.fft   = loadAddon(fftDir);
