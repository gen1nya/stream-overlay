# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React overlay (components, contexts, hooks, theming, locales) bootstrapped by `src/main.jsx`.
- `main.ts`, `webServer.ts`, `windowsManager.ts`, and `ipcHandlers.ts` run the Electron main process, HTTP server, and IPC wiring; backend logic sits in `services/`.
- Build artifacts land in `dist/` (frontend) and `dist-backend/` (compiled TypeScript). Packaged installers go to `release/`.
- Static assets live in `public/` and `assets/`; native audio/FFT code is under `native/`. `scripts/copy-native.js` moves required native binaries after builds.

## Build, Test, and Development Commands
- `npm run dev` — start Vite and launch Electron with live reload.
- `npm run start-electron` — run only Electron (assumes dev server on `http://localhost:5173`).
- `npm run build` — production build for the React UI into `dist/`.
- `npm run build:ts` — compile Electron/Node TypeScript to `dist-backend/`.
- `npm run build-electron` — end-to-end package: builds UI, compiles backend, copies native bits, then runs `electron-builder`.
- `npm run lint` — ESLint checks (JS/JSX with React Hooks/Refresh rules). `npm run preview` serves the built UI for smoke tests.

## Coding Style & Naming Conventions
- Use 4-space indentation and semicolons; follow the file’s quote style. ESLint enforces recommended rules and React hooks invariants (`no-unused-vars` ignores ALL_CAPS constants).
- Components/files in PascalCase (`ChatOverlay.jsx`, `Dashboard`); helpers/utilities in camelCase; classes in PascalCase; shared constants in `ALL_CAPS`.
- Keep UI logic in `src/components` with supporting hooks/services nearby; reserve side effects (process control, IPC, networking) for the Electron main layer.

## Testing Guidelines
- No automated test suite yet; validate changes manually via `npm run dev` in the Electron app.
- For UI changes, exercise key routes (`/chat-overlay`, `/audio`, `/settings`) and confirm websocket data still renders.
- When touching build scripts or native modules, run `npm run build-electron` to ensure packaging completes cleanly.

## Commit & Pull Request Guidelines
- Use the conventional prefix style (`fix: …`, `feat: …`, `chore: …`); keep messages imperative and scoped.
- PRs should summarize scope, risks, and test steps; attach screenshots or short recordings for visual updates.
- Link issues or backlog items where applicable, and call out migrations (store defaults, assets, native binaries) plus any manual steps (rebuilds, config changes).

## Security & Configuration Tips
- Do not commit tokens or user data; Twitch/YouTube credentials remain in the local Electron store.
- When adding native dependencies, update `scripts/copy-native.js` and verify `electron-rebuild` still succeeds postinstall.
