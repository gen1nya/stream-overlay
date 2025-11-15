# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Twitch Watcher is an Electron + React application that provides a sophisticated Twitch streaming overlay system with chat visualization, event notifications (follows, channel point redemptions), audio visualizers, and bot functionality. The application uses a dual-process architecture with native C++ modules for audio analysis.

## Development Commands

### Running the Application
- `npm run dev` - Start development mode (runs Vite dev server on port 5173 + Electron)
- `npm run start-react` - Start only the Vite dev server
- `npm run start-electron` - Start only Electron (requires dev server already running)

### Building
- `npm run build` - Build React frontend for production (output: `dist/`)
- `npm run build:ts` - Compile TypeScript backend files (output: `dist-backend/`)
- `npm run postbuild` - Copy native module prebuilds to dist-backend
- `npm run build-electron` - Full production build with electron-builder

### Code Quality
- `npm run lint` - Run ESLint on the codebase

### Testing Native Modules
After making changes to native C++ modules (`native/fft/` or `native/media/`):
1. Rebuild the native module: `npm run rebuild` (if configured) or manually with `node-gyp rebuild`
2. Run `npm run postbuild` to copy prebuilds
3. Restart Electron

## High-Level Architecture

### Dual-Process Structure

**Electron Main Process (Backend)**
- Entry point: `main.ts`
- Compiled TypeScript output: `dist-backend/`
- Manages services, IPC handlers, WebSocket server, windows, and Twitch connections
- Services directory (`services/`) contains all backend logic

**React Renderer Process (Frontend)**
- Entry point: `src/main.jsx` → `src/App.jsx`
- Built with Vite, output to `dist/`
- Uses React Router for multi-page navigation (dashboard, settings, overlays, auth)

### Communication Layer (Triple-Channel Architecture)

The application uses **three independent communication mechanisms**:

1. **Electron IPC (Request/Response)**
   - Handlers defined in: `ipcHandlers.ts`
   - Frontend API wrapper: `src/services/api.js`
   - Used for: Auth, theme management, user queries, settings, window creation
   - Pattern: `await window.electron.ipcRenderer.invoke('handler:name', args)`

2. **WebSocket Server (Real-time Push)**
   - Port: `42001`
   - Started in: `main.ts`
   - Frontend context: `src/context/WebSocketContext.jsx`
   - Broadcasts: Chat messages, events (follows, redemptions), theme updates, logs, locale changes
   - Pattern: Subscribe to channels, receive broadcasts from backend

3. **HTTP Server (Static Assets + Font Proxy)**
   - Defined in: `webServer.ts`
   - Port: `5173` (production) or `5123` (dev static assets)
   - Serves: Built React app, user images (`/images/*`), Google Fonts proxy (`/font/*`)
   - **Font proxy avoids CORS issues** in overlay windows

### Twitch Integration Architecture

**Dual Connection Model**: The application maintains two parallel connections to Twitch:

1. **IRC Chat (`services/twitch/chatService.ts`)**
   - Raw TCP socket to `irc.chat.twitch.tv:6667`
   - Handles: Chat messages, whispers, user state, CLEARCHAT, CLEARMSG
   - Features: Auto-reconnect, token refresh, health checks (5-min inactivity threshold)
   - Connection epoch tracking prevents race conditions

2. **EventSub WebSocket (`services/twitch/esService.ts`)**
   - WebSocket to `wss://eventsub.wss.twitch.tv/ws`
   - Subscriptions: Follows, channel point redemptions, stream online/offline
   - Features: Auto-subscription via Helix API, deduplication (300s TTL), session reconnection

**Orchestration**: `services/twitch/TwitchClient.ts`
- EventEmitter that coordinates IRC + EventSub
- Manages user database (per-user SQLite), caches followers/VIPs/mods
- Broadcasts Twitch events to renderer via WebSocket

**Message Parsing**: `services/twitch/messageParser.ts`
- Converts IRC to structured events
- Loads badges (global + channel), 7TV emotes, BTTV emotes, cheer emotes
- Renders messages to HTML with emotes and badges

### Overlay System

**ChatOverlay Component** (`src/components/chat/ChatOverlay.jsx`)
- Transparent, frameless, always-on-top window
- Displays cached messages with slide-in animations (TransitionGroup + translateY)
- Supports: Chat messages, follows, channel point redemptions
- Query params: `?mode=window&theme=themeName`

**Message Cache** (`services/MessageCacheManager.ts`)
- In-memory cache with TTL and max count limits
- Handles message deletion (IRC `delete_msg` tags)
- Broadcasts updates to all overlay windows via WebSocket

**Theming** (styled-components + electron-store)
- Themes stored in electron-store, loaded dynamically
- Each theme defines: Chat styling, follow/redemption templates, audio player styles
- Theme updates broadcast via WebSocket (`theme:update`)
- Migration system in `main.ts` handles schema upgrades

### Service Layer Patterns

**Middleware System** (`services/middleware/MiddlewareProcessor.ts`)
- Chain of responsibility for chat message processing
- Middleware: RouletteService (Russian roulette), GreetingMiddleware (auto-greet), GachaMiddleware (lottery)
- Middleware can: Transform messages, generate actions (SEND_MESSAGE, MUTE_USER), stop propagation

**Bot Configuration** (`services/BotConfigService.ts`)
- Manages multiple bot profiles via electron-store
- Configurations: Roulette (chance, cooldown, protected users), ping-pong commands, gacha banners
- IPC handlers for CRUD operations on bot configs

**Database Layer** (`services/db/DbRepository.ts`)
- Singleton pattern with per-user SQLite databases
- Repositories: UserRepository (followers, VIPs, mods), ActionRepository (scheduled actions), PityRepository (gacha pity)
- Database files: `./data/{userId}_twitch.db`
- Uses `better-sqlite3` (synchronous API)

**Locale/i18n**
- Backend: `services/locale/AppLocaleRepository.ts` (stores in electron-store, broadcasts changes)
- Frontend: `src/i18n.js` (i18next + react-i18next, loads from `src/locales/`)
- Initialization: Frontend waits for backend locale before rendering

### Native Modules (C++ with node-gyp)

**FFT Audio Analysis** (`native/fft/`)
- Binding: `fft_bridge`
- Purpose: Real-time audio spectrum analysis via WASAPI (Windows Audio Session API)
- Features: Device enumeration, loopback capture, FFT calculation (configurable bands), gain/tilt adjustments
- Used by: Audio visualizer overlays (`src/components/player/FFTBars.jsx`, etc.)

**Media Control** (`native/media/`)
- Binding: `gsmtc` (Global System Media Transport Controls)
- Purpose: Read currently playing media metadata (title, artist, album art)
- WebSocket server on port 5001 broadcasts media state to overlays

**Bridge**: `audiosessionManager.ts`
- Manages WebSocket server for media/FFT data streaming
- Persists audio device selection

**Rebuild Process**: Native modules are prebuilt and copied via `scripts/copy-native.js` during `postbuild`

### Frontend Component Structure

Key component categories in `src/components/`:

- **app/** - Main windows (AuthScreen, Dashboard, SettingsComponent, LoadingComponent)
- **app/settings/** - Settings panels (bot config, appearance, proxy, YouTube)
  - **bot/gacha/** - Gacha system settings (banners, items, pity)
  - **bot/pingpong/** - Command response editor
  - **bot/roulette/** - Roulette settings
- **chat/** - Overlay components (ChatOverlay, ChatMessage, ChatFollow, ChatRedemption, PreviewComponent)
- **followers/** - Follower goal widgets
- **player/** - Audio player visualizers (FFTBars, ModernAudioPlayer, WaveformDemo, RoundFFTDemo, LinearFFTDemo)
- **utils/** - Shared utilities (fontsCache.js, HorizontalSlider)

### Data Flow Examples

**Chat Message Flow**:
```
Twitch IRC → messageParser (parse + enrich) → MiddlewareProcessor (bot logic)
→ MessageCacheManager (TTL cache) → WebSocket broadcast (chat:messages)
→ ChatOverlay (render with animations)
```

**Authentication Flow**:
```
AuthScreen → IPC: auth:start → authService (OAuth device flow)
→ keytar (secure token storage) → IPC: auth:success → auth:onAccountReady
→ TwitchClient.start() (connect IRC + EventSub) → Load badges/emotes/followers
```

**Theme Update Flow**:
```
Settings UI → IPC: theme:update → main.ts (save to store)
→ WebSocket broadcast (theme:update) → All overlay windows re-theme
```

## Important Development Notes

### When Working with Twitch Integration
- **Never hardcode tokens**: Use `authService.ts` and `keytar` for secure storage
- **Health checks are critical**: Both IRC and EventSub have inactivity detection; preserve this logic
- **Connection epochs prevent race conditions**: When modifying `chatService.ts` or `esService.ts`, maintain epoch tracking
- **Message deduplication**: EventSub uses a 5-minute rolling window; preserve `seen` Map in `esService.ts`

### When Working with Overlays
- **Window lifecycle**: Overlays are managed by `windowsManager.ts`; use `chat:open-overlay` IPC to create
- **Theme context**: All overlay components expect a theme object from styled-components ThemeProvider
- **Animation performance**: Use CSS transforms (translateY) over position changes
- **Font loading**: Use the font proxy (`/font/*`) to avoid CORS; fonts are cached in userData

### When Working with Native Modules
- Changes require full rebuild: `node-gyp rebuild` → `npm run postbuild` → restart Electron
- WASAPI code is Windows-only; ensure platform checks if adding cross-platform audio
- FFT module expects specific format: Sample rate, channels, buffer size must match WASAPI config

### When Working with Services
- Services are singletons initialized in `main.ts`
- Services communicate via callbacks/events, not direct coupling
- Database operations are synchronous (better-sqlite3); avoid async/await in repository methods
- Middleware actions are queued and executed; do not execute directly in middleware

### When Working with IPC Handlers
- Register all handlers in `ipcHandlers.ts`
- Always handle errors gracefully and return structured responses
- Frontend API wrapper (`src/services/api.js`) expects specific response format
- WebSocket broadcasts are one-way (backend → frontend); use IPC for frontend → backend

### Build Configuration
- **TypeScript**: Compiles to `dist-backend/` (see `tsconfig.json`)
- **React/Vite**: Compiles to `dist/` (see `vite.config.js`)
- **Electron Builder**: Includes both `dist/` and `dist-backend/` in ASAR (see `package.json` build config)
- **Native modules**: Prebuilds copied via `postbuild` script, included in ASAR

### Database Schema
- User database schema: Users, Actions, Pity tables (see `services/db/schema.ts` if exists or repository methods)
- Migrations: No formal migration system; schema changes require manual updates
- Per-user isolation: Each Twitch user ID gets separate database file

### Internationalization (i18n)
- Locale files: `src/locales/en.js`, `src/locales/ru.js`
- Add new translations in both files
- Backend locale persisted in electron-store (`locale` key)
- Use `useTranslation()` hook in React components
- Backend: `AppLocaleRepository.get()` returns current locale
