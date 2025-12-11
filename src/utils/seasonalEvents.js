/**
 * Seasonal Events Configuration
 *
 * This module manages seasonal events like New Year, Halloween, etc.
 * Each event has a date range and associated visual effects.
 */

/**
 * Event definitions
 * Each event has:
 * - id: unique identifier
 * - name: display name
 * - startMonth, startDay: when the event starts (1-indexed)
 * - endMonth, endDay: when the event ends (1-indexed)
 * - effects: array of effect names to apply
 */
export const SEASONAL_EVENTS = [
    {
        id: 'new_year',
        name: 'New Year',
        startMonth: 12,
        startDay: 12,
        endMonth: 1,
        endDay: 14,
        effects: ['snowfall'],
    },
    // Future events can be added here:
    // {
    //     id: 'halloween',
    //     name: 'Halloween',
    //     startMonth: 10,
    //     startDay: 25,
    //     endMonth: 11,
    //     endDay: 2,
    //     effects: ['bats', 'pumpkins'],
    // },
];

/**
 * Check if a date falls within an event's date range
 * Handles year-crossing events (e.g., Dec 20 - Jan 14)
 */
function isDateInRange(date, event) {
    const month = date.getMonth() + 1; // 0-indexed to 1-indexed
    const day = date.getDate();

    const { startMonth, startDay, endMonth, endDay } = event;

    // Event crosses year boundary (e.g., Dec 20 - Jan 14)
    if (startMonth > endMonth) {
        // Check if we're in the end-of-year part (Dec 20-31)
        if (month > startMonth || (month === startMonth && day >= startDay)) {
            return true;
        }
        // Check if we're in the start-of-year part (Jan 1-14)
        if (month < endMonth || (month === endMonth && day <= endDay)) {
            return true;
        }
        return false;
    }

    // Normal range within same year
    const afterStart = month > startMonth || (month === startMonth && day >= startDay);
    const beforeEnd = month < endMonth || (month === endMonth && day <= endDay);

    return afterStart && beforeEnd;
}

/**
 * Get all currently active events
 * @param {Date} [date] - Date to check (defaults to now)
 * @returns {Array} Array of active event objects
 */
export function getActiveEvents(date = new Date()) {
    return SEASONAL_EVENTS.filter(event => isDateInRange(date, event));
}

/**
 * Check if a specific event is active
 * @param {string} eventId - Event ID to check
 * @param {Date} [date] - Date to check (defaults to now)
 * @returns {boolean}
 */
export function isEventActive(eventId, date = new Date()) {
    const event = SEASONAL_EVENTS.find(e => e.id === eventId);
    if (!event) return false;
    return isDateInRange(date, event);
}

/**
 * Get all active effects
 * @param {Date} [date] - Date to check (defaults to now)
 * @returns {Array<string>} Array of effect names
 */
export function getActiveEffects(date = new Date()) {
    const activeEvents = getActiveEvents(date);
    const effects = new Set();
    activeEvents.forEach(event => {
        event.effects.forEach(effect => effects.add(effect));
    });
    return Array.from(effects);
}

/**
 * Check if a specific effect should be active
 * @param {string} effectName - Effect name to check
 * @param {Date} [date] - Date to check (defaults to now)
 * @returns {boolean}
 */
export function isEffectActive(effectName, date = new Date()) {
    return getActiveEffects(date).includes(effectName);
}
