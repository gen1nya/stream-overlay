import fs from "fs";
import path from "path";
import os from 'os';

const nodeGypBuild = require('node-gyp-build');

function loadAddon(dir) {
    try {
        return nodeGypBuild(dir);
    } catch (e: any) {
        // Try build/Release (for development builds)
        const rel = path.join(dir, 'build', 'Release');
        if (fs.existsSync(rel)) {
            const f = fs.readdirSync(rel).find((x) => x.endsWith('.node'));
            if (f) return require(path.join(rel, f));
        }

        // Try direct directory (for production dist-backend)
        if (fs.existsSync(dir)) {
            const f = fs.readdirSync(dir).find((x) => x.endsWith('.node'));
            if (f) return require(path.join(dir, f));
        }

        // Try platform-specific JS fallback
        if (os.platform() === "linux") {
            const jsImpl = path.join(dir, "linux-media.js");
            if (fs.existsSync(jsImpl)) {
                return require(jsImpl);
            }
        }
        // macOS will try native module first, fallback handled below

        e.message += `\nAlso looked in: ${rel} ${fs.existsSync(rel) ? `[${fs.readdirSync(rel).join(', ')}]` : '(missing)'}`;
        e.message += `\nAlso looked in: ${dir} ${fs.existsSync(dir) ? `[${fs.readdirSync(dir).join(', ')}]` : '(missing)'}`;

        throw e;
    }
}

const mediaDir = path.join(__dirname, 'media');
const fftDir   = path.join(__dirname, 'fft');

exports.media = loadAddon(mediaDir);
exports.fft   = loadAddon(fftDir);
