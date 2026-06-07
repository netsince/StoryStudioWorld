import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../stores/projectStore'
import { getAvailableLanguages, getCurrentLanguage, type SupportedLanguage } from '../i18n'
import VseInputBox from './VseInputBox'

const WikiIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
)

const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const ExportIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const ExportWikiPanel: React.FC = () => {
  const { t } = useTranslation()
  const currentProject = useProjectStore((s) => s.currentProject)

  const availableLanguages = getAvailableLanguages()
  const [exportLang, setExportLang] = useState<SupportedLanguage>(() => getCurrentLanguage())
  const [exportPath, setExportPath] = useState('')
  const [includeChapters, setIncludeChapters] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(
    null
  )

  const handlePickFolder = async (): Promise<void> => {
    const result = await window.api.pickWikiExportPath()
    if (result) {
      setExportPath(result)
    }
  }

  const handleExport = async (): Promise<void> => {
    if (!currentProject) return
    if (!exportPath) {
      setExportResult({ success: false, message: t('exportWiki.selectPathFirst') })
      return
    }

    const wikiKeys = [
      'tableOfContents',
      'story',
      'setting',
      'backToIndex',
      'summary',
      'outline',
      'noContent',
      'projectWiki',
      'disambiguation',
      'disambiguationTitle',
      'disambiguationDesc',
      'notFound'
    ]
    const i18nStrings: Record<string, string> = {}
    for (const key of wikiKeys) {
      i18nStrings[key] = t(`exportWiki.wiki.${key}`)
    }
    const categoryKeys = ['character', 'location', 'worldview', 'item', 'other', 'default']
    for (const cat of categoryKeys) {
      i18nStrings[`setting.category.${cat}`] = t(`setting.category.${cat}`)
    }

    setIsExporting(true)
    setExportResult(null)

    try {
      const result = await window.api.exportWiki({
        projectSettingsPath: currentProject.projectSettingsPath,
        exportPath,
        language: exportLang,
        includeChapters,
        i18nStrings
      })

      if (result.success) {
        setExportResult({
          success: true,
          message: t('exportWiki.exportSuccess', { path: result.exportPath })
        })
      } else {
        setExportResult({ success: false, message: result.error || t('exportWiki.exportFailed') })
      }
    } catch (error) {
      setExportResult({ success: false, message: String(error) })
    } finally {
      setIsExporting(false)
    }
  }

  if (!currentProject) {
    return (
      <div className="export-story-panel">
        <div className="export-story-empty">
          <WikiIcon className="export-empty-icon" />
          <div className="export-empty-text">{t('exportWiki.noProject')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="export-story-panel">
      <div className="export-story-header">
        <div className="export-header-title">
          <WikiIcon className="export-header-icon" />
          <span>{t('exportWiki.title')}</span>
        </div>
      </div>

      <div className="export-story-content">
        <div className="export-section">
          <label className="export-label">{t('exportWiki.language')}</label>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            {t('exportWiki.languageDesc')}
          </p>
          <div className="export-wiki-lang-list">
            {availableLanguages.map((lang, idx) => (
              <div
                key={lang.code}
                className={`export-wiki-lang-item ${exportLang === lang.code ? 'active' : ''}`}
                onClick={() => setExportLang(lang.code)}
                style={{
                  borderBottom:
                    idx < availableLanguages.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{lang.nativeName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {lang.englishName}
                  </div>
                </div>
                {exportLang === lang.code && (
                  <span style={{ color: 'var(--accent-color)', fontSize: '14px' }}>✓</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="export-section">
          <label className="export-label">{t('exportWiki.exportPath')}</label>
          <div className="export-wiki-path-row">
            <VseInputBox
              className="export-input"
              value={exportPath}
              onChange={(value) => setExportPath(value)}
              placeholder={t('exportWiki.pathPlaceholder')}
            />
            <button className="export-wiki-path-btn" onClick={handlePickFolder}>
              <FolderIcon className="export-wiki-path-btn-icon" />
            </button>
          </div>
        </div>

        <div className="export-section">
          <label className="export-wiki-checkbox-label">
            <input
              type="checkbox"
              checked={includeChapters}
              onChange={(e) => setIncludeChapters(e.target.checked)}
              className="export-wiki-checkbox"
            />
            <span>{t('exportWiki.includeChapters')}</span>
          </label>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {t('exportWiki.includeChaptersDesc')}
          </p>
        </div>

        <div className="export-section export-actions">
          <button
            className="export-btn-primary"
            onClick={handleExport}
            disabled={isExporting || !exportPath}
          >
            {isExporting ? (
              <>
                <span className="export-spinner" />
                <span>{t('exportWiki.compiling')}</span>
              </>
            ) : (
              <>
                <ExportIcon className="export-btn-icon" />
                <span>{t('exportWiki.startCompile')}</span>
              </>
            )}
          </button>
        </div>

        {exportResult && (
          <div className={`export-result ${exportResult.success ? 'success' : 'error'}`}>
            <div className="export-result-icon">{exportResult.success ? '✓' : '✕'}</div>
            <span>{exportResult.message}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExportWikiPanel
