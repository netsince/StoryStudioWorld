import { useState, useEffect } from 'react'

const SETTINGS_KEY = 'ssw:app-settings'

export interface UiSettings {
  hideActivityBarLabel: boolean
  hideAppLogoText: boolean
  autoHideStatusBar: boolean
}

const getDefaultSettings = (): UiSettings => ({
  hideActivityBarLabel: false,
  hideAppLogoText: false,
  autoHideStatusBar: false
})

const loadSettings = (): UiSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        ...getDefaultSettings(),
        hideActivityBarLabel: parsed.hideActivityBarLabel ?? false,
        hideAppLogoText: parsed.hideAppLogoText ?? false,
        autoHideStatusBar: parsed.autoHideStatusBar ?? false
      }
    }
  } catch {
    // ignore parse errors, fall through to defaults
  }
  return getDefaultSettings()
}

export const useUiSettings = (): UiSettings => {
  const [settings, setSettings] = useState<UiSettings>(loadSettings)

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent): void => {
      if (e.key === SETTINGS_KEY) {
        setSettings(loadSettings())
      }
    }

    const handleSettingsChange = (): void => {
      setSettings(loadSettings())
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('app-settings-changed', handleSettingsChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('app-settings-changed', handleSettingsChange)
    }
  }, [])

  return settings
}
