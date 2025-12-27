# Media Events System - Technical Documentation

## Overview

Media Events System - это универсальная система для отображения медиа-контента (изображения, видео, аудио) в стриминговых оверлеях. Система позволяет привязывать медиа-события к различным триггерам: гача-системе, командам, наградам channel points и другим событиям Twitch.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Backend (Electron Main)                    │
├─────────────────────────────────────────────────────────────────────────┤
│  MediaEventsService        │ CRUD операции с MediaEventConfig           │
│  MediaDisplayGroupService  │ CRUD операции с группами отображения       │
│  MediaLibraryService       │ Управление файлами (upload, delete, serve) │
│  MediaEventsController     │ Обработка SHOW_MEDIA, интерполяция caption │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ WebSocket
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             Frontend (React)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  MediaOverlay              │ Рендеринг медиа в оверлее (OBS browser src)│
│  MediaOverlayEditor        │ Визуальный редактор групп отображения      │
│  MediaEventEditorPopup     │ Создание/редактирование MediaEventConfig   │
│  MediaEventPicker          │ Выбор медиа для привязки к элементам       │
│  MediaLibraryPopup         │ UI для загрузки/выбора файлов              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Models

#### MediaEventConfig

Основная сущность - описывает что показывать и как:

```typescript
interface MediaEventConfig {
    id: string;                      // UUID
    name: string;                    // Название для UI
    groupId?: string;                // Ссылка на MediaDisplayGroup
    mediaType: 'image' | 'video' | 'audio';
    mediaUrl: string;                // URL файла (из MediaLibrary или внешний)
    caption: string;                 // Шаблон подписи с переменными ${user}, ${item}, etc.
    displayDuration: number;         // Секунды (0 = использовать default группы)
    style: {
        fontSize: number;
        fontFamily: string;
        color: string;
        textShadow: string;
        textAlign: 'left' | 'center' | 'right';
        position: 'top' | 'bottom' | 'overlay';
        backgroundColor: string;
        padding: number;
    };
}
```

#### MediaDisplayGroup

Группа отображения - определяет где и как показывать медиа:

```typescript
interface MediaDisplayGroup {
    id: string;
    name: string;
    enabled: boolean;

    position: { x: number; y: number };

    size: {
        width: number;        // 0 = auto
        height: number;       // 0 = auto
        maxWidth: number;
        maxHeight: number;
        contentScale: number; // 1 = 100%
        mediaWidth: number;   // 0 = use group size
        mediaHeight: number;
    };

    placement: 'fixed' | 'random' | 'stack';

    randomSettings: {
        rotationEnabled: boolean;
        maxRotation: number;  // degrees
    };

    stackSettings: {
        direction: 'horizontal' | 'vertical';
        gap: number;
        wrap: boolean;
    };

    anchor: 'top-left' | 'top' | 'top-right' | 'left' | 'center' |
            'right' | 'bottom-left' | 'bottom' | 'bottom-right';

    animation: {
        in: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' |
            'slide-right' | 'scale' | 'bounce';
        out: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' |
             'slide-right' | 'scale' | 'bounce';
        inDuration: number;   // ms
        outDuration: number;  // ms
        easing: string;
    };

    queue: {
        mode: 'sequential' | 'replace' | 'stack';
        maxItems: number;
        gapBetween: number;   // ms between items
    };

    defaultDuration: number;  // seconds
    zIndex: number;
}
```

#### MediaFile

Файл в медиа-библиотеке:

```typescript
type MediaFileType = 'image' | 'video' | 'audio';

interface MediaFile {
    id: string;
    filename: string;      // UUID-prefixed filename on disk
    originalName: string;  // Original upload name
    type: MediaFileType;
    mimeType: string;
    size: number;          // bytes
    dateAdded: number;     // timestamp
    width?: number;        // for images/video
    height?: number;
    duration?: number;     // for video/audio
}
```

### Storage

Все данные хранятся в `electron-store`:

```typescript
interface StoreSchema {
    mediaEvents: MediaEventConfig[];      // Глобальный список медиа-событий
    mediaDisplayGroups: MediaDisplayGroup[]; // Группы отображения
    mediaLibrary: MediaFile[];            // Метаданные файлов
    mediaOverlaySettings: {               // Настройки оверлея
        customResolution: {
            enabled: boolean;
            width: number;
            height: number;
            color: string;
            label: string;
        };
    };
}
```

Файлы хранятся в:
- `{userData}/media/images/` - изображения
- `{userData}/media/videos/` - видео
- `{userData}/media/audio/` - аудио
- `{userData}/images/` - legacy изображения (для обратной совместимости)

### Services

#### MediaEventsService (`services/MediaEventsService.ts`)

CRUD операции для MediaEventConfig:

```typescript
class MediaEventsService {
    getAll(): MediaEventConfig[];
    get(id: string): MediaEventConfig | undefined;
    save(mediaEvent: MediaEventConfig): boolean;
    delete(id: string): boolean;
}
```

IPC handlers:
- `media:get-all`
- `media:get`
- `media:save`
- `media:delete`

#### MediaDisplayGroupService (`services/MediaDisplayGroupService.ts`)

CRUD операции для групп:

```typescript
class MediaDisplayGroupService {
    getAll(): MediaDisplayGroup[];
    get(id: string): MediaDisplayGroup | undefined;
    save(group: MediaDisplayGroup): boolean;
    delete(id: string): boolean;  // Не удаляет последнюю группу
    reorder(orderedIds: string[]): boolean;
    getOverlaySettings(): MediaOverlaySettings;
    saveOverlaySettings(settings: MediaOverlaySettings): boolean;
}
```

IPC handlers:
- `media-groups:get-all`
- `media-groups:get`
- `media-groups:save`
- `media-groups:delete`
- `media-groups:reorder`
- `media-overlay:get-settings`
- `media-overlay:save-settings`

#### MediaLibraryService (`services/MediaLibraryService.ts`)

Управление файлами:

```typescript
class MediaLibraryService {
    getAll(): MediaFile[];
    getByType(type: MediaFileType): MediaFile[];
    get(id: string): MediaFile | undefined;
    save(originalName: string, buffer: Buffer, mimeType: string,
         dimensions?: { width?: number; height?: number; duration?: number }): Promise<MediaFile | null>;
    delete(id: string): Promise<boolean>;
    getFilePath(file: MediaFile): string;
    getHttpUrl(file: MediaFile): string;
}
```

IPC handlers:
- `media-library:get-all`
- `media-library:get-by-type`
- `media-library:get`
- `media-library:save`
- `media-library:delete`
- `media-library:get-url`
- `media-library:get-file-path`

#### MediaEventsController (`services/MediaEventsController.ts`)

Обработка показа медиа:

```typescript
interface MediaEventContext {
    // Common
    user: string;
    userId: string;

    // Triggers
    reward?: string;
    rewardCost?: number;
    target?: string;
    args?: string[];
    raider?: string;
    viewers?: number;

    // Gacha
    item?: string;
    rarity?: number;
    stars?: string;
    pullNumber?: number;
}

class MediaEventsController {
    async showMedia(payload: { mediaEventId: string; context: MediaEventContext }): Promise<void>;
}
```

Метод `showMedia`:
1. Получает MediaEventConfig по ID
2. Интерполирует переменные в caption
3. Логирует событие
4. Отправляет WebSocket broadcast `media:show`

### Data Flow

#### Создание медиа-события

```
MediaEventEditorPopup
    │
    ├─► Upload file → media-library:save → MediaLibraryService
    │                                           │
    │                                           ▼
    │                              File saved to disk + metadata to store
    │
    ▼
Save MediaEventConfig → media:save → MediaEventsService
                                          │
                                          ▼
                           Saved to store, WebSocket broadcast 'media:updated'
```

#### Привязка к гаче

```
ItemFormPopup
    │
    ▼
MediaEventPicker (max 2 events per item)
    │
    ▼
item.mediaEventIds = ['event-uuid-1', 'event-uuid-2']
```

#### Показ медиа при выпадении предмета

```
Chat command "!wish"
    │
    ▼
GachaMiddleware.processMessage()
    │
    ▼
GachaEngine.pull() → PullResult { item, pullNumber, ... }
    │
    ▼
Generate actions:
    - SEND_MESSAGE (результат)
    - SHOW_MEDIA (для каждого mediaEventId в item)
    │
    ▼
ActionExecutor
    │
    ├─► SEND_MESSAGE → IRC
    │
    └─► SHOW_MEDIA → MediaEventsController.showMedia()
                          │
                          ▼
                     Interpolate caption with context:
                     ${user}, ${item}, ${rarity}, ${stars}, ${pullNumber}
                          │
                          ▼
                     WebSocket broadcast 'media:show'
                          │
                          ▼
                     MediaOverlay receives event
                          │
                          ▼
                     Render media with animation
```

### WebSocket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `media:show` | Backend → Frontend | `{ mediaEvent, context }` | Показать медиа в оверлее |
| `media:updated` | Backend → Frontend | `MediaEventConfig[]` | Список медиа обновлён |
| `media-groups:updated` | Backend → Frontend | `MediaDisplayGroup[]` | Список групп обновлён |
| `media-library:updated` | Backend → Frontend | `MediaFile[]` | Библиотека обновлена |
| `media-overlay:settings-updated` | Backend → Frontend | `MediaOverlaySettings` | Настройки оверлея обновлены |
| `media:test` | Backend → Frontend | `{ groupId, mediaEvent }` | Тестовое событие |

### HTTP Endpoints

Добавлены в `webServer.ts`:

```
GET /media/images/:filename  → Serve image file
GET /media/videos/:filename  → Serve video file
GET /media/audio/:filename   → Serve audio file
GET /images/:filename        → Legacy images (backwards compatibility)
```

### Frontend API (`src/services/api.js`)

```javascript
// Media Events
export const getAllMediaEvents = () => invoke('media:get-all');
export const getMediaEvent = (id) => invoke('media:get', id);
export const saveMediaEvent = (event) => invoke('media:save', event);
export const deleteMediaEvent = (id) => invoke('media:delete', id);

// Media Display Groups
export const getAllMediaDisplayGroups = () => invoke('media-groups:get-all');
export const getMediaDisplayGroup = (id) => invoke('media-groups:get', id);
export const saveMediaDisplayGroup = (group) => invoke('media-groups:save', group);
export const deleteMediaDisplayGroup = (id) => invoke('media-groups:delete', id);
export const reorderMediaDisplayGroups = (ids) => invoke('media-groups:reorder', ids);

// Media Library
export const getMediaLibrary = () => invoke('media-library:get-all');
export const getMediaLibraryByType = (type) => invoke('media-library:get-by-type', type);
export const uploadMediaFile = (name, data, mimeType, dims) => invoke('media-library:save', ...);
export const deleteMediaFile = (id) => invoke('media-library:delete', id);
export const getMediaFileUrl = (id) => invoke('media-library:get-url', id);

// Overlay Settings
export const getMediaOverlaySettings = () => invoke('media-overlay:get-settings');
export const saveMediaOverlaySettings = (settings) => invoke('media-overlay:save-settings', settings);

// Testing
export const testMediaGroup = (groupId, mediaEventId) => invoke('media:test-group', ...);
```

### Integration Points

#### Gacha System

В `services/middleware/gacha/GachaMiddleware.ts`:

```typescript
// Item теперь имеет поле mediaEventIds
interface Item {
    id: string;
    name: string;
    rarity: Rarity;
    isLimited: boolean;
    bannerId: number;
    mediaEventIds?: string[];  // До 2 медиа-событий
}

// При выпадении генерируются SHOW_MEDIA actions
private generateMediaActions(result: PullResult, userName: string, userId: string): Action[] {
    const actions: Action[] = [];

    for (const mediaEventId of result.item.mediaEventIds || []) {
        actions.push({
            type: ActionTypes.SHOW_MEDIA,
            payload: {
                mediaEventId,
                context: {
                    user: userName,
                    userId,
                    item: result.item.name,
                    rarity: result.item.rarity,
                    stars: '⭐'.repeat(result.item.rarity),
                    pullNumber: result.pullNumber
                }
            }
        });
    }

    return actions;
}
```

#### Trigger System

В `services/middleware/TriggerMiddleware.ts`:

```typescript
interface TriggerActionParams {
    response?: string;
    mediaEventId?: string;  // Ссылка на MediaEventConfig
}

// При срабатывании триггера с mediaEventId
if (action.params.mediaEventId) {
    actions.push({
        type: ActionTypes.SHOW_MEDIA,
        payload: {
            mediaEventId: action.params.mediaEventId,
            context: {
                user: message.userName,
                userId: message.userId,
                target: target,
                reward: rewardName,
                rewardCost: rewardCost,
                args: args
            }
        }
    });
}
```

### UI Components

#### MediaOverlay (`src/components/media/MediaOverlay.jsx`)

Компонент для OBS browser source:
- Подключается к WebSocket
- Слушает `media:show` события
- Рендерит медиа с анимациями
- Поддерживает несколько групп одновременно
- Queue management (sequential/replace/stack)
- Debug mode с визуализацией групп

URL: `http://localhost:5173/media-overlay`

Query params:
- `?debug=true` - показать границы групп
- `?customResolution=true` - показать custom frame

#### MediaOverlayEditor (`src/components/media/MediaOverlayEditor.jsx`)

Визуальный редактор групп:
- Drag & drop позиционирование
- Настройка размеров, анимаций, очередей
- Live preview с тестовыми событиями
- Экспорт OBS URL

#### MediaEventEditorPopup (`src/components/app/settings/bot/triggers/MediaEventEditorPopup.jsx`)

Редактор медиа-события:
- Выбор файла из библиотеки или URL
- Настройка caption с переменными
- Стилизация текста
- Preview

Props:
```typescript
interface MediaEventEditorPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: MediaEventConfig) => void;
    initialEvent?: MediaEventConfig;
    availableVariables?: Array<{ name: string; description: string }>;
}
```

#### MediaEventPicker (`src/components/utils/MediaEventPicker.jsx`)

Выбор медиа для привязки:
- Показывает выбранные медиа
- Popup для выбора/создания
- Ограничение количества (maxItems)

Props:
```typescript
interface MediaEventPickerProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    maxItems?: number;
    availableVariables?: Array<{ name: string; description: string }>;
}
```

### PortalManager

Для корректного стекирования вложенных попапов добавлен `PortalContext`:

```jsx
// src/context/PortalContext.jsx

// Оборачивает приложение
<PortalProvider>
    <App />
</PortalProvider>

// Использование
import { Portal } from '../context/PortalContext';

{showModal && (
    <Portal id="my-modal" onClose={() => setShowModal(false)}>
        <ModalContent />
    </Portal>
)}
```

z-index автоматически вычисляется: `10000 + позиция в стеке`.

### Migration

#### From bot config to global storage

При первом запуске `MediaEventsService` мигрирует медиа-события из `bots.*.mediaEvents` в глобальный `mediaEvents`.

#### Legacy images

`MediaLibraryService` автоматически добавляет существующие изображения из `{userData}/images/` в библиотеку без копирования файлов.

### Testing

```typescript
// Тестовое событие для группы
ipcMain.handle('media:test-group', async (_e, groupId: string, mediaEventId?: string) => {
    const group = mediaDisplayGroupService.get(groupId);
    if (!group) return false;

    // Если mediaEventId не указан, создаём тестовое событие
    const testEvent = mediaEventId
        ? mediaEventsController.getMediaEventById(mediaEventId)
        : createTestEvent(group);

    broadcast('media:test', { groupId, mediaEvent: testEvent });
    return true;
});
```

### Performance Considerations

1. **Queue management**: Используйте `replace` mode для частых событий
2. **File sizes**: Оптимизируйте изображения перед загрузкой
3. **Animation duration**: Короткие анимации (200-300ms) работают лучше
4. **Audio fade-out**: Реализован для плавного прерывания аудио

### Security

1. Файлы сохраняются с UUID-именами, предотвращая path traversal
2. MIME-типы валидируются при загрузке
3. HTTP endpoints используют `encodeURIComponent` для filename
