import fs from "fs";
import path from "path";
import os from 'os';

const nodeGypBuild = require('node-gyp-build');

function loadAddon(dir) {
    console.log(`[Native Loader] Attempting to load addon from: ${dir}`);
    try {
        const addon = nodeGypBuild(dir);
        console.log(`[Native Loader] Successfully loaded via node-gyp-build from: ${dir}`);
        return addon;
    } catch (e: any) {
        console.log(`[Native Loader] node-gyp-build failed, trying manual paths...`);
        // Try build/Release (for development builds)
        const rel = path.join(dir, 'build', 'Release');
        if (fs.existsSync(rel)) {
            const f = fs.readdirSync(rel).find((x) => x.endsWith('.node'));
            if (f) {
                const fullPath = path.join(rel, f);
                console.log(`[Native Loader] Loading from build/Release: ${fullPath}`);
                return require(fullPath);
            }
        }

        // Try direct directory (for production dist-backend)
        if (fs.existsSync(dir)) {
            const f = fs.readdirSync(dir).find((x) => x.endsWith('.node'));
            if (f) {
                const fullPath = path.join(dir, f);
                console.log(`[Native Loader] Loading from direct directory: ${fullPath}`);
                return require(fullPath);
            }
        }

        // Try platform-specific JS fallback
        if (os.platform() === "linux") {
            const jsImpl = path.join(dir, "linux-media.js");
            if (fs.existsSync(jsImpl)) {
                console.log(`[Native Loader] Loading JS fallback: ${jsImpl}`);
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
