import React, { useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useProofreadStore } from '../stores/proofreadStore'
import { useEditorStore } from '../stores/editorStore'
import { useProjectStore } from '../stores/projectStore'
import type { ProofreadIssue } from '../services/proofreadService'
import { findGroupNode } from '../editor/editorTree'

interface ProofreadPanelProps {
  className?: string
}

export const ProofreadPanel: React.FC<ProofreadPanelProps> = ({ className: _className = '' }) => {
  const { t } = useTranslation()
  const result = useProofreadStore((s) => s.result)
  const isChecking = useProofreadStore((s) => s.isChecking)
  const selectedIssueId = useProofreadStore((s) => s.selectedIssueId)
  const autoCheck = useProofreadStore((s) => s.autoCheck)
  const checkText = useProofreadStore((s) => s.checkText)
  const selectIssue = useProofreadStore((s) => s.selectIssue)
  const setAutoCheck = useProofreadStore((s) => s.setAutoCheck)
  const clearResult = useProofreadStore((s) => s.clearResult)

  const editorTree = useEditorStore((s) => s.editorTree)
  const focusedGroupId = useEditorStore((s) => s.focusedGroupId)
  const group = React.useMemo(() => findGroupNode(editorTree, focusedGroupId), [editorTree, focusedGroupId])
  const activeTabId = group?.activeTabId
  const draftsByNodeId = useProjectStore((s) => s.draftsByNodeId)
  const currentProject = useProjectStore((s) => s.currentProject)

  const getCurrentText = useCallback(async (isManual = false): Promise<string> => {
    if (!group || !activeTabId) return ''

    const editorTextarea = document.querySelector(
      `.plain-text-editor-textarea[data-tab-id="${activeTabId}"]`
    ) as HTMLTextAreaElement

    if (editorTextarea?.value) {
      return editorTextarea.value
    }

    const activeTab = group.tabs.find((tab) => tab.id === activeTabId)
    if (activeTab?.nodeId) {
      const draft = draftsByNodeId[activeTab.nodeId]
      if (typeof draft === 'string') {
        return draft
      }

      if (isManual && currentProject) {
        try {
          const content = await window.api.readNodeContent(
            currentProject.projectSettingsPath,
            activeTab.nodeId
          )
          return content || ''
        } catch {
          return ''
        }
      }
    }

    return ''
  }, [group, activeTabId, draftsByNodeId, currentProject])

  const handleCheck = useCallback(async () => {
    const text = await getCurrentText(true)
    if (text) {
      checkText(text)
    }
  }, [getCurrentText, checkText])

  useEffect(() => {
    if (!autoCheck) return

    let checkTimeout: ReturnType<typeof setTimeout> | null = null

    const scheduleCheck = (): void => {
      if (checkTimeout) {
        clearTimeout(checkTimeout)
      }
      checkTimeout = setTimeout(() => {
        void (async () => {
          const text = await getCurrentText(false)
          if (text) {
            checkText(text)
          }
        })()
      }, 1000)
    }

    const handleInput = (e: Event): void => {
      const target = e.target as HTMLElement
      if (target.classList.contains('plain-text-editor-textarea')) {
        const textareaTabId = target.getAttribute('data-tab-id')
        if (textareaTabId === activeTabId) {
          scheduleCheck()
        }
      }
    }

    document.addEventListener('input', handleInput)

    return () => {
      document.removeEventListener('input', handleInput)
      if (checkTimeout) {
        clearTimeout(checkTimeout)
      }
    }
  }, [autoCheck, activeTabId, getCurrentText, checkText])

  useEffect(() => {
    if (!autoCheck || !activeTabId) return

    void (async () => {
      const text = await getCurrentText(false)
      if (text) {
        checkText(text)
      }
    })()
  }, [activeTabId, autoCheck, getCurrentText, checkText])

  const handleIssueClick = useCallback((issue: ProofreadIssue) => {
    selectIssue(issue.id)

    const editorTextarea = document.querySelector(
      `.plain-text-editor-textarea[data-tab-id="${activeTabId}"]`
    ) as HTMLTextAreaElement

    if (editorTextarea) {
      editorTextarea.focus()
      editorTextarea.setSelectionRange(issue.start, issue.end)

      const lineHeight = 20
      const lines = editorTextarea.value.substring(0, issue.start).split('\n').length
      const scrollTop = Math.max(0, (lines - 5) * lineHeight)
      editorTextarea.scrollTop = scrollTop
    }
  }, [selectIssue, activeTabId])

  const groupedIssues = React.useMemo(() => {
    if (!result?.issues.length) return {}

    const groups: Record<string, ProofreadIssue[]> = {
      error: [],
      warning: [],
      info: []
    }

    result.issues.forEach((issue) => {
      groups[issue.severity].push(issue)
    })

    return groups
  }, [result])

  const getIssueTypeLabel = (type: ProofreadIssue['type']): string => {
    return t(`proofread.type.${type}`, type)
  }

  return (
    <div className="proofread-panel">
      <div className="proofread-toolbar">
        <div className="proofread-actions">
          <button
            className="story-toolbar-btn"
            onClick={handleCheck}
            disabled={isChecking}
            title={t('proofread.manualCheck')}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
          <button
            className="story-toolbar-btn"
            onClick={clearResult}
            disabled={!result}
            title={t('proofread.clearResults')}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>

      {result && (
        <div className="proofread-summary">
          <div className="summary-item">
            <span className="summary-dot error" />
            <span className="summary-count">{result.stats.errorCount} {t('proofread.severity.error')}</span>
          </div>
          <div className="summary-item">
            <span className="summary-dot warning" />
            <span className="summary-count">{result.stats.warningCount} {t('proofread.severity.warning')}</span>
          </div>
          <div className="summary-item">
            <span className="summary-dot info" />
            <span className="summary-count">{result.stats.infoCount} {t('proofread.severity.info')}</span>
          </div>
        </div>
      )}

      <div className="proofread-settings">
        <label className="proofread-checkbox">
          <input
            type="checkbox"
            checked={autoCheck}
            onChange={(e) => setAutoCheck(e.target.checked)}
          />
          <span>{t('proofread.autoProofread')}</span>
        </label>
      </div>

      <div className="proofread-content">
        {isChecking && !result && (
          <div className="proofread-empty">
            <div className="loading-spinner" />
            <div className="proofread-empty-text">{t('proofread.analyzing')}</div>
          </div>
        )}

        {!isChecking && !result && (
          <div className="proofread-empty">
            <div className="proofread-empty-icon">🔍</div>
            <div className="proofread-empty-text">{t('proofread.clickToStart')}</div>
          </div>
        )}

        {result && result.issues.length === 0 && (
          <div className="proofread-empty">
            <div className="proofread-empty-icon success">✓</div>
            <div className="proofread-empty-text">{t('proofread.noOptimizations')}</div>
          </div>
        )}

        {result && result.issues.length > 0 && (
          <div className="proofread-list">
            {groupedIssues.error?.length > 0 && (
              <div className="issue-section">
                <div className="issue-section-header">
                  <span>{t('proofread.severity.error')}</span>
                  <span className="section-count">{groupedIssues.error.length}</span>
                </div>
                {groupedIssues.error.map((issue) => (
                  <IssueItem
                    key={issue.id}
                    issue={issue}
                    isSelected={selectedIssueId === issue.id}
                    onClick={() => handleIssueClick(issue)}
                    getTypeLabel={getIssueTypeLabel}
                  />
                ))}
              </div>
            )}

            {groupedIssues.warning?.length > 0 && (
              <div className="issue-section">
                <div className="issue-section-header">
                  <span>{t('proofread.severity.warning')}</span>
                  <span className="section-count">{groupedIssues.warning.length}</span>
                </div>
                {groupedIssues.warning.map((issue) => (
                  <IssueItem
                    key={issue.id}
                    issue={issue}
                    isSelected={selectedIssueId === issue.id}
                    onClick={() => handleIssueClick(issue)}
                    getTypeLabel={getIssueTypeLabel}
                  />
                ))}
              </div>
            )}

            {groupedIssues.info?.length > 0 && (
              <div className="issue-section">
                <div className="issue-section-header">
                  <span>{t('proofread.severity.info')}</span>
                  <span className="section-count">{groupedIssues.info.length}</span>
                </div>
                {groupedIssues.info.map((issue) => (
                  <IssueItem
                    key={issue.id}
                    issue={issue}
                    isSelected={selectedIssueId === issue.id}
                    onClick={() => handleIssueClick(issue)}
                    getTypeLabel={getIssueTypeLabel}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface IssueItemProps {
  issue: ProofreadIssue
  isSelected: boolean
  onClick: () => void
  getTypeLabel: (type: ProofreadIssue['type']) => string
}

const IssueItem: React.FC<IssueItemProps> = ({ issue, isSelected, onClick, getTypeLabel }) => {
  const { t } = useTranslation()
  
  return (
    <div
      className={`proofread-item ${isSelected ? 'selected' : ''} severity-${issue.severity}`}
      onClick={onClick}
    >
      <div className="item-main">
        <div className="item-header">
          <span className="item-type">{getTypeLabel(issue.type)}</span>
          <span className="item-line">L{issue.line}</span>
        </div>
        <div className="item-message">{issue.message}</div>
        {issue.suggestion && (
          <div className="item-suggestion">
            <span className="suggestion-label">{t('proofread.suggestion')}:</span>
            <span className="suggestion-text">{issue.suggestion}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProofreadPanel
