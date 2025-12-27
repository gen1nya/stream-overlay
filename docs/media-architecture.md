# Media System Architecture

## Текущая архитектура

### Хранение данных

```
StoreSchema
├── mediaEvents: MediaEventConfig[]      # Все медиа-ивенты (глобальное хранилище)
├── mediaDisplayGroups: MediaDisplayGroup[]  # Группы отображения
├── mediaLibrary: MediaFile[]            # Загруженные файлы (images/videos/audio)
└── bots: { [name]: BotConfig }          # Конфиги ботов (НЕ содержат медиа)
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
```

### Компоненты

| Компонент | Расположение | Назначение |
|-----------|--------------|------------|
| `MediaEventEditorPopup` | `src/.../triggers/MediaEventEditorPopup.jsx` | Создание/редактирование MediaEventConfig |
| `MediaLibraryPopup` | `src/components/utils/MediaLibraryPopup.jsx` | Выбор файла из библиотеки |
| `MediaOverlay` | `src/components/media/MediaOverlay.jsx` | Рендеринг медиа в оверлее |
| `MediaOverlayEditor` | `src/components/media/MediaOverlayEditor.jsx` | Редактор групп отображения |

### Поток данных

```
1. Создание медиа:
   MediaEventEditorPopup → saveMediaEvent() → store.mediaEvents[]

2. Триггер показа:
   Bot Event → Middleware → Action { type: SHOW_MEDIA, payload: { mediaEventId } }

3. Обработка:
   main.ts → mediaEventsController.showMedia() → WebSocket broadcast

4. Отображение:
   MediaOverlay ← WebSocket 'media:show' → рендер в группе
```

---

## Текущие интеграции

### Триггеры (TriggerMiddleware)

```typescript
// В TriggerAction
interface TriggerActionParams {
    mediaEventId?: string;  // Ссылка на MediaEventConfig.id
}

// Доступные переменные для caption:
// ${user}, ${target}, ${reward}, ${reward_cost}, ${raider}, ${viewers}, ${args[N]}
```

---

## План: Универсальное связывание медиа

### Проблема

`MediaEventEditorPopup` имеет хардкод переменных. Разные контексты (триггеры, гача, лотерея) имеют разные доступные переменные.

### Решение

#### 1. Параметризация MediaEventEditorPopup

```jsx
// Было:
<MediaEventEditorPopup mediaEvent={...} onSave={...} onClose={...} />

// Станет:
<MediaEventEditorPopup
    mediaEvent={...}
    onSave={...}
    onClose={...}
    availableVariables={[
        { name: 'user', description: 'Username' },
        { name: 'item', description: 'Item name' },
        // ...
    ]}
/>
```

#### 2. Схема связывания для каждого контекста

```typescript
// Гача - в Item
interface Item {
    id: string;
    name: string;
    rarity: Rarity;
    // ...
    mediaEventIds?: string[];  // Ссылки на существующие медиа-ивенты
}

// Лотерея - аналогично
interface LotteryPrize {
    // ...
    mediaEventIds?: string[];
}

// Таймеры
interface TimerConfig {
    // ...
    mediaEventId?: string;
}
```

#### 3. UI компонент для выбора медиа

```jsx
// Новый переиспользуемый компонент
<MediaEventPicker
    value={selectedIds}              // string[]
    onChange={setSelectedIds}
    maxItems={2}                     // опционально
    availableVariables={[...]}       // для создания новых
    allowCreate={true}               // показывать кнопку "создать"
/>
```

Компонент показывает:
- Список выбранных медиа-ивентов (с превью)
- Кнопку "Добавить" → открывает список существующих + "Создать новый"
- При создании нового открывает `MediaEventEditorPopup` с нужными переменными

#### 4. Переменные по контекстам

```typescript
// Триггеры (текущие)
const TRIGGER_VARIABLES = [
    { name: 'user', description: 'Username who triggered' },
    { name: 'target', description: 'Target user' },
    { name: 'reward', description: 'Reward name' },
    { name: 'reward_cost', description: 'Reward cost' },
    { name: 'raider', description: 'Raider channel' },
    { name: 'viewers', description: 'Viewer count' },
    { name: 'args[N]', description: 'Command argument N' },
];

// Гача
const GACHA_VARIABLES = [
    { name: 'user', description: 'Username who rolled' },
    { name: 'item', description: 'Item name' },
    { name: 'rarity', description: 'Star rarity (3/4/5)' },
    { name: 'stars', description: 'Star representation (⭐⭐⭐)' },
    { name: 'pullNumber', description: 'Pulls since last 5-star' },
];

// Лотерея
const LOTTERY_VARIABLES = [
    { name: 'user', description: 'Winner username' },
    { name: 'prize', description: 'Prize name' },
    { name: 'participants', description: 'Total participants' },
];

// Таймеры
const TIMER_VARIABLES = [
    { name: 'timer_name', description: 'Timer name' },
    { name: 'interval', description: 'Timer interval' },
];
```

#### 5. Расширение MediaEventContext

```typescript
// В MediaEventsController.ts
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

    // Лотерея
    prize?: string;
    participants?: number;

    // Таймеры
    timerName?: string;
    interval?: string;
}
```

---

## Порядок реализации

### Этап 1: Рефакторинг MediaEventEditorPopup
- [ ] Добавить проп `availableVariables`
- [ ] Рендерить переменные из пропа вместо хардкода
- [ ] Обратная совместимость: дефолтные переменные триггеров

### Этап 2: MediaEventPicker компонент
- [ ] Создать компонент выбора медиа-ивентов
- [ ] Список существующих с поиском/фильтрацией
- [ ] Превью выбранных
- [ ] Кнопка создания нового (открывает редактор)

### Этап 3: Интеграция с гачей
- [ ] Добавить `mediaEventIds` в Item
- [ ] Добавить MediaEventPicker в ItemFormPopup
- [ ] Обновить GachaMiddleware для триггера медиа по ID

### Этап 4: Расширение контекста
- [ ] Добавить гача-переменные в MediaEventContext
- [ ] Обновить interpolateCaption

### Этап 5: Другие интеграции (по необходимости)
- [ ] Лотерея
- [ ] Таймеры
- [ ] Приветствия

---

## Удалить после рефакторинга

- `src/components/utils/MediaAttachmentEditor.jsx` - заменён на MediaEventPicker
- `GachaItemMedia` интерфейс - не нужен
- `InlineMediaEvent` в MediaEventsController - не нужен (всё по ID)
