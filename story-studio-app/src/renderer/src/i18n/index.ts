import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

export const SUPPORTED_LANGUAGES = {
  ZH_CN: 'zh-CN',
  EN: 'en'
} as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[keyof typeof SUPPORTED_LANGUAGES]

export interface LanguageMetadata {
  code: SupportedLanguage
  englishName: string
  nativeName: string
  contributors: string[]
}

export interface LanguageFile {
  languageMetadata: LanguageMetadata
  [key: string]: unknown
}

const languageModules = import.meta.glob('../languages/*.json', { eager: true }) as Record<string, { default: LanguageFile }>

const resources: Record<string, { translation: Record<string, unknown> }> = {}
const availableLanguages: LanguageMetadata[] = []

for (const [path, module] of Object.entries(languageModules)) {
  const data = module.default || module
  if (data && data.languageMetadata) {
    const langCode = data.languageMetadata.code
    resources[langCode] = { translation: data }
    availableLanguages.push(data.languageMetadata)
  } else {
    console.warn(`Language file ${path} missing languageMetadata`)
  }
}

availableLanguages.sort((a, b) => a.code.localeCompare(b.code))

const SETTINGS_KEY = 'ssw:language'

const savedLanguage = localStorage.getItem(SETTINGS_KEY)

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage || undefined,
    fallbackLng: 'zh-CN',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: SETTINGS_KEY,
      caches: ['localStorage']
    }
  })

export const getAvailableLanguages = (): LanguageMetadata[] => availableLanguages

export const getCurrentLanguage = (): SupportedLanguage => i18n.language as SupportedLanguage

export const setLanguage = (langCode: SupportedLanguage): void => {
  localStorage.setItem(SETTINGS_KEY, langCode)
  void i18n.changeLanguage(langCode)
}

export default i18n
