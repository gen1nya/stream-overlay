const fs = require("fs");
const path = require("path");

// Копируем prebuilds (.node), как и раньше
const prebuildsSrc = path.resolve(__dirname, "..", "native", "prebuilds");
const prebuildsDest = path.resolve(__dirname, "..", "dist-backend", "native", "prebuilds");

if (fs.existsSync(prebuildsSrc)) {
    fs.mkdirSync(prebuildsDest, { recursive: true });
    fs.cpSync(prebuildsSrc, prebuildsDest, { recursive: true });
    console.log(`[prebuilds] copied:\n  ${prebuildsSrc}\n→ ${prebuildsDest}`);
} else {
    console.warn(`[prebuilds] nothing to copy: ${prebuildsSrc} not found`);
}

// 🔹 Копируем linux-media.js в dist-backend/native/media
const linuxMediaSrcFile = path.resolve(__dirname, "..", "native", "media", "linux-media.js");
const linuxMediaDestDir = path.resolve(__dirname, "..", "dist-backend", "native", "media");
const linuxMediaDestFile = path.join(linuxMediaDestDir, "linux-media.js");

if (fs.existsSync(linuxMediaSrcFile)) {
    fs.mkdirSync(linuxMediaDestDir, { recursive: true });
    fs.copyFileSync(linuxMediaSrcFile, linuxMediaDestFile);
    console.log(`[native/media] copied linux-media.js:\n  ${linuxMediaSrcFile}\n→ ${linuxMediaDestFile}`);
} else {
    console.warn(`[native/media] linux-media.js not found at ${linuxMediaSrcFile}`);
}
