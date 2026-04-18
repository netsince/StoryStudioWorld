import React, { useState, useEffect } from 'react'

const SETTINGS_KEY = 'ssw:app-settings'

type TabBehavior = 'tab' | '4spaces' | '2spaces'

interface AppSettings {
  editorFontFamily: string
  editorFontSize: number
  editorLineHeight: number
  editorTabBehavior: TabBehavior
}

const DEFAULT_SETTINGS: AppSettings = {
  editorFontFamily: '"Noto Serif SC", serif',
  editorFontSize: 18,
  editorLineHeight: 2.0,
  editorTabBehavior: 'tab',
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
  { name: 'Roboto Slab', value: '"Roboto Slab", serif' },
]

const TAB_BEHAVIOR_OPTIONS: { value: TabBehavior; label: string }[] = [
  { value: 'tab', label: '插入制表符' },
  { value: '4spaces', label: '插入四个空格' },
  { value: '2spaces', label: '插入两个空格' },
]

const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    }
  } catch {}
  return DEFAULT_SETTINGS
}

const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

const PREVIEW_TEXT_CN = '梦见一个新世界'
const PREVIEW_TEXT_EN = 'The quick brown fox jumps over the lazy dog'

const PreferencesPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [systemFonts, setSystemFonts] = useState<{ name: string; value: string }[]>([])
  const [activeSection, setActiveSection] = useState<string>('editor')

  useEffect(() => {
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return
    
    const baseWidth = ctx.measureText('M').width
    const testFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
      'Courier New', 'Comic Sans MS', 'Trebuchet MS', 'Palatino Linotype',
      'Lucida Console', 'Microsoft YaHei', 'SimSun', 'SimHei', 'KaiTi',
      'FangSong', 'PingFang SC', 'Microsoft JhengHei', 'Apple Symbols',
    ]
    const availableFonts: string[] = []
    testFonts.forEach(font => {
      ctx.font = `72px ${font}, sans-serif`
      const width = ctx.measureText('M').width
      if (width !== baseWidth && !availableFonts.includes(font)) {
        availableFonts.push(font)
      }
    })
    setSystemFonts(availableFonts.map(name => ({
      name,
      value: `"${name}", sans-serif`
    })))
  }, [])

  const applySettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    saveSettings(updated)
    
    if (newSettings.editorFontFamily !== undefined) {
      document.documentElement.style.setProperty('--editor-font-family', newSettings.editorFontFamily)
    }
    if (newSettings.editorFontSize !== undefined) {
      document.documentElement.style.setProperty('--editor-font-size', `${newSettings.editorFontSize}px`)
    }
    if (newSettings.editorLineHeight !== undefined) {
      document.documentElement.style.setProperty('--editor-line-height', newSettings.editorLineHeight.toString())
    }
  }

  const allFonts = [...OPEN_SOURCE_FONTS, ...systemFonts]

  const renderSection = () => {
    switch (activeSection) {
      case 'editor':
        return (
          <div style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>编辑器</h3>
            
            {/* 字体 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                字体
              </label>
              <div style={{ 
                maxHeight: '200px', 
                overflow: 'auto', 
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
              }}>
                {allFonts.map((font, idx) => (
                  <div
                    key={idx}
                    onClick={() => applySettings({ editorFontFamily: font.value })}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      backgroundColor: settings.editorFontFamily === font.value ? 'var(--bg-hover)' : 'transparent',
                      borderBottom: idx < allFonts.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '13px' }}>{font.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: font.value }}>
                      Aa
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 字号 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                字号: {settings.editorFontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="32"
                step="1"
                value={settings.editorFontSize}
                onChange={e => applySettings({ editorFontSize: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>12px</span>
                <span>32px</span>
              </div>
            </div>

            {/* 行高 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                行高: {settings.editorLineHeight}
              </label>
              <input
                type="range"
                min="1.2"
                max="3.0"
                step="0.1"
                value={settings.editorLineHeight}
                onChange={e => applySettings({ editorLineHeight: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>紧凑</span>
                <span>宽松</span>
              </div>
            </div>

            {/* 按下 Tab 时 */}
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                按下 Tab 时
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {TAB_BEHAVIOR_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => applySettings({ editorTabBehavior: option.value })}
                    style={{
                      padding: '8px 14px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      background: settings.editorTabBehavior === option.value ? 'var(--accent-color)' : 'transparent',
                      color: settings.editorTabBehavior === option.value ? '#fff' : 'var(--text-color)',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', backgroundColor: 'var(--bg-color)' }}>
      {/* 侧边栏 */}
      <div style={{ 
        width: '180px', 
        borderRight: '1px solid var(--border-color)',
        padding: '12px 0',
      }}>
        {[
          { id: 'editor', label: '编辑器', icon: '📝' },
        ].map(section => (
          <div
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              backgroundColor: activeSection === section.id ? 'var(--bg-hover)' : 'transparent',
              borderLeft: activeSection === section.id ? '2px solid var(--accent-color)' : '2px solid transparent',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </div>
        ))}
      </div>

      {/* 主内容 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 设置内容 */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {renderSection()}
        </div>

        {/* 预览 */}
        <div style={{ 
          borderTop: '1px solid var(--border-color)',
          padding: '20px 24px',
          backgroundColor: 'var(--panel-bg)',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
            预览
          </div>
          <div style={{ 
            fontFamily: settings.editorFontFamily,
            fontSize: `${settings.editorFontSize}px`,
            lineHeight: settings.editorLineHeight,
            color: 'var(--text-color)',
          }}>
            <div style={{ marginBottom: '8px' }}>{PREVIEW_TEXT_CN}</div>
            <div style={{ fontSize: `${settings.editorFontSize - 2}px`, color: 'var(--text-muted)' }}>{PREVIEW_TEXT_EN}</div>
          </div>
        </div>
      </div>
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
    document.documentElement.style.setProperty('--editor-line-height', settings.editorLineHeight.toString())
  }
}

export const getTabBehavior = (): TabBehavior => {
  const settings = loadSettings()
  return settings.editorTabBehavior
}
