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
  const draftsByNodeId = useProjectStore((s) => s.draftsByNodeId)
  const currentProject = useProjectStore((s) => s.currentProject)

  // 获取当前激活的文本内容
  const getCurrentText = useCallback(async (): Promise<string> => {
    const group = findGroupNode(editorTree, focusedGroupId)
    if (!group) return ''

    const activeTabId = group.activeTabId
    const activeTab = group.tabs.find((t) => t.id === activeTabId)
    if (!activeTab) return ''

    // 如果是文件类型tab，获取文件内容
    if (activeTab.type === 'file' && activeTab.nodeId) {
      // 先检查是否有草稿
      const draft = draftsByNodeId[activeTab.nodeId]
      if (typeof draft === 'string') {
        return draft
      }

      // 否则从文件读取
      if (currentProject) {
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

    // 其他类型的tab，尝试从DOM获取（针对编辑器内容）
    const editorTextarea = document.querySelector('.plain-text-editor-textarea') as HTMLTextAreaElement
    if (editorTextarea) {
      return editorTextarea.value
    }

    return ''
  }, [editorTree, focusedGroupId, draftsByNodeId, currentProject])

  // 执行校对检查
  const handleCheck = useCallback(async () => {
    const text = await getCurrentText()
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

    // 监听编辑器内容变化
    const handleInput = (e: Event): void => {
      const target = e.target as HTMLElement
      if (target.classList.contains('plain-text-editor-textarea')) {
        scheduleCheck()
      }
    }

    // 监听tab切换
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        void check()
      }
    }

    document.addEventListener('input', handleInput)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 初始检查
    void check()

    return () => {
      document.removeEventListener('input', handleInput)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [autoCheck, getCurrentText, checkText])

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
    <div className={`proofread-panel ${className}`}>
      {/* 工具栏 */}
      <div className="proofread-toolbar">
        <button
          className="proofread-btn"
          onClick={handleCheck}
          disabled={isChecking}
          title="立即检查"
        >
          {isChecking ? '⏳' : '🔍'} 检查
        </button>

        <label className="proofread-auto-check">
          <input
            type="checkbox"
            checked={autoCheck}
            onChange={(e) => setAutoCheck(e.target.checked)}
          />
          自动检查
        </label>

        {result && (
          <button
            className="proofread-btn proofread-clear"
            onClick={clearResult}
            title="清除结果"
          >
            ✕
          </button>
        )}
      </div>

      {/* 统计信息 */}
      {result && (
        <div className="proofread-stats">
          <div className="stat-item">
            <span className="stat-count error">{result.stats.errorCount}</span>
            <span className="stat-label">错误</span>
          </div>
          <div className="stat-item">
            <span className="stat-count warning">{result.stats.warningCount}</span>
            <span className="stat-label">警告</span>
          </div>
          <div className="stat-item">
            <span className="stat-count info">{result.stats.infoCount}</span>
            <span className="stat-label">提示</span>
          </div>
          <div className="stat-item total">
            <span className="stat-count">{result.stats.totalIssues}</span>
            <span className="stat-label">总计</span>
          </div>
        </div>
      )}

      {/* 检查结果列表 */}
      <div className="proofread-issues">
        {isChecking && !result && (
          <div className="proofread-empty">
            <div className="proofread-loading">正在检查...</div>
          </div>
        )}

        {!isChecking && !result && (
          <div className="proofread-empty">
            <div className="proofread-empty-icon">🔍</div>
            <div className="proofread-empty-text">点击"检查"按钮开始校对</div>
            {autoCheck && (
              <div className="proofread-empty-subtext">或输入文本自动检查</div>
            )}
          </div>
        )}

        {result && result.issues.length === 0 && (
          <div className="proofread-empty">
            <div className="proofread-empty-icon success">✅</div>
            <div className="proofread-empty-text">没有发现错误</div>
            <div className="proofread-empty-subtext">文本校对通过</div>
          </div>
        )}

        {result && result.issues.length > 0 && (
          <>
            {/* 错误 */}
            {groupedIssues.error?.length > 0 && (
              <div className="issue-group">
                <div className="issue-group-header error">
                  <span className="issue-group-icon">❌</span>
                  <span className="issue-group-title">错误 ({groupedIssues.error.length})</span>
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
              <div className="issue-group">
                <div className="issue-group-header warning">
                  <span className="issue-group-icon">⚠️</span>
                  <span className="issue-group-title">警告 ({groupedIssues.warning.length})</span>
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
              <div className="issue-group">
                <div className="issue-group-header info">
                  <span className="issue-group-icon">ℹ️</span>
                  <span className="issue-group-title">提示 ({groupedIssues.info.length})</span>
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
          </>
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
      className={`issue-item ${isSelected ? 'selected' : ''} ${getSeverityClass(issue.severity)}`}
      onClick={onClick}
    >
      <div className="issue-header">
        <span className="issue-icon">{getIssueIcon(issue.type)}</span>
        <span className="issue-type">{getIssueTypeLabel(issue.type)}</span>
        <span className={`issue-severity ${getSeverityClass(issue.severity)}`}>
          {getSeverityLabel(issue.severity)}
        </span>
        <span className="issue-location">
          第{issue.line}行
        </span>
      </div>
      <div className="issue-message">{issue.message}</div>
      {issue.suggestion && (
        <div className="issue-suggestion">
          <span className="suggestion-label">建议:</span>
          <span className="suggestion-text">{issue.suggestion}</span>
        </div>
      )}
    </div>
  )
}

export default ProofreadPanel
