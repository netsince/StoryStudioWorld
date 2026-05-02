import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../stores/projectStore'
import { useReadingOrderStore } from '../stores/readingOrderStore'
import { useEditorStore } from '../stores/editorStore'
import type { StoryNode } from '../models'

type ExportFormat = 'txt' | 'md' | 'pdf' | 'epub' | 'docx'
type ExportMode = 'single' | 'readingOrder'

interface ExportConfig {
  format: ExportFormat
  mode: ExportMode
  selectedNodeId: string | null
  fileName: string
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
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null)

  // 获取所有章节点（文件类型）
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

  // 处理导出
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
      // 确定默认文件名
      const defaultFileName = config.fileName || 
        (config.mode === 'single' 
          ? `${t('exportStory.chapter')}_${config.selectedNodeId}`
          : currentProject.projectName)

      // 调用导出 API
      const result = await window.api.exportStory({
        projectSettingsPath: currentProject.projectSettingsPath,
        format: config.format,
        mode: config.mode,
        nodeId: config.selectedNodeId,
        fileName: defaultFileName
      })

      if (result.success) {
        setExportResult({ success: true, message: t('exportStory.exportSuccess', { path: result.filePath }) })
      } else {
        setExportResult({ success: false, message: result.error || t('exportStory.exportFailed') })
      }
    } catch (error) {
      setExportResult({ success: false, message: String(error) })
    } finally {
      setIsExporting(false)
    }
  }

  // 跳转到阅读编排 Tab
  const handleGoToReadingOrder = (): void => {
    openReadingOrderTab()
  }

  if (!currentProject) {
    return (
      <div className="export-story-panel">
        <div className="export-story-empty">
          <div className="export-story-empty-icon">📤</div>
          <div className="export-story-empty-text">{t('exportStory.noProject')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="export-story-panel">
      <div className="export-story-header">
        <div className="export-story-title">{t('exportStory.title')}</div>
      </div>

      <div className="export-story-content">
        {/* 导出格式选择 */}
        <div className="export-section">
          <label className="export-label">{t('exportStory.format')}</label>
          <div className="export-format-grid">
            {(['txt', 'md', 'pdf', 'epub', 'docx'] as ExportFormat[]).map((format) => (
              <button
                key={format}
                className={`export-format-btn ${config.format === format ? 'active' : ''}`}
                onClick={() => setConfig((prev) => ({ ...prev, format }))}
              >
                <span className="export-format-icon">{getFormatIcon(format)}</span>
                <span className="export-format-name">{t(`exportStory.formats.${format}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 导出方式选择 */}
        <div className="export-section">
          <label className="export-label">{t('exportStory.mode')}</label>
          <div className="export-mode-options">
            <label className="export-mode-radio">
              <input
                type="radio"
                name="exportMode"
                value="single"
                checked={config.mode === 'single'}
                onChange={() => setConfig((prev) => ({ ...prev, mode: 'single', selectedNodeId: null }))}
              />
              <span className="radio-label">{t('exportStory.singleChapter')}</span>
            </label>
            <label className="export-mode-radio">
              <input
                type="radio"
                name="exportMode"
                value="readingOrder"
                checked={config.mode === 'readingOrder'}
                onChange={() => setConfig((prev) => ({ ...prev, mode: 'readingOrder' }))}
              />
              <span className="radio-label">{t('exportStory.readingOrderMode')}</span>
            </label>
          </div>
        </div>

        {/* 单章选择 */}
        {config.mode === 'single' && (
          <div className="export-section">
            <label className="export-label">{t('exportStory.selectChapter')}</label>
            <select
              className="export-select"
              value={config.selectedNodeId || ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, selectedNodeId: e.target.value || null }))}
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

        {/* 阅读编排模式提示 */}
        {config.mode === 'readingOrder' && (
          <div className="export-section">
            <div className="export-reading-order-info">
              <div className="export-info-text">
                {readingOrderItems.length > 0 ? (
                  <>
                    <p>{t('exportStory.willExportChapters', { count: readingOrderItems.length })}</p>
                    <ul className="export-chapter-list">
                      {readingOrderItems.slice(0, 5).map((item, index) => (
                        <li key={item.id}>{index + 1}. {item.title}</li>
                      ))}
                      {readingOrderItems.length > 5 && (
                        <li className="export-more">{t('exportStory.andMore', { count: readingOrderItems.length - 5 })}</li>
                      )}
                    </ul>
                  </>
                ) : (
                  <p className="export-warning">{t('exportStory.readingOrderEmpty')}</p>
                )}
              </div>
              <button className="export-goto-btn" onClick={handleGoToReadingOrder}>
                {t('exportStory.gotoReadingOrder')}
              </button>
            </div>
          </div>
        )}

        {/* 文件名 */}
        <div className="export-section">
          <label className="export-label">{t('exportStory.fileName')}</label>
          <input
            type="text"
            className="export-input"
            value={config.fileName}
            onChange={(e) => setConfig((prev) => ({ ...prev, fileName: e.target.value }))}
            placeholder={t('exportStory.fileNamePlaceholder')}
          />
        </div>

        {/* 导出按钮 */}
        <div className="export-section">
          <button
            className="export-btn-primary"
            onClick={handleExport}
            disabled={isExporting || (config.mode === 'single' && !config.selectedNodeId)}
          >
            {isExporting ? t('exportStory.exporting') : t('exportStory.startExport')}
          </button>
        </div>

        {/* 导出结果 */}
        {exportResult && (
          <div className={`export-result ${exportResult.success ? 'success' : 'error'}`}>
            {exportResult.message}
          </div>
        )}
      </div>
    </div>
  )
}

// 获取格式图标
function getFormatIcon(format: ExportFormat): string {
  const icons: Record<ExportFormat, string> = {
    txt: '📄',
    md: '📝',
    pdf: '📕',
    epub: '📚',
    docx: '📘'
  }
  return icons[format]
}

export default ExportStoryPanel