const SUPPORTED_LOCALES = ['en', 'fr']
const DEFAULT_LOCALE = 'fr'

function normalizeLocale(value) {
  const locale = String(value || '').trim().toLowerCase()
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE
}

module.exports = {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  normalizeLocale,
}
