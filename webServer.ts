import express from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import crypto from 'crypto';
import { app } from 'electron';
import { Server } from 'http';

const CDN_PREFIX   = 'https://fonts.gstatic.com/';
const FONT_ROUTE   = '/font';
const FONT_CACHE_DIR = path.join(app.getPath('userData'), 'fonts');

const activeServers = new Set<Server>();

function resolveDistPath(): string {
  const packagedCandidates = [
    path.join(process.resourcesPath, 'app', 'dist'),              // linux/windows unpacked
    path.join(process.resourcesPath, 'app.asar.unpacked', 'dist'),// asar-unpacked layout
    path.join(process.resourcesPath, 'app.asar', 'dist'),         // asar packaged (mounted)
    path.join(app.getAppPath(), 'dist'),                          // asar or direct app path
    path.join(path.dirname(app.getAppPath()), 'app', 'dist'),     // AppImage squashfs mount: .../app.asar/../app/dist
  ];
  const devCandidates = [
    path.join(app.getAppPath(), 'dist'),
    path.join(process.cwd(), 'dist'),
  ];

  const candidates = app.isPackaged ? packagedCandidates : devCandidates;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // Last resort: fall back to app.getAppPath() + dist even if missing (Express will 404)
  return path.join(app.getAppPath(), 'dist');
}

function getCachedPaths(relPath: string) {
  const ext  = path.extname(relPath) || '.bin';
  const hash = crypto.createHash('sha1').update(relPath).digest('hex');
  const file = hash + ext;
  const localPath = path.join(FONT_CACHE_DIR, file);
  const tmpPath   = localPath + '.tmp';
  return { localPath, tmpPath };
}

function handleFontProxy(req: express.Request, res: express.Response) {
  const relPath   = req.path.replace(/^\/+/, '').replace(/\.\.+/g, ''); // sanitize
  const cdnUrl    = CDN_PREFIX + relPath;
  const { localPath, tmpPath } = getCachedPaths(relPath);

  console.log(`[font] request=${req.path} rel=${relPath} cache=${localPath}`);

  const streamFont = (filePath: string) => {
    // Best-effort content type based on extension
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.woff2') res.setHeader('Content-Type', 'font/woff2');
    else if (ext === '.woff') res.setHeader('Content-Type', 'font/woff');
    else if (ext === '.ttf') res.setHeader('Content-Type', 'font/ttf');

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err: NodeJS.ErrnoException) => {
      const errCode = err.code;
      if (errCode === 'ENOENT') {
        console.warn(`[font] stream ENOENT, refetching ${relPath}`);
        return fetchAndCache();
      }
      console.error('❌ Font stream error:', err, 'path=', filePath);
      res.status(500).send('Font stream error');
    });
    stream.pipe(res);
  };

  const fetchAndCache = () => {
    try {
      if (!fs.existsSync(FONT_CACHE_DIR)) {
        fs.mkdirSync(FONT_CACHE_DIR, { recursive: true });
      }

      const tmpFile = fs.createWriteStream(tmpPath);
      https
          .get(cdnUrl, (response) => {
            if (response.statusCode !== 200) {
              console.error(`❌ Failed to fetch ${cdnUrl} (${response.statusCode})`);
              tmpFile.destroy();
              if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
              return res.status(502).send('Failed to fetch font from CDN');
            }

            response.pipe(tmpFile);
            tmpFile.on('finish', () => {
              tmpFile.close(() => {
                try {
                  fs.renameSync(tmpPath, localPath); // атомарно переименовываем
                  console.log(`[font] cached -> ${localPath}`);
                  streamFont(localPath);
                } catch (err) {
                  console.error('❌ Rename error:', err, 'tmp=', tmpPath, 'local=', localPath);
                  if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
                  res.status(500).send('Font file move error');
                }
              });
            });
          })
          .on('error', (err) => {
            console.error('❌ Font proxy error:', err, 'cdn=', cdnUrl);
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
            res.status(500).send('Font proxy error');
          });
    } catch (err) {
      console.error('❌ Unexpected font proxy error:', err);
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      res.status(500).send('Unexpected font error');
    }
  };

  fs.stat(localPath, (err) => {
    if (!err) {
      // Cached file exists; serve it. If missing between stat and send, fall back to fetch.
      console.log(`[font] cache-hit ${localPath}`);
      return streamFont(localPath);
    }

    const statErr = err as NodeJS.ErrnoException | null;
    if (statErr && statErr.code !== 'ENOENT') {
      console.error('❌ Font cache stat error:', statErr, 'path=', localPath);
      return res.status(500).send('Font cache error');
    }

    console.log(`[font] cache-miss ${relPath}, fetching ${cdnUrl}`);
    fetchAndCache();
  });
}

export function startHttpServer(port: number): Server {
  const appServer   = express();
  const distPath    = resolveDistPath();
  const userDataPath = path.join(app.getPath('userData'), 'images');

  console.log(`[http] serving dist from: ${distPath} (exists=${fs.existsSync(distPath)})`);

  const indexPath = path.join(distPath, 'index.html');

  const sendIndex = (res: express.Response) => {
    fs.access(indexPath, fs.constants.R_OK, (err) => {
      if (err) {
        console.error(`[http] index.html missing/unreadable at ${indexPath}`, err);
        return res.status(500).send('index.html missing');
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      const stream = fs.createReadStream(indexPath);
      stream.on('error', (streamErr: NodeJS.ErrnoException) => {
        console.error('[http] index stream error:', streamErr, 'path=', indexPath);
        res.status(500).send('index stream error');
      });
      stream.pipe(res);
    });
  };

  appServer.use(express.static(distPath));
  appServer.use('/images', express.static(userDataPath));
  appServer.use(FONT_ROUTE, handleFontProxy);

  appServer.get('/', (_req, res) => {
    sendIndex(res);
  });
  appServer.use((_req, res) => {
    sendIndex(res);
  });

  const server = appServer.listen(port, () => {
    console.log(`🌐 HTTP server running on http://localhost:${port}`);
  });

  activeServers.add(server);

  server.on('close', () => {
    activeServers.delete(server);
    console.log(`🔴 HTTP server on port ${port} closed`);
  });

  return server;
}

export function startDevStaticServer(): Server {
  const devServer   = express();
  const distPath    = resolveDistPath();
  const userDataPath = path.join(app.getPath('userData'), 'images');

  console.log(`[http-dev] serving dist from: ${distPath} (exists=${fs.existsSync(distPath)})`);

  devServer.use(express.static(distPath));
  devServer.use('/images', express.static(userDataPath));
  devServer.use(FONT_ROUTE, handleFontProxy);

  const DEV_PORT = 5123;
  const server = devServer.listen(DEV_PORT, () => {
    console.log(`🌐 Dev HTTP server on http://localhost:${DEV_PORT}`);
  });

  activeServers.add(server);
  server.on('close', () => {
    activeServers.delete(server);
    console.log(`🔴 Dev HTTP server on port ${DEV_PORT} closed`);
  });

  return server;
}

export async function stopAllServers(): Promise<void> {
  console.log(`🛑 Stopping ${activeServers.size} active servers...`);

  const closePromises = Array.from(activeServers).map(server => {
    return new Promise<void>((resolve) => {
      server.close((err) => {
        if (err) {
          console.error('❌ Error closing server:', err);
        }
        resolve();
      });
    });
  });

  await Promise.all(closePromises);
  activeServers.clear();

  console.log('✅ All servers stopped');
}
