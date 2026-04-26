import React from 'react'
import { useTranslation } from 'react-i18next'
import { usePluginService } from '../../services/pluginService'

const PluginManagerPanel: React.FC = () => {
  const { t } = useTranslation()
  const plugins = usePluginService((s) => s.plugins)
  const setPluginEnabled = usePluginService((s) => s.setPluginEnabled)
  const isLoading = usePluginService((s) => s.isLoading)

  const handleOpenPluginsFolder = (): void => {
    window.api?.openPluginsFolder?.()
  }

  if (isLoading) {
    return (
      <div className="plugin-manager" style={{ padding: '12px' }}>
        <div style={{ textAlign: 'center', color: 'var(--foreground-muted)' }}>
          {t('plugin.loading')}
        </div>
      </div>
    )
  }

  return (
    <div className="plugin-manager" style={{ padding: '12px' }}>
      <div
        className="plugin-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '14px' }}>{t('plugin.installedPlugins')}</h3>
        <button
          className="action-button secondary"
          style={{ fontSize: '12px', padding: '4px 8px' }}
          onClick={handleOpenPluginsFolder}
        >
          {t('plugin.openFolder')}
        </button>
      </div>

      {plugins.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--foreground-muted)',
            padding: '20px'
          }}
        >
          <p style={{ margin: '0 0 12px 0' }}>{t('plugin.noPlugins')}</p>
          <p style={{ margin: 0, fontSize: '12px' }}>
            {t('plugin.installHint')}
          </p>
        </div>
      ) : (
        <div className="plugin-list">
          {plugins.map((plugin) => (
            <div
              key={plugin.manifest.id}
              className="plugin-item"
              style={{
                padding: '12px',
                marginBottom: '8px',
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px'
              }}
            >
              <div
                className="plugin-info"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}
              >
                <span className="plugin-name" style={{ fontWeight: 500 }}>
                  {plugin.manifest.name}
                </span>
                <span
                  className="plugin-version"
                  style={{
                    fontSize: '11px',
                    color: 'var(--foreground-muted)',
                    background: 'var(--badge-bg)',
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}
                >
                  v{plugin.manifest.version}
                </span>
              </div>
              {plugin.manifest.description && (
                <div
                  className="plugin-desc"
                  style={{
                    fontSize: '12px',
                    color: 'var(--foreground-muted)',
                    marginBottom: '8px'
                  }}
                >
                  {plugin.manifest.description}
                </div>
              )}
              {plugin.manifest.author && (
                <div
                  className="plugin-author"
                  style={{
                    fontSize: '11px',
                    color: 'var(--foreground-muted)',
                    marginBottom: '8px'
                  }}
                >
                  {t('plugin.author')}: {plugin.manifest.author}
                </div>
              )}
              <div
                className="plugin-actions"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={plugin.enabled && plugin.loaded}
                    onChange={(e) => setPluginEnabled(plugin.manifest.id, e.target.checked)}
                  />
                  {t('plugin.enable')}
                </label>
                {plugin.error && (
                  <span style={{ color: 'var(--error)', fontSize: '11px' }}>
                    {t('plugin.error')}: {plugin.error}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className="plugin-help"
        style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '4px',
          fontSize: '12px',
          color: 'var(--foreground-muted)'
        }}
      >
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>{t('plugin.development')}</h4>
        <p style={{ margin: '0 0 4px 0' }}>{t('plugin.directoryStructure')}:</p>
        <pre
          style={{
            margin: 0,
            padding: '8px',
            background: 'var(--input-bg)',
            borderRadius: '3px',
            fontSize: '11px',
            overflow: 'auto'
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
    </div>
  )
}

export default PluginManagerPanel
