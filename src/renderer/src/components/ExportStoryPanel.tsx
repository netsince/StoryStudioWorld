import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../stores/projectStore'
import { useReadingOrderStore } from '../stores/readingOrderStore'
import { useEditorStore } from '../stores/editorStore'
import type { StoryNode } from '../models'
import { InputBox } from './ui/InputBox'

type ExportFormat = 'txt' | 'md' | 'pdf' | 'epub' | 'docx'
type ExportMode = 'single' | 'readingOrder'

interface ExportConfig {
  format: ExportFormat
  mode: ExportMode
  selectedNodeId: string | null
  fileName: string
}

// SVG Icons
const FileTextIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

const MarkdownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M8 12h8" />
    <path d="M8 16h8" />
    <path d="M12 12v8" />
  </svg>
)

const PdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M9 13l6 0" />
    <path d="M9 17l6 0" />
    <path d="M9 9h1" />
  </svg>
)

const EpubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <path d="M12 6v7" />
    <path d="M9 8l3-2 3 2" />
  </svg>
)

const DocxIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M8 12h.01" />
    <path d="M12 12h.01" />
    <path d="M16 12h.01" />
    <path d="M8 16h.01" />
    <path d="M12 16h.01" />
    <path d="M16 16h.01" />
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

const ArrowRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

const formatIcons: Record<ExportFormat, React.FC<{ className?: string }>> = {
  txt: FileTextIcon,
  md: MarkdownIcon,
  pdf: PdfIcon,
  epub: EpubIcon,
  docx: DocxIcon
}

const ExportStoryPanel: React.FC = () => {
  const { t } = useTranslation()
  const currentProject = useProjectStore((s) => s.currentProject)
  const storyNodes = useProjectStore((s) => s.storyNodes)
  const readingOrderItems = useReadingOrderStore((s) => s.items)
  const openReadingOrderTab = useEditorStore((s) => s.openReadingOrderTab)

  const [config, setConfig] = useState<ExportConfig>({
    format: 'txt',
    mode: 'single',
    selectedNodeId: null,
    fileName: ''
  })
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(
    null
  )

  const getChapterNodes = useCallback((): StoryNode[] => {
    const chapters: StoryNode[] = []
    const traverse = (nodes: StoryNode[]): void => {
      nodes.forEach((node) => {
        if (node.type === 'file' && node.kind === 'story') {
          chapters.push(node)
        }
        if (node.children) {
          traverse(node.children)
        }
      })
    }
    traverse(storyNodes)
    return chapters
  }, [storyNodes])

  const chapterNodes = getChapterNodes()

  const handleExport = async (): Promise<void> => {
    if (!currentProject) return

    if (config.mode === 'single' && !config.selectedNodeId) {
      setExportResult({ success: false, message: t('exportStory.selectChapterFirst') })
      return
    }

    if (config.mode === 'readingOrder' && readingOrderItems.length === 0) {
      setExportResult({ success: false, message: t('exportStory.readingOrderEmpty') })
      return
    }

    setIsExporting(true)
    setExportResult(null)

    try {
      const selectedNode =
        config.mode === 'single' ? chapterNodes.find((n) => n.id === config.selectedNodeId) : null
      const chapterName = selectedNode?.name || ''

      const defaultFileName =
        config.fileName ||
        (config.mode === 'single' && chapterName ? chapterName : currentProject.projectName)

      const result = await window.api.exportStory({
        projectSettingsPath: currentProject.projectSettingsPath,
        format: config.format,
        mode: config.mode,
        nodeId: config.selectedNodeId,
        nodeName: chapterName,
        fileName: defaultFileName
      })

      if (result.success) {
        setExportResult({
          success: true,
          message: t('exportStory.exportSuccess', { path: result.filePath })
        })
      } else {
        setExportResult({ success: false, message: result.error || t('exportStory.exportFailed') })
      }
    } catch (error) {
      setExportResult({ success: false, message: String(error) })
    } finally {
      setIsExporting(false)
    }
  }

  const handleGoToReadingOrder = (): void => {
    openReadingOrderTab()
  }

  if (!currentProject) {
    return (
      <div className="export-story-panel">
        <div className="export-story-empty">
          <ExportIcon className="export-empty-icon" />
          <div className="export-empty-text">{t('exportStory.noProject')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="export-story-panel">
      <div className="export-story-header">
        <div className="export-header-title">
          <ExportIcon className="export-header-icon" />
          <span>{t('exportStory.title')}</span>
        </div>
      </div>

      <div className="export-story-content">
        {/* Format Selection */}
        <div className="export-section">
          <label className="export-label">{t('exportStory.format')}</label>
          <div className="export-format-selector">
            {(['txt', 'md', 'pdf', 'epub', 'docx'] as ExportFormat[]).map((format) => {
              const Icon = formatIcons[format]
              return (
                <button
                  key={format}
                  className={`export-format-option ${config.format === format ? 'active' : ''}`}
                  onClick={() => setConfig((prev) => ({ ...prev, format }))}
                >
                  <Icon className="export-format-icon" />
                  <span className="export-format-name">{t(`exportStory.formats.${format}`)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Export Mode */}
        <div className="export-section">
          <label className="export-label">{t('exportStory.mode')}</label>
          <div className="export-mode-selector">
            <button
              className={`export-mode-option ${config.mode === 'single' ? 'active' : ''}`}
              onClick={() =>
                setConfig((prev) => ({ ...prev, mode: 'single', selectedNodeId: null }))
              }
            >
              <div className="export-mode-radio">
                <div className={`radio-indicator ${config.mode === 'single' ? 'active' : ''}`} />
              </div>
              <span>{t('exportStory.singleChapter')}</span>
            </button>
            <button
              className={`export-mode-option ${config.mode === 'readingOrder' ? 'active' : ''}`}
              onClick={() => setConfig((prev) => ({ ...prev, mode: 'readingOrder' }))}
            >
              <div className="export-mode-radio">
                <div
                  className={`radio-indicator ${config.mode === 'readingOrder' ? 'active' : ''}`}
                />
              </div>
              <span>{t('exportStory.readingOrderMode')}</span>
            </button>
          </div>
        </div>

        {/* Chapter Selection */}
        {config.mode === 'single' && (
          <div className="export-section">
            <label className="export-label">{t('exportStory.selectChapter')}</label>
            <select
              className="export-select"
              value={config.selectedNodeId || ''}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, selectedNodeId: e.target.value || null }))
              }
            >
              <option value="">{t('exportStory.pleaseSelect')}</option>
              {chapterNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reading Order Info */}
        {config.mode === 'readingOrder' && (
          <div className="export-section">
            <label className="export-label">{t('exportStory.readingOrder')}</label>
            <div className="export-info-box">
              {readingOrderItems.length > 0 ? (
                <div className="export-info-stats">
                  <span className="export-stats-number">{readingOrderItems.length}</span>
                  <span className="export-stats-label">{t('exportStory.chaptersToExport')}</span>
                </div>
              ) : (
                <div className="export-info-warning">{t('exportStory.readingOrderEmpty')}</div>
              )}
              <button className="export-link-btn" onClick={handleGoToReadingOrder}>
                <span>{t('exportStory.gotoReadingOrder')}</span>
                <ArrowRightIcon className="export-link-icon" />
              </button>
            </div>
          </div>
        )}

        {/* Filename */}
        <div className="export-section">
          <label className="export-label">{t('exportStory.fileName')}</label>
          <div className="export-input-wrapper">
            <InputBox
              value={config.fileName}
              onChange={(value) => setConfig((prev) => ({ ...prev, fileName: value }))}
              placeholder={t('exportStory.fileNamePlaceholder')}
              className="export-input"
            />
            <span className="export-file-ext">.{config.format}</span>
          </div>
        </div>

        {/* Export Button */}
        <div className="export-section export-actions">
          <button
            className="export-btn-primary"
            onClick={handleExport}
            disabled={isExporting || (config.mode === 'single' && !config.selectedNodeId)}
          >
            {isExporting ? (
              <>
                <span className="export-spinner" />
                <span>{t('exportStory.exporting')}</span>
              </>
            ) : (
              <>
                <ExportIcon className="export-btn-icon" />
                <span>{t('exportStory.startExport')}</span>
              </>
            )}
          </button>
        </div>

        {/* Export Result */}
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

export default ExportStoryPanel
