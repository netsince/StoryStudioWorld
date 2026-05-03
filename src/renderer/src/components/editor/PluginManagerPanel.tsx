import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePluginService } from '../../services/pluginService'

const PluginManagerPanel: React.FC = () => {
  const { t } = useTranslation()
  const plugins = usePluginService((s) => s.plugins)
  const setPluginEnabled = usePluginService((s) => s.setPluginEnabled)
  const isLoading = usePluginService((s) => s.isLoading)
  const [showHelp, setShowHelp] = useState(false)

  const handleOpenPluginsFolder = (): void => {
    window.api?.openPluginsFolder?.()
  }

  if (isLoading) {
    return (
      <div className="plugin-manager">
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
          {t('plugin.loading')}
        </div>
      </div>
    )
  }

  return (
    <div className="plugin-manager">
      <div className="plugin-toolbar">
        <span className="plugin-toolbar-title">{t('plugin.installedPlugins')}</span>
        <button
          className="story-toolbar-btn"
          title={t('plugin.openFolder')}
          onClick={handleOpenPluginsFolder}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      </div>

      <div className="plugin-list">
        {plugins.length === 0 ? (
          <div className="plugin-empty">
            <div className="plugin-empty-icon">🧩</div>
            <p>{t('plugin.noPlugins')}</p>
            <p style={{ fontSize: '11px', marginTop: '8px' }}>{t('plugin.installHint')}</p>
          </div>
        ) : (
          plugins.map((plugin) => (
            <div key={plugin.manifest.id} className="plugin-item">
              <div className="plugin-item-header">
                <div className="plugin-item-info">
                  <div className="plugin-icon">🧩</div>
                  <div className="plugin-name-container">
                    <span className="plugin-name" title={plugin.manifest.name}>
                      {plugin.manifest.name}
                    </span>
                    <span className="plugin-version">v{plugin.manifest.version}</span>
                  </div>
                </div>
                <label className="ssw-switch">
                  <input
                    type="checkbox"
                    checked={plugin.enabled && plugin.loaded}
                    onChange={(e) => setPluginEnabled(plugin.manifest.id, e.target.checked)}
                  />
                  <span className="ssw-slider"></span>
                </label>
              </div>

              {plugin.manifest.description && (
                <div className="plugin-item-details">{plugin.manifest.description}</div>
              )}

              {plugin.error && <div className="plugin-error">⚠️ {plugin.error}</div>}
            </div>
          ))
        )}
      </div>

      <div className="plugin-help-footer">
        <div className="plugin-help-toggle" onClick={() => setShowHelp(!showHelp)}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: showHelp ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
          {t('plugin.development')}
        </div>

        {showHelp && (
          <div style={{ marginTop: '12px' }}>
            <p style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>
              {t('plugin.directoryStructure')}:
            </p>
            <pre
              style={{
                margin: 0,
                padding: '8px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
                fontSize: '11px',
                overflow: 'auto',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)'
              }}
            >
              {`my-plugin/
├── manifest.json
└── index.js

// manifest.json
{
  "id": "my-plugin",
  "name": "${t('plugin.exampleName')}",
  "version": "1.0.0",
  "main": "index.js"
}

// index.js
export function activate(api) {
  api.ui.showNotification('${t('plugin.loadedMessage')}')
}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default PluginManagerPanel
