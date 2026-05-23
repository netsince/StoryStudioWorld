import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getAvailableLanguages,
  setLanguage,
  getCurrentLanguage,
  type LanguageMetadata,
  type SupportedLanguage
} from '../../i18n'
import { MobileServerPanel } from '../MobileServerPanel'

const SETTINGS_KEY = 'ssw:app-settings'

type TabBehavior = 'tab' | '4spaces' | '2spaces'

interface AppSettings {
  editorFontFamily: string
  editorFontSize: number
  editorLineHeight: number
  editorTabBehavior: TabBehavior
  autoSaveEnabled: boolean
  autoSaveInterval: number
  autoIndentEnabled: boolean
  hideActivityBarLabel: boolean
  hideAppLogoText: boolean
  autoHideStatusBar: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
  editorFontFamily: '"Noto Serif SC", serif',
  editorFontSize: 18,
  editorLineHeight: 2.0,
  editorTabBehavior: 'tab',
  autoSaveEnabled: true,
  autoSaveInterval: 30,
  autoIndentEnabled: false,
  hideActivityBarLabel: false,
  hideAppLogoText: false,
  autoHideStatusBar: false
}

const OPEN_SOURCE_FONTS = [
  { name: 'Noto Serif SC', value: '"Noto Serif SC", serif' },
  { name: 'Noto Sans SC', value: '"Noto Sans SC", sans-serif' },
  { name: 'Noto Serif', value: '"Noto Serif", serif' },
  { name: 'Noto Sans', value: '"Noto Sans", sans-serif' },
  { name: 'Source Han Serif SC', value: '"Source Han Serif SC", "Noto Serif SC", serif' },
  { name: 'Source Han Sans SC', value: '"Source Han Sans SC", "Noto Sans SC", sans-serif' },
  { name: 'Lora', value: 'Lora, serif' },
  { name: 'Merriweather', value: 'Merriweather, serif' },
  { name: 'Source Serif Pro', value: '"Source Serif Pro", serif' },
  { name: 'IBM Plex Serif', value: '"IBM Plex Serif", serif' },
  { name: 'Roboto Slab', value: '"Roboto Slab", serif' }
]

const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    }
    // eslint-disable-next-line no-empty
  } catch {}
  return DEFAULT_SETTINGS
}

const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  window.dispatchEvent(new CustomEvent('app-settings-changed'))
}

const PreferencesPage: React.FC = () => {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [systemFonts, setSystemFonts] = useState<{ name: string; value: string }[]>([])
  const [activeSection, setActiveSection] = useState<string>('editor')
  const [availableLanguages, setAvailableLanguages] = useState<LanguageMetadata[]>([])
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getCurrentLanguage())

  useEffect(() => {
    setAvailableLanguages(getAvailableLanguages())
  }, [])

  useEffect(() => {
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return

    const baseWidth = ctx.measureText('M').width
    const testFonts = [
      'Arial',
      'Helvetica',
      'Times New Roman',
      'Georgia',
      'Verdana',
      'Courier New',
      'Comic Sans MS',
      'Trebuchet MS',
      'Palatino Linotype',
      'Lucida Console',
      'Microsoft YaHei',
      'SimSun',
      'SimHei',
      'KaiTi',
      'FangSong',
      'PingFang SC',
      'Microsoft JhengHei',
      'Apple Symbols'
    ]
    const availableFonts: string[] = []
    testFonts.forEach((font) => {
      ctx.font = `72px ${font}, sans-serif`
      const width = ctx.measureText('M').width
      if (width !== baseWidth && !availableFonts.includes(font)) {
        availableFonts.push(font)
      }
    })
    // eslint-disable-next-line @eslint-react/set-state-in-effect
    setSystemFonts(
      availableFonts.map((name) => ({
        name,
        value: `"${name}", sans-serif`
      }))
    )
  }, [])

  const applySettings = (newSettings: Partial<AppSettings>): void => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    saveSettings(updated)

    if (newSettings.editorFontFamily !== undefined) {
      document.documentElement.style.setProperty(
        '--editor-font-family',
        newSettings.editorFontFamily
      )
    }
    if (newSettings.editorFontSize !== undefined) {
      document.documentElement.style.setProperty(
        '--editor-font-size',
        `${newSettings.editorFontSize}px`
      )
    }
    if (newSettings.editorLineHeight !== undefined) {
      document.documentElement.style.setProperty(
        '--editor-line-height',
        newSettings.editorLineHeight.toString()
      )
    }
  }

  const handleLanguageChange = (langCode: SupportedLanguage): void => {
    setLanguage(langCode)
    setCurrentLang(langCode)
  }

  const allFonts = [...OPEN_SOURCE_FONTS, ...systemFonts]

  const getTabBehaviorOptions = (): { value: TabBehavior; label: string }[] => [
    { value: 'tab', label: t('preferences.insertTab') },
    { value: '4spaces', label: t('preferences.insert4Spaces') },
    { value: '2spaces', label: t('preferences.insert2Spaces') }
  ]

  const getSaveIntervalOptions = (): { value: number; label: string }[] => [
    { value: 10, label: `10 ${t('preferences.seconds')}` },
    { value: 30, label: `30 ${t('preferences.seconds')}` },
    { value: 60, label: `1 ${t('preferences.minutes')}` },
    { value: 120, label: `2 ${t('preferences.minutes')}` },
    { value: 300, label: `5 ${t('preferences.minutes')}` }
  ]

  const renderSection = (): React.ReactNode => {
    switch (activeSection) {
      case 'editor':
        return (
          <div style={{ padding: '24px', paddingBottom: '48px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
              {t('preferences.editor')}
            </h3>

            {/* Preview */}
            <div
              style={{
                marginBottom: '24px',
                backgroundColor: 'var(--panel-bg)',
                borderRadius: '8px',
                padding: '20px',
                border: '1px solid var(--border-color)'
              }}
            >
              <div
                style={{
                  fontFamily: settings.editorFontFamily,
                  fontSize: `${settings.editorFontSize}px`,
                  lineHeight: settings.editorLineHeight,
                  color: 'var(--text-color)'
                }}
              >
                <div style={{ marginBottom: '8px' }}>{t('preferences.preview')}</div>
                <div
                  style={{
                    fontSize: `${settings.editorFontSize - 2}px`,
                    color: 'var(--text-muted)'
                  }}
                >
                  The quick brown fox jumps over the lazy dog
                </div>
              </div>
            </div>

            {/* Font */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '8px'
                }}
              >
                {t('preferences.font')}
              </label>
              <div
                style={{
                  maxHeight: '180px',
                  overflow: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}
              >
                {allFonts.map((font, idx) => (
                  <div
                    key={idx}
                    onClick={() => applySettings({ editorFontFamily: font.value })}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      backgroundColor:
                        settings.editorFontFamily === font.value
                          ? 'var(--bg-hover)'
                          : 'transparent',
                      borderBottom:
                        idx < allFonts.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: '13px' }}>{font.name}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        fontFamily: font.value
                      }}
                    >
                      Aa
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '8px'
                }}
              >
                {t('preferences.fontSize')}: {settings.editorFontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="32"
                step="1"
                value={settings.editorFontSize}
                onChange={(e) => applySettings({ editorFontSize: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: 'var(--text-muted)'
                }}
              >
                <span>12px</span>
                <span>32px</span>
              </div>
            </div>

            {/* Line Height */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '8px'
                }}
              >
                {t('preferences.lineHeight')}: {settings.editorLineHeight}
              </label>
              <input
                type="range"
                min="1.2"
                max="3.0"
                step="0.1"
                value={settings.editorLineHeight}
                onChange={(e) => applySettings({ editorLineHeight: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: 'var(--text-muted)'
                }}
              >
                <span>{t('preferences.compact')}</span>
                <span>{t('preferences.loose')}</span>
              </div>
            </div>

            {/* Tab Behavior */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '8px'
                }}
              >
                {t('preferences.tabBehavior')}
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {getTabBehaviorOptions().map((option) => (
                  <button
                    key={option.value}
                    onClick={() => applySettings({ editorTabBehavior: option.value })}
                    style={{
                      padding: '8px 14px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      background:
                        settings.editorTabBehavior === option.value
                          ? 'var(--accent-color)'
                          : 'transparent',
                      color:
                        settings.editorTabBehavior === option.value ? '#fff' : 'var(--text-color)',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Save */}
            <div>
              <label
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '8px'
                }}
              >
                {t('preferences.autoSave')}
              </label>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}
              >
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={settings.autoSaveEnabled}
                    onChange={(e) => applySettings({ autoSaveEnabled: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '13px' }}>{t('preferences.enableAutoSave')}</span>
                </label>
              </div>
              {settings.autoSaveEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {t('preferences.saveInterval')}:
                  </span>
                  <select
                    value={settings.autoSaveInterval}
                    onChange={(e) => applySettings({ autoSaveInterval: parseInt(e.target.value) })}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      background: 'var(--bg-color)',
                      color: 'var(--text-color)',
                      fontSize: '13px'
                    }}
                  >
                    {getSaveIntervalOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Auto Indent */}
            <div style={{ marginTop: '24px' }}>
              <label
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '8px'
                }}
              >
                {t('preferences.autoIndent')}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={settings.autoIndentEnabled}
                    onChange={(e) => applySettings({ autoIndentEnabled: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '13px' }}>{t('preferences.autoIndentDesc')}</span>
                </label>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                {t('preferences.currentIndentStrategy')}:{' '}
                {getTabBehaviorOptions().find((o) => o.value === settings.editorTabBehavior)?.label}
              </div>
            </div>
          </div>
        )

      case 'interface':
        return (
          <div style={{ padding: '24px', paddingBottom: '48px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
              {t('preferences.interface')}
            </h3>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '8px'
                }}
              >
                {t('preferences.activityBar')}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={settings.hideActivityBarLabel}
                    onChange={(e) => applySettings({ hideActivityBarLabel: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '13px' }}>{t('preferences.hideActivityBarLabel')}</span>
                </label>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                {t('preferences.hideActivityBarLabelDesc')}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '8px'
                }}
              >
                {t('preferences.titleBar')}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={settings.hideAppLogoText}
                    onChange={(e) => applySettings({ hideAppLogoText: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '13px' }}>{t('preferences.hideAppLogoText')}</span>
                </label>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                {t('preferences.hideAppLogoTextDesc')}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '8px'
                }}
              >
                {t('preferences.statusBar')}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={settings.autoHideStatusBar}
                    onChange={(e) => applySettings({ autoHideStatusBar: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '13px' }}>{t('preferences.autoHideStatusBar')}</span>
                </label>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                {t('preferences.autoHideStatusBarDesc')}
              </div>
            </div>
          </div>
        )

      case 'localization':
        return (
          <div style={{ padding: '24px', paddingBottom: '48px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
              {t('preferences.localization')}
            </h3>

            {/* Language Selection */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '8px'
                }}
              >
                {t('preferences.language')}
              </label>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {t('preferences.languageDesc')}
              </p>
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}
              >
                {availableLanguages.map((lang, idx) => (
                  <div
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      backgroundColor:
                        currentLang === lang.code ? 'var(--bg-hover)' : 'transparent',
                      borderBottom:
                        idx < availableLanguages.length - 1
                          ? '1px solid var(--border-subtle)'
                          : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{lang.nativeName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {lang.englishName}
                      </div>
                    </div>
                    {currentLang === lang.code && (
                      <span style={{ color: 'var(--accent-color)', fontSize: '14px' }}>✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'mobile':
        return (
          <div style={{ padding: '24px', paddingBottom: '48px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
              移动服务器
            </h3>
            <MobileServerPanel />
          </div>
        )

      default:
        return null
    }
  }

  const sections = [
    { id: 'editor', label: t('preferences.editor'), icon: '📝' },
    { id: 'interface', label: t('preferences.interface'), icon: '🖥️' },
    { id: 'localization', label: t('preferences.localization'), icon: '🌐' },
    { id: 'mobile', label: '移动服务器', icon: '📱' }
  ]

  return (
    <div style={{ height: '100%', display: 'flex', backgroundColor: 'var(--bg-color)' }}>
      {/* Sidebar */}
      <div
        style={{
          width: '180px',
          borderRight: '1px solid var(--border-color)',
          padding: '12px 0'
        }}
      >
        {sections.map((section) => (
          <div
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              backgroundColor: activeSection === section.id ? 'var(--bg-hover)' : 'transparent',
              borderLeft:
                activeSection === section.id
                  ? '2px solid var(--accent-color)'
                  : '2px solid transparent',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto' }}>{renderSection()}</div>
    </div>
  )
}

export default PreferencesPage

export type { TabBehavior }

export const getAppSettings = (): AppSettings => loadSettings()

export const applyAppSettings = (settings: AppSettings): void => {
  if (settings.editorFontFamily) {
    document.documentElement.style.setProperty('--editor-font-family', settings.editorFontFamily)
  }
  if (settings.editorFontSize) {
    document.documentElement.style.setProperty('--editor-font-size', `${settings.editorFontSize}px`)
  }
  if (settings.editorLineHeight) {
    document.documentElement.style.setProperty(
      '--editor-line-height',
      settings.editorLineHeight.toString()
    )
  }
}

export const getTabBehavior = (): TabBehavior => {
  const settings = loadSettings()
  return settings.editorTabBehavior
}

export const getAutoSaveSettings = (): { enabled: boolean; interval: number } => {
  const settings = loadSettings()
  return { enabled: settings.autoSaveEnabled, interval: settings.autoSaveInterval * 1000 }
}

export const getAutoIndentSettings = (): { enabled: boolean; indent: string } => {
  try {
    const saved = localStorage.getItem('ssw:app-settings')
    const settings = saved ? JSON.parse(saved) : DEFAULT_SETTINGS
    const indent =
      settings.editorTabBehavior === '4spaces'
        ? '    '
        : settings.editorTabBehavior === '2spaces'
          ? '  '
          : '\t'
    return { enabled: settings.autoIndentEnabled ?? false, indent }
  } catch {
    return { enabled: false, indent: '\t' }
  }
}

export const getActivityBarSettings = (): { hideLabel: boolean } => {
  try {
    const saved = localStorage.getItem('ssw:app-settings')
    const settings = saved ? JSON.parse(saved) : DEFAULT_SETTINGS
    return { hideLabel: settings.hideActivityBarLabel ?? false }
  } catch {
    return { hideLabel: false }
  }
}
