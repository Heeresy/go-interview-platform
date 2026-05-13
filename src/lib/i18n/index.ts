/**
 * Публичный API модуля i18n.
 *
 * Используйте `t(key, vars?)` для получения локализованных строк и
 * `TranslationKey` как тип для пропсов компонентов, принимающих ключ
 * (например, `<ErrorState messageKey={...} />`).
 */
export { t, ru } from './ru';
export type { TranslationKey, TranslationVars, Translations } from './ru';
