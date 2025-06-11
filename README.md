# Stream Overlay

This project is an Electron application that displays a Twitch overlay built with React. The UI is served through Vite and communicates with the Electron main process to show chat messages, follows and other events during a stream.

## Commands

- `npm run dev` – start the Vite development server and automatically launch Electron.
- `npm run build` – build the React frontend for production. The output is placed in `dist/`.
- `npm run start-electron` – run the Electron process if the development server is already running.
- `npm run build-electron` – package the application with `electron-builder`.

Running `npm run dev` spins up the dev server on port 5173 and opens the Electron windows pointed at that server. Use `npm run build` followed by `npm run build-electron` to create distributable builds.
