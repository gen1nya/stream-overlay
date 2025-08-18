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

  try {
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }

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
                res.sendFile(localPath);           // и отдаём клиенту
              } catch (err) {
                console.error('❌ Rename error:', err);
                if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
                res.status(500).send('Font file move error');
              }
            });
          });
        })
        .on('error', (err) => {
          console.error('❌ Font proxy error:', err);
          if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
          res.status(500).send('Font proxy error');
        });
  } catch (err) {
    console.error('❌ Unexpected font proxy error:', err);
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    res.status(500).send('Unexpected font error');
  }
}

export function startHttpServer(port: number): Server {
  const appServer   = express();
  const distPath    = path.join(app.getAppPath(), 'dist');
  const userDataPath = path.join(app.getPath('userData'), 'images');

  appServer.use(express.static(distPath));
  appServer.use('/images', express.static(userDataPath));
  appServer.use(FONT_ROUTE, handleFontProxy);

  appServer.get('/', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  appServer.use((_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
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
  const distPath    = path.join(__dirname, 'dist');
  const userDataPath = path.join(app.getPath('userData'), 'images');

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