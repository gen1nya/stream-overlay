// removeLocales.js
exports.default = async function(context) {
    const fs = require('fs');
    const path = require('path');

    console.log('🧹 Cleaning up unnecessary files...');


    // 1. locales
    const localeDir = path.join(context.appOutDir, 'locales');

    try {
        const files = await fs.promises.readdir(localeDir);

        for (const file of files) {
            if (!file.match(/en-US\.pak/)) {
                await fs.promises.unlink(path.join(localeDir, file));
                console.log(`✓ Removed locale: ${file}`);
            }
        }
    } catch (err) {
        console.error('Error removing locales:', err);
    }

    // 2. Chromium licenses
    const licensesToRemove = [
        'LICENSES.chromium.html',
        'LICENSE.electron.txt',
        'LICENSES.chromium.txt'
    ];

    for (const license of licensesToRemove) {
        const licensePath = path.join(context.appOutDir, license);

        try {
            if (fs.existsSync(licensePath)) {
                await fs.promises.unlink(licensePath);
                console.log(`✓ Removed license: ${license}`);
            }
        } catch (err) {
            console.error(`Error removing ${license}:`, err);
        }
    }

    // 3. macOS
    if (context.packager.platform.name === 'mac') {
        const resourcesDir = path.join(context.appOutDir, context.packager.appInfo.productFilename + '.app', 'Contents', 'Resources');

        for (const license of licensesToRemove) {
            const licensePath = path.join(resourcesDir, license);

            try {
                if (fs.existsSync(licensePath)) {
                    await fs.promises.unlink(licensePath);
                    console.log(`✓ Removed license from Resources: ${license}`);
                }
            } catch (err) {
                console.error(`Error removing ${license} from Resources:`, err);
            }
        }
    }

    console.log('✨ Cleanup complete!');
}