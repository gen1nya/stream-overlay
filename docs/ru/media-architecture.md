# Media System Architecture

## Текущая архитектура

### Хранение данных

```
StoreSchema
├── mediaEvents: MediaEventConfig[]      # Все медиа-ивенты (глобальное хранилище)
├── mediaDisplayGroups: MediaDisplayGroup[]  # Группы отображения
├── mediaLibrary: MediaFile[]            # Загруженные файлы (images/videos/audio)
└── bots: { [name]: BotConfig }          # Конфиги ботов (ссылки на медиа по ID)
    └── gacha.items[].mediaEventIds      # Пример: ссылки на медиа в гаче
```

### Ключевые типы

```typescript
// Медиа-ивент - основная сущность
interface MediaEventConfig {
    id: string;                      // UUID
    name: string;                    // Название для UI
    groupId?: string;                // Ссылка на группу отображения
    mediaType: 'image' | 'video' | 'audio';
    mediaUrl: string;                // URL файла
    caption: string;                 // Шаблон подписи с переменными
    displayDuration: number;         // Секунды (0 = default группы)
    style: MediaEventStyle;          // Стили текста
}

// Группа отображения - где и как показывать медиа
interface MediaDisplayGroup {
    id: string;
    name: string;
    enabled: boolean;
    position: { x, y };
    size: { width, height, mediaWidth, mediaHeight, ... };
    placement: 'fixed' | 'random' | 'stack';
    animation: { in, out, inDuration, outDuration, ... };
    queue: { mode: 'sequential' | 'replace' | 'stack', maxItems };
    // ...
}

// Контекст для интерполяции переменных
interface MediaEventContext {
    // Общие
    user: string;
    userId: string;

    // Триггеры
    target?: string;
    reward?: string;
    rewardCost?: number;
    raider?: string;
    viewers?: number;
    args?: string[];

    // Гача
    item?: string;
    rarity?: number;
    stars?: string;
    pullNumber?: number;
}
```

### Компоненты

| Компонент | Расположение | Назначение |
|-----------|--------------|------------|
| `MediaEventEditorPopup` | `src/.../triggers/MediaEventEditorPopup.jsx` | Создание/редактирование MediaEventConfig |
| `MediaEventPicker` | `src/components/utils/MediaEventPicker.jsx` | Выбор/привязка медиа к элементам |
| `MediaLibraryPopup` | `src/components/utils/MediaLibraryPopup.jsx` | Выбор файла из библиотеки |
| `MediaOverlay` | `src/components/media/MediaOverlay.jsx` | Рендеринг медиа в оверлее |
| `MediaOverlayEditor` | `src/components/media/MediaOverlayEditor.jsx` | Редактор групп отображения |

### Поток данных

```
1. Создание медиа:
   MediaEventEditorPopup → saveMediaEvent() → store.mediaEvents[]

2. Привязка к элементу (гача):
   ItemFormPopup → MediaEventPicker → item.mediaEventIds[]

3. Триггер показа:
   Bot Event → GachaMiddleware → Action { type: SHOW_MEDIA, payload: { mediaEventId, context } }

4. Обработка:
   main.ts → mediaEventsController.showMedia() → interpolateCaption() → WebSocket broadcast

5. Отображение:
   MediaOverlay ← WebSocket 'media:show' → рендер в группе
```

---

## Интеграции

### Триггеры (TriggerMiddleware)

```typescript
// В TriggerAction
interface TriggerActionParams {
    mediaEventId?: string;  // Ссылка на MediaEventConfig.id
}

// Доступные переменные для caption:
// ${user}, ${target}, ${reward}, ${reward_cost}, ${raider}, ${viewers}, ${args[N]}
```

### Гача (GachaMiddleware)

```typescript
// В Item
interface Item {
    id: string;
    name: string;
    rarity: Rarity;
    isLimited: boolean;
    bannerId: number;
    mediaEventIds?: string[];  // До 2 медиа-ивентов на предмет
}

// Доступные переменные для caption:
// ${user}, ${item}, ${rarity}, ${stars}, ${pullNumber}

// При выпадении предмета генерируются SHOW_MEDIA actions:
function generateMediaActions(result: PullResult, userName: string, userId: string) {
    // Для каждого mediaEventId создаётся action с контекстом
}
```

---

## Переменные по контекстам

```typescript
// Триггеры
const TRIGGER_VARIABLES = [
    { name: 'user', description: 'Username who triggered' },
    { name: 'target', description: 'Target user' },
    { name: 'reward', description: 'Reward name' },
    { name: 'reward_cost', description: 'Reward cost' },
    { name: 'raider', description: 'Raider channel' },
    { name: 'viewers', description: 'Viewer count' },
];

// Гача
const GACHA_VARIABLES = [
    { name: 'user', description: 'Username who rolled' },
    { name: 'item', description: 'Item name' },
    { name: 'rarity', description: 'Star rarity (3/4/5)' },
    { name: 'stars', description: 'Star representation (⭐⭐⭐)' },
    { name: 'pullNumber', description: 'Pulls since last 5-star' },
];

// Лотерея (планируется)
const LOTTERY_VARIABLES = [
    { name: 'user', description: 'Winner username' },
    { name: 'prize', description: 'Prize name' },
    { name: 'participants', description: 'Total participants' },
];
```

---

## UI: Система порталов (PortalManager)

### Проблема

При вложенных попапах (ItemFormPopup → MediaEventPicker → MediaEventEditorPopup)
ручное управление z-index приводило к багам - попапы отображались в неправильном порядке.

### Решение: PortalContext

```typescript
// src/context/PortalContext.jsx

// Провайдер оборачивает приложение
<PortalProvider>
    <App />
</PortalProvider>

// Порталы автоматически стекаются
// z-index = 10000 + позиция в стеке
// Последний открытый = всегда сверху
```

### API

```jsx
// Декларативный подход (рекомендуется)
import { Portal } from '../context/PortalContext';

{showModal && (
    <Portal
        id="unique-id"
        onClose={() => setShowModal(false)}
        overlayBackground="rgba(0, 0, 0, 0.8)"  // опционально
        padding="20px"                           // опционально
    >
        <ModalContent />
    </Portal>
)}

// Императивный подход
const { openModal, closeModal } = usePortal();
openModal('my-modal', <Content />, { overlayBackground: '...' });
closeModal('my-modal');
```

### Опции Portal

| Опция | Тип | Default | Описание |
|-------|-----|---------|----------|
| `id` | string | required | Уникальный ID модалки |
| `onClose` | function | - | Callback при закрытии |
| `overlayBackground` | string | `rgba(0,0,0,0.5)` | Цвет оверлея |
| `padding` | string | `0` | Padding контейнера |
| `transparentOverlay` | boolean | false | Прозрачный оверлей |
| `preventOverlayClose` | boolean | false | Не закрывать по клику на оверлей |
| `preventEscapeClose` | boolean | false | Не закрывать по Escape |

### Компоненты использующие Portal

- `PopupComponent` - базовый попап
- `MediaEventEditorPopup` - редактор медиа
- `MediaLibraryPopup` - библиотека медиа
- `InlineColorPicker` - выбор цвета

---

## Статус реализации

### Выполнено

- [x] Рефакторинг MediaEventEditorPopup - проп `availableVariables`
- [x] MediaEventPicker компонент для выбора/создания медиа
- [x] Интеграция с гачей - `mediaEventIds` в Item
- [x] GachaMiddleware - генерация SHOW_MEDIA actions
- [x] Расширение MediaEventContext гача-переменными
- [x] PortalManager для корректного стекирования попапов

### Планируется

- [ ] Интеграция с лотереей
- [ ] Интеграция с таймерами
- [ ] Интеграция с приветствиями
