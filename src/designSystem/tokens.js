/**
 * Design tokens — единый источник истины для ОБОЛОЧКИ приложения
 * (Dashboard, Settings и панели, Auth, Loading, BackendLogs, Help, MediaOverlayEditor).
 *
 * ВАЖНО:
 * - Это НЕ для оверлеев. Чат-оверлей, followers/donation goal, аудио-плееры/визуализаторы
 *   и media-overlay темизируются внешними объектами из electron-store/WebSocket
 *   (см. src/theme.js + styled-components ThemeProvider). Их сюда не заводим и не трогаем.
 * - Токены потребляются прямым импортом в styled-components: `${tokens.color.accent.primary}`.
 *   ThemeProvider намеренно НЕ используется — он зарезервирован под внешние темы оверлеев.
 * - Акцентные цвета (#646cff / #7c3aed) и тёмная база зафиксированы как есть, чтобы
 *   сохранить узнаваемость и навигацию.
 */

// — Цвета ————————————————————————————————————————————————————————————————
export const color = {
    // Тёмные поверхности (от самой глубокой к приподнятой)
    bg: {
        app: '#0f0f0f',
        base: '#1a1a1a',
        surface: '#1e1e1e',
        raised: '#2a2a2a',
        raisedAlt: '#333333',
    },
    // Границы / разделители (по нарастанию контраста)
    border: {
        subtle: '#333333',
        default: '#444444',
        strong: '#555555',
    },
    // Текст (от основного к приглушённому)
    text: {
        primary: '#ffffff',
        secondary: '#e0e0e0',
        tertiary: '#cccccc',
        muted: '#999999',
        faint: '#888888',
        disabled: '#666666',
    },
    // Акцент — СОХРАНЯЕМ как есть
    accent: {
        primary: '#646cff',
        primaryHover: '#5a5acf',
        purple: '#7c3aed',
        soft: 'rgba(100, 108, 255, 0.1)',
        softBorder: 'rgba(100, 108, 255, 0.3)',
    },
    // Приглушённые заливки для интерактивных элементов: спокойнее канонических акцентов.
    fillMuted: {
        primary: '#4f5494',
        primaryHover: '#5b61aa',
        secondary: '#336b4f',
        secondaryHover: '#3d7b5d',
        danger: '#7e3535',
        dangerHover: '#934141',
        ghost: 'transparent',
        ghostHover: 'rgba(100, 108, 255, 0.08)',
        ghostBorder: 'rgba(100, 108, 255, 0.32)',
        neutral: '#2a2b3d',
        neutralHover: '#34364c',
    },
    // Семантика (base — заливка/иконка; text — текст на soft-фоне; soft/softBorder — мягкий бейдж)
    success: {
        base: '#22c55e',
        text: '#28a745',
        soft: 'rgba(40, 167, 69, 0.1)',
        softBorder: 'rgba(40, 167, 69, 0.3)',
    },
    warning: {
        base: '#ffc107',
        text: '#ffc107',
        soft: 'rgba(255, 193, 7, 0.1)',
        softBorder: 'rgba(255, 193, 7, 0.3)',
    },
    danger: {
        base: '#dc2626',
        hover: '#b91c1c',
        text: '#dc3545',
        soft: 'rgba(220, 53, 69, 0.1)',
        softBorder: 'rgba(220, 53, 69, 0.3)',
    },
    info: {
        base: '#0af0d5',
    },
    // Фиче-акценты — цветовое кодирование РАЗДЕЛОВ оболочки (по группам навигации).
    // Чтобы пользователь ориентировался: «розовый — медиа, синий — интеграции…».
    // Структура как у семантики: base — иконка/акцент; soft — мягкая подложка;
    // softBorder — рамка. Бренды (youtube) — исключение из групповой логики.
    feature: {
        general:      { base: '#64748b', soft: 'rgba(100, 116, 139, 0.14)', softBorder: 'rgba(100, 116, 139, 0.35)' }, // настройки/about — slate
        chat:         { base: '#646cff', soft: 'rgba(100, 108, 255, 0.14)', softBorder: 'rgba(100, 108, 255, 0.35)' }, // ядро — indigo (= accent)
        bot:          { base: '#10b981', soft: 'rgba(16, 185, 129, 0.14)',  softBorder: 'rgba(16, 185, 129, 0.35)'  }, // бот/автоматизация — emerald
        media:        { base: '#ec4899', soft: 'rgba(236, 72, 153, 0.14)',  softBorder: 'rgba(236, 72, 153, 0.35)'  }, // медиа — pink (узнаваемо)
        integrations: { base: '#3b82f6', soft: 'rgba(59, 130, 246, 0.14)',  softBorder: 'rgba(59, 130, 246, 0.35)'  }, // OBS/HTTP/DA — blue
        players:      { base: '#06b6d4', soft: 'rgba(6, 182, 212, 0.14)',   softBorder: 'rgba(6, 182, 212, 0.35)'   }, // аудио/визуализаторы — cyan
        goals:        { base: '#f59e0b', soft: 'rgba(245, 158, 11, 0.14)',  softBorder: 'rgba(245, 158, 11, 0.35)'  }, // цели (фолловеры/сбор) — amber
        youtube:      { base: '#ff0033', soft: 'rgba(255, 0, 51, 0.14)',    softBorder: 'rgba(255, 0, 51, 0.35)'    }, // бренд-исключение — red
    },
    // Затемнения / подложки
    scrim: {
        strong: 'rgba(0, 0, 0, 0.7)',
        soft: 'rgba(40, 40, 40, 0.5)',
        panel: 'rgba(30, 30, 30, 0.5)',
    },
    // Тонкие светлые блики (inset «hairline»)
    highlight: {
        faint: 'rgba(255, 255, 255, 0.05)',
        soft: 'rgba(255, 255, 255, 0.08)',
    },
    white: '#ffffff',
    black: '#000000',
};

// — Градиенты ————————————————————————————————————————————————————————————
export const gradient = {
    surface: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
    raised: 'linear-gradient(135deg, #2a2a2a 0%, #333333 100%)',
    raisedAlt: 'linear-gradient(135deg, #333333 0%, #3a3a3a 100%)',
    accent: 'linear-gradient(135deg, #646cff, #7c3aed)',
    divider: 'linear-gradient(90deg, transparent, #333333, transparent)',
};

// — Отступы (шаг 4px) ————————————————————————————————————————————————————
export const space = {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px',
};

// — Радиусы ——————————————————————————————————————————————————————————————
export const radius = {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    xxl: '16px',
    xxxl: '20px',
    pill: '9999px',
    circle: '50%',
};

// — Тени ————————————————————————————————————————————————————————————————
export const shadow = {
    sm: '0 4px 12px rgba(0, 0, 0, 0.3)',
    md: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    lg: '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    xl: '0 20px 60px rgba(0, 0, 0, 0.5)',
    glow: '0 0 10px rgba(92, 56, 169, 0.6)',
    focus: '0 0 0 3px rgba(100, 108, 255, 0.1)',
};

// — Типографика ——————————————————————————————————————————————————————————
export const font = {
    family: {
        base: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        mono: "'JetBrains Mono', 'Consolas', 'Monaco', monospace",
    },
    size: {
        xs: '0.75rem',
        sm: '0.85rem',
        md: '0.9rem',
        base: '14px',
        lg: '1rem',
        xl: '1.2rem',
        xxl: '1.5rem',
    },
    weight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },
    lineHeight: {
        tight: 1.2,
        base: 1.4,
        relaxed: 1.6,
    },
};

// — Переходы —————————————————————————————————————————————————————————————
export const transition = {
    fast: 'all 0.15s ease',
    base: 'all 0.2s ease',
    slow: 'all 0.3s ease',
};

// — Слои (z-index) ———————————————————————————————————————————————————————
export const z = {
    base: 1,
    dropdown: 1000,
    sticky: 1100,
    overlay: 9000,
    modal: 9999,
    toast: 10000,
};

export const tokens = {
    color,
    gradient,
    space,
    radius,
    shadow,
    font,
    transition,
    z,
};

export default tokens;
