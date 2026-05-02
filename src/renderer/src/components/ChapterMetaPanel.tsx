import React, { useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '../stores/editorStore'
import { useProjectStore } from '../stores/projectStore'
import { useChapterMetaStore, scheduleSave, clearSaveTimer } from '../stores/chapterMetaStore'
import { findGroupNode } from '../editor/editorTree'
import PlainTextEditor from './PlainTextEditor'

type MetaTab = 'summary' | 'outline'

const ChapterMetaPanel: React.FC = () => {
  const { t } = useTranslation()
  
  // 从 editorStore 获取当前焦点组
  const editorTree = useEditorStore((s) => s.editorTree)
  const focusedGroupId = useEditorStore((s) => s.focusedGroupId)
  
  // 从 projectStore 获取项目信息
  const currentProject = useProjectStore((s) => s.currentProject)
  
  // 从 chapterMetaStore 获取状态和操作
  const summary = useChapterMetaStore((s) => s.summary)
  const outline = useChapterMetaStore((s) => s.outline)
  const isLoading = useChapterMetaStore((s) => s.isLoading)
  const currentNodeId = useChapterMetaStore((s) => s.currentNodeId)
  const loadChapterMeta = useChapterMetaStore((s) => s.loadChapterMeta)
  const saveChapterMeta = useChapterMetaStore((s) => s.saveChapterMeta)
  const setSummary = useChapterMetaStore((s) => s.setSummary)
  const setOutline = useChapterMetaStore((s) => s.setOutline)
  const clearCurrentChapter = useChapterMetaStore((s) => s.clearCurrentChapter)

  const [activeTab, setActiveTab] = React.useState<MetaTab>('summary')

  // 获取当前焦点组的活跃标签页
  const activeTabInfo = useMemo(() => {
    const group = findGroupNode(editorTree, focusedGroupId)
    if (!group || group.kind !== 'group') return null
    
    const activeTab = group.tabs.find((t) => t.id === group.activeTabId)
    return activeTab || null
  }, [editorTree, focusedGroupId])

  const activeNodeId = activeTabInfo?.nodeId

  // 加载章节元数据
  useEffect(() => {
    if (!currentProject) {
      clearCurrentChapter()
      return
    }

    if (!activeNodeId) {
      clearCurrentChapter()
      return
    }

    // 使用 store 加载数据
    void loadChapterMeta(currentProject.projectSettingsPath, activeNodeId)
  }, [activeNodeId, currentProject, loadChapterMeta, clearCurrentChapter])

  // 清理定时器
  useEffect(() => {
    return () => {
      clearSaveTimer()
    }
  }, [])

  // 页面关闭前保存
  useEffect(() => {
    const handleBeforeUnload = (): void => {
      if (currentProject && currentNodeId) {
        clearSaveTimer()
        void saveChapterMeta(currentProject.projectSettingsPath)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [currentProject, currentNodeId, saveChapterMeta])

  // 手动保存（Ctrl+S）
  const handleSave = useCallback(async (): Promise<void> => {
    if (!currentProject) return
    await saveChapterMeta(currentProject.projectSettingsPath)
  }, [currentProject, saveChapterMeta])

  // 处理简概变化
  const handleSummaryChange = useCallback((value: string): void => {
    setSummary(value)
    
    // 触发防抖保存
    if (currentProject && currentNodeId) {
      scheduleSave(
        currentProject.projectSettingsPath,
        currentNodeId,
        value,
        outline
      )
    }
  }, [currentProject, currentNodeId, outline, setSummary])

  // 处理章纲变化
  const handleOutlineChange = useCallback((value: string): void => {
    setOutline(value)
    
    // 触发防抖保存
    if (currentProject && currentNodeId) {
      scheduleSave(
        currentProject.projectSettingsPath,
        currentNodeId,
        summary,
        value
      )
    }
  }, [currentProject, currentNodeId, summary, setOutline])

  // 切换 Tab 时保存
  const handleTabSwitch = useCallback((tab: MetaTab): void => {
    if (tab === activeTab) return
    
    // 立即保存当前内容
    if (currentProject && currentNodeId) {
      clearSaveTimer()
      void saveChapterMeta(currentProject.projectSettingsPath)
    }
    
    setActiveTab(tab)
  }, [activeTab, currentProject, currentNodeId, saveChapterMeta])

  const chapterName = activeTabInfo?.title || t('panel.chapterMeta.noChapter')

  if (!activeNodeId) {
    return (
      <div className="chapter-meta-panel">
        <div className="chapter-meta-empty">
          <div className="chapter-meta-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div className="chapter-meta-empty-text">{t('panel.chapterMeta.noChapter')}</div>
          <div className="chapter-meta-empty-subtext">{t('panel.chapterMeta.openChapterHint')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="chapter-meta-panel">
      <div className="chapter-meta-header">
        <div className="chapter-meta-title">{chapterName}</div>
      </div>

      <div className="chapter-meta-tabs">
        <div
          className={`chapter-meta-tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('summary')}
        >
          {t('panel.chapterMeta.summary')}
        </div>
        <div
          className={`chapter-meta-tab ${activeTab === 'outline' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('outline')}
        >
          {t('panel.chapterMeta.outline')}
        </div>
      </div>

      <div className="chapter-meta-editor-container">
        {!isLoading && (
          activeTab === 'summary' ? (
            <PlainTextEditor
              content={summary}
              onChange={handleSummaryChange}
              onSave={handleSave}
              placeholder={t('panel.chapterMeta.summaryPlaceholder')}
              isActive={true}
            />
          ) : (
            <PlainTextEditor
              content={outline}
              onChange={handleOutlineChange}
              onSave={handleSave}
              placeholder={t('panel.chapterMeta.outlinePlaceholder')}
              isActive={true}
            />
          )
        )}
      </div>
    </div>
  )
}

export default ChapterMetaPanel
