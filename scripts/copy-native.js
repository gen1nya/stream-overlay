const fs = require('fs');
const path = require('path');

function findNodeFile(buildDir) {
  // Search for .node files in build/Release directory
  const releaseDir = path.join(buildDir, 'Release');

  if (!fs.existsSync(releaseDir)) {
    return null;
  }

  // Find all .node files (could be electron.napi.node, node.napi.node, or module_name.node)
  const files = fs.readdirSync(releaseDir);
  const nodeFiles = files.filter(f => f.endsWith('.node'));

  if (nodeFiles.length > 0) {
    // Return the first .node file found
    return path.join(releaseDir, nodeFiles[0]);
  }

  return null;
}

function copyNativeModules() {
  const nativeDir = path.join(__dirname, '..', 'native');
  const distBackendNativeDir = path.join(__dirname, '..', 'dist-backend', 'native');

  if (!fs.existsSync(distBackendNativeDir)) {
    fs.mkdirSync(distBackendNativeDir, { recursive: true });
  }

  const modules = [
    { name: 'media', binaryName: 'gsmtc' },
    { name: 'fft', binaryName: 'fft_bridge' }
  ];

  modules.forEach(({ name: moduleName, binaryName }) => {
    const moduleSourceDir = path.join(nativeDir, moduleName);
    const moduleDestDir = path.join(distBackendNativeDir, moduleName);

    if (!fs.existsSync(moduleSourceDir)) {
      console.warn(`⚠️  Warning: ${moduleName} module source directory not found`);
      return;
    }

    if (!fs.existsSync(moduleDestDir)) {
      fs.mkdirSync(moduleDestDir, { recursive: true });
    }

    // Try to find the .node file
    const buildDir = path.join(moduleSourceDir, 'build');
    const builtModulePath = findNodeFile(buildDir);

    if (builtModulePath) {
      // Copy with the expected binary name
      const destPath = path.join(moduleDestDir, `${binaryName}.node`);
      fs.copyFileSync(builtModulePath, destPath);
      console.log(`✅ Copied ${moduleName} module (${path.basename(builtModulePath)} -> ${binaryName}.node)`);
    } else {
      console.warn(`⚠️  Warning: Built ${moduleName} module not found in ${buildDir}`);
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
