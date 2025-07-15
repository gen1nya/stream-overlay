import express from 'express';
import path from 'path';
import { app } from 'electron';

export function startHttpServer(port: number): void {
  const appServer = express();
  const distPath = path.join(app.getAppPath(), 'dist');
  //const distPath = path.join(__dirname, 'dist');
  const userDataPath = path.join(app.getPath('userData'), 'images');
  appServer.use(express.static(distPath));
  appServer.use('/images', express.static(userDataPath));
  appServer.get('/', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  appServer.use((_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  appServer.listen(port, () => {
    console.log(`\uD83C\uDF10 HTTP server running on http://localhost:${port}`);
  });
}

export function startDevStaticServer(): void {
  const devServer = express();
  const distPath = path.join(__dirname, 'dist');
  const userDataPath = path.join(app.getPath('userData'), 'images');
  devServer.use(express.static(distPath));
  devServer.use('/images', express.static(userDataPath));
  const DEV_PORT = 5123;
  devServer.listen(DEV_PORT, () => {
    console.log(`\uD83C\uDF10 Dev HTTP server on http://localhost:${DEV_PORT}`);
  });
}
