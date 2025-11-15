const fs = require('fs');
const path = require('path');

function copyNativeModules() {
  const nativeDir = path.join(__dirname, '..', 'native');
  const distBackendNativeDir = path.join(__dirname, '..', 'dist-backend', 'native');

  if (!fs.existsSync(distBackendNativeDir)) {
    fs.mkdirSync(distBackendNativeDir, { recursive: true });
  }

  const modules = ['media', 'fft'];

  modules.forEach(moduleName => {
    const moduleSourceDir = path.join(nativeDir, moduleName);
    const moduleDestDir = path.join(distBackendNativeDir, moduleName);

    if (!fs.existsSync(moduleSourceDir)) {
      console.warn(`⚠️  Warning: ${moduleName} module source directory not found`);
      return;
    }

    if (!fs.existsSync(moduleDestDir)) {
      fs.mkdirSync(moduleDestDir, { recursive: true });
    }

    const moduleBinaryName = moduleName === 'fft' ? 'fft_bridge' : moduleName;
    const builtModulePath = path.join(moduleSourceDir, 'build', 'Release', `${moduleBinaryName}.node`);

    if (fs.existsSync(builtModulePath)) {
      const destPath = path.join(moduleDestDir, `${moduleBinaryName}.node`);
      fs.copyFileSync(builtModulePath, destPath);
      console.log(`✅ Copied ${moduleName} module to dist-backend`);
    } else {
      console.warn(`⚠️  Warning: Built ${moduleName} module not found at ${builtModulePath}`);
    }

    const packageJsonPath = path.join(moduleSourceDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      fs.copyFileSync(packageJsonPath, path.join(moduleDestDir, 'package.json'));
    }

    const indexDtsPath = path.join(moduleSourceDir, 'index.d.ts');
    if (fs.existsSync(indexDtsPath)) {
      fs.copyFileSync(indexDtsPath, path.join(moduleDestDir, 'index.d.ts'));
    }

    if (moduleName === 'media') {
      const linuxMediaPath = path.join(moduleSourceDir, 'linux-media.js');
      if (fs.existsSync(linuxMediaPath)) {
        fs.copyFileSync(linuxMediaPath, path.join(moduleDestDir, 'linux-media.js'));
      }
    }
  });

  console.log('✅ Native modules copy completed');
}

copyNativeModules();
