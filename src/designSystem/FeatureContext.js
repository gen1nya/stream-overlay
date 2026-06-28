import { createContext } from 'react';

/**
 * Текущая фиче-группа раздела оболочки ("media" | "bot" | "integrations" | …),
 * прокидывается из SettingsComponent. Тематизируемые компоненты оболочки
 * (SettingsCard header/title) читают её и красятся в цвет группы.
 *
 * undefined = без фиче-тонировки (нейтральный вид как раньше).
 * Источник истины маппинга key→группа живёт в SettingsComponent.
 */
export const FeatureContext = createContext(undefined);

export default FeatureContext;
