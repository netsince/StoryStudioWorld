import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { APP_NAME } from '../constants/config'

export const SUPPORTED_LANGUAGES = {
  ZH_CN: 'zh-CN',
  EN: 'en'
} as const

export type SupportedLanguage = string

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
    fallbackLng: ['en', 'zh-CN'],
    debug: false,
    saveMissing: true,
    missingKeyHandler: (lngs, ns, key) => {
      const langChain = Array.isArray(lngs) ? lngs : [lngs]
      for (let i = 0; i < langChain.length - 1; i++) {
        const fromLang = langChain[i]
        const toLang = langChain[i + 1]
        console.error(`[i18n] Missing key "${key}" in "${fromLang}", fallback to "${toLang}"`)
      }
      console.error(`[i18n] Missing key "${key}" in all fallbacks, display ID directly`)
    },
    parseMissingKeyHandler: (key) => {
      return key
    },
    interpolation: {
      escapeValue: false,
      defaultVariables: {
        APP_NAME
      }
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

export const addLanguage = (languageFile: LanguageFile): boolean => {
  if (!languageFile.languageMetadata) {
    console.warn('Language file missing languageMetadata')
    return false
  }

  const langCode = languageFile.languageMetadata.code

  if (resources[langCode]) {
    const existingIndex = availableLanguages.findIndex((l) => l.code === langCode)
    if (existingIndex !== -1) {
      availableLanguages[existingIndex] = languageFile.languageMetadata
    }
    resources[langCode] = { translation: languageFile }
  } else {
    resources[langCode] = { translation: languageFile }
    availableLanguages.push(languageFile.languageMetadata)
    availableLanguages.sort((a, b) => a.code.localeCompare(b.code))
  }

  if (!i18n.hasResourceBundle(langCode, 'translation')) {
    i18n.addResourceBundle(langCode, 'translation', languageFile, true, true)
  } else {
    i18n.removeResourceBundle(langCode, 'translation')
    i18n.addResourceBundle(langCode, 'translation', languageFile, true, true)
  }

  return true
}

export const hasLanguage = (langCode: SupportedLanguage): boolean => {
  return !!resources[langCode]
}

export default i18n
