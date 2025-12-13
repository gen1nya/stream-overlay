/**
 * Sync version from version.json to package.json and src/config/version.js
 * Run before build: node scripts/sync-version.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VERSION_FILE = path.join(ROOT, 'version.json');
const PACKAGE_FILE = path.join(ROOT, 'package.json');
const CONFIG_FILE = path.join(ROOT, 'src/config/version.js');

// Read version.json
const versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
const { version } = versionData;

// Generate build date from current date
const now = new Date();
const buildDate = now.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
}).replace(/\//g, '.');

console.log(`📦 Syncing version: ${version} (build: ${buildDate})`);

// Update package.json
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_FILE, 'utf8'));
const oldPackageVersion = packageJson.version;
packageJson.version = version;
fs.writeFileSync(PACKAGE_FILE, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`   package.json: ${oldPackageVersion} → ${version}`);

// Update src/config/version.js
const configContent = `// Auto-generated from version.json - do not edit manually
// Run: npm run sync-version

export const APP_VERSION = '${version}';
export const BUILD_DATE = '${buildDate}';
`;
fs.writeFileSync(CONFIG_FILE, configContent);
console.log(`   src/config/version.js: updated`);

console.log('✅ Version sync complete!');
