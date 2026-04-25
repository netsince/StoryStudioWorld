import React, { useEffect, useCallback } from 'react'
import { useProofreadStore } from '../stores/proofreadStore'
import { useEditorStore } from '../stores/editorStore'
import { useProjectStore } from '../stores/projectStore'
import type { ProofreadIssue } from '../services/proofreadService'
import { findGroupNode } from '../editor/editorTree'

interface ProofreadPanelProps {
  className?: string
}

// 获取问题类型图标
const getIssueIcon = (type: ProofreadIssue['type']): string => {
  switch (type) {
    case 'spelling':
      return '🔤'
    case 'grammar':
      return '📝'
    case 'style':
      return '✨'
    case 'duplicate':
      return '🔁'
    case 'punctuation':
      return '⌨️'
    default:
      return '⚠️'
  }
}

// 获取问题类型标签
const getIssueTypeLabel = (type: ProofreadIssue['type']): string => {
  switch (type) {
    case 'spelling':
      return '拼写'
    case 'grammar':
      return '语法'
    case 'style':
      return '风格'
    case 'duplicate':
      return '重复'
    case 'punctuation':
      return '标点'
    default:
      return '其他'
  }
}

// 获取严重程度样式
const getSeverityClass = (severity: ProofreadIssue['severity']): string => {
  switch (severity) {
    case 'error':
      return 'severity-error'
    case 'warning':
      return 'severity-warning'
    case 'info':
      return 'severity-info'
    default:
      return ''
  }
}

// 获取严重程度标签
const getSeverityLabel = (severity: ProofreadIssue['severity']): string => {
  switch (severity) {
    case 'error':
      return '错误'
    case 'warning':
      return '警告'
    case 'info':
      return '提示'
    default:
      return ''
  }
}

export const ProofreadPanel: React.FC<ProofreadPanelProps> = ({ className = '' }) => {
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

  // 获取当前激活的文本内容
  const getCurrentText = useCallback(async (isManual = false): Promise<string> => {
    if (!group || !activeTabId) return ''

    // 1. 优先从 DOM 获取（最实时的编辑器内容）
    const editorTextarea = document.querySelector(
      `.plain-text-editor-textarea[data-tab-id="${activeTabId}"]`
    ) as HTMLTextAreaElement
    if (editorTextarea) {
      return editorTextarea.value
    }

    const activeTab = group.tabs.find((t) => t.id === activeTabId)
    if (!activeTab) return ''

    // 2. 如果是文件类型tab，检查是否有草稿
    if (activeTab.type === 'file' && activeTab.nodeId) {
      const draft = draftsByNodeId[activeTab.nodeId]
      if (typeof draft === 'string') {
        return draft
      }

      // 3. 只有手动检查且没有草稿时，才尝试从文件读取
      if (isManual && currentProject) {
        try {
          const content = await window.api.readNodeContent(
            currentProject.projectSettingsPath,
            activeTab.nodeId
          )
          return content || ''
        } catch (error) {
          console.error('Failed to read node content:', error)
          return ''
        }
      }
    }

    return ''
  }, [group, activeTabId, draftsByNodeId, currentProject])

  // 执行校对检查
  const handleCheck = useCallback(async () => {
    const text = await getCurrentText(true) // 手动检查
    checkText(text)
  }, [getCurrentText, checkText])

  // 自动检查 - 监听编辑器变化
  useEffect(() => {
    if (!autoCheck) return

    let timeoutId: number | null = null

    const check = async (): Promise<void> => {
      const text = await getCurrentText()
      if (text) {
        checkText(text)
      } else {
        clearResult()
      }
    }

    // 延迟检查，避免频繁触发
    const scheduleCheck = (): void => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
      timeoutId = window.setTimeout(() => {
        void check()
      }, 1000)
    }

    // 监听输入事件
    const handleInput = (e: Event): void => {
      const target = e.target as HTMLElement
      // 确保是当前激活标签页的输入
      if (
        target.classList.contains('plain-text-editor-textarea') &&
        target.getAttribute('data-tab-id') === activeTabId
      ) {
        scheduleCheck()
      }
    }

    document.addEventListener('input', handleInput)

    // 当切换标签页或激活组时，立即检查一次
    // 注意：这里不需要防抖，因为切换操作不频繁
    void check()

    return () => {
      document.removeEventListener('input', handleInput)
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
    // 依赖项中移除 getCurrentText 以避免打字时频繁重置 Effect
    // 这样 handleInput 闭包里的 scheduleCheck 会在 1s 后执行当时的 check()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheck, checkText, clearResult, activeTabId, focusedGroupId])

  // 处理问题点击 - 跳转到对应位置
  const handleIssueClick = useCallback((issue: ProofreadIssue) => {
    selectIssue(issue.id)

    // 找到编辑器并定位到问题位置
    const editorTextarea = document.querySelector('.plain-text-editor-textarea') as HTMLTextAreaElement
    if (editorTextarea) {
      editorTextarea.focus()
      editorTextarea.setSelectionRange(issue.start, issue.end)

      // 计算滚动位置，使选中内容在视口中央
      const lineHeight = 20 // 估计的行高
      const lines = editorTextarea.value.substring(0, issue.start).split('\n').length
      const scrollTop = Math.max(0, (lines - 5) * lineHeight)
      editorTextarea.scrollTop = scrollTop
    }
  }, [selectIssue])

  // 按类型分组显示问题
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

  return (
    <div className="proofread-panel">
      {/* 工具栏 */}
      <div className="proofread-toolbar">
        <div className="proofread-actions">
          <button
            className="story-toolbar-btn"
            onClick={handleCheck}
            disabled={isChecking}
            title="手动检查"
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
            title="清空结果"
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

      {/* 统计信息 - 简化版 */}
      {result && (
        <div className="proofread-summary">
          <div className="summary-item">
            <span className="summary-dot error" />
            <span className="summary-count">{result.stats.errorCount} 错误</span>
          </div>
          <div className="summary-item">
            <span className="summary-dot warning" />
            <span className="summary-count">{result.stats.warningCount} 警告</span>
          </div>
          <div className="summary-item">
            <span className="summary-dot info" />
            <span className="summary-count">{result.stats.infoCount} 提示</span>
          </div>
        </div>
      )}

      {/* 设置栏 */}
      <div className="proofread-settings">
        <label className="proofread-checkbox">
          <input
            type="checkbox"
            checked={autoCheck}
            onChange={(e) => setAutoCheck(e.target.checked)}
          />
          <span>自动校对</span>
        </label>
      </div>

      {/* 检查结果列表 */}
      <div className="proofread-content">
        {isChecking && !result && (
          <div className="proofread-empty">
            <div className="loading-spinner" />
            <div className="proofread-empty-text">正在分析文本...</div>
          </div>
        )}

        {!isChecking && !result && (
          <div className="proofread-empty">
            <div className="proofread-empty-icon">🔍</div>
            <div className="proofread-empty-text">点击搜索图标或输入内容开始校对</div>
          </div>
        )}

        {result && result.issues.length === 0 && (
          <div className="proofread-empty">
            <div className="proofread-empty-icon success">✓</div>
            <div className="proofread-empty-text">未发现可优化的项目</div>
          </div>
        )}

        {result && result.issues.length > 0 && (
          <div className="proofread-list">
            {/* 错误 */}
            {groupedIssues.error?.length > 0 && (
              <div className="issue-section">
                <div className="issue-section-header">
                  <span>错误</span>
                  <span className="section-count">{groupedIssues.error.length}</span>
                </div>
                {groupedIssues.error.map((issue) => (
                  <IssueItem
                    key={issue.id}
                    issue={issue}
                    isSelected={selectedIssueId === issue.id}
                    onClick={() => handleIssueClick(issue)}
                  />
                ))}
              </div>
            )}

            {/* 警告 */}
            {groupedIssues.warning?.length > 0 && (
              <div className="issue-section">
                <div className="issue-section-header">
                  <span>警告</span>
                  <span className="section-count">{groupedIssues.warning.length}</span>
                </div>
                {groupedIssues.warning.map((issue) => (
                  <IssueItem
                    key={issue.id}
                    issue={issue}
                    isSelected={selectedIssueId === issue.id}
                    onClick={() => handleIssueClick(issue)}
                  />
                ))}
              </div>
            )}

            {/* 提示 */}
            {groupedIssues.info?.length > 0 && (
              <div className="issue-section">
                <div className="issue-section-header">
                  <span>提示</span>
                  <span className="section-count">{groupedIssues.info.length}</span>
                </div>
                {groupedIssues.info.map((issue) => (
                  <IssueItem
                    key={issue.id}
                    issue={issue}
                    isSelected={selectedIssueId === issue.id}
                    onClick={() => handleIssueClick(issue)}
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

// 单个问题项组件
interface IssueItemProps {
  issue: ProofreadIssue
  isSelected: boolean
  onClick: () => void
}

const IssueItem: React.FC<IssueItemProps> = ({ issue, isSelected, onClick }) => {
  return (
    <div
      className={`proofread-item ${isSelected ? 'selected' : ''} severity-${issue.severity}`}
      onClick={onClick}
    >
      <div className="item-main">
        <div className="item-header">
          <span className="item-type">{getIssueTypeLabel(issue.type)}</span>
          <span className="item-line">L{issue.line}</span>
        </div>
        <div className="item-message">{issue.message}</div>
        {issue.suggestion && (
          <div className="item-suggestion">
            <span className="suggestion-label">建议:</span>
            <span className="suggestion-text">{issue.suggestion}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProofreadPanel
