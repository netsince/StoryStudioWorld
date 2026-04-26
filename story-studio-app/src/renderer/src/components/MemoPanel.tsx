import React, { useEffect, useRef, useState } from 'react'
import { useMemoStore } from '../stores/memoStore'
import type { Memo } from '../../../main/memo'

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 小于1小时
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return minutes < 1 ? '刚刚' : `${minutes}分钟前`
  }
  // 小于24小时
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  }
  // 小于7天
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days}天前`
  }
  
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const MemoItem: React.FC<{
  memo: Memo
  isEditing: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  onUpdate: (content: string) => void
  onDelete: () => void
}> = ({ memo, isEditing, onStartEdit, onStopEdit, onUpdate, onDelete }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [editContent, setEditContent] = useState(memo.content)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleSave = (): void => {
    onUpdate(editContent.trim())
  }

  const handleCancel = (): void => {
    setEditContent(memo.content)
    onStopEdit()
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="memo-item editing">
        <textarea
          ref={textareaRef}
          className="memo-edit-textarea"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
        />
        <div className="memo-edit-actions">
          <button
            className="memo-edit-btn memo-edit-btn-save"
            onClick={handleSave}
            title="保存 (Ctrl+Enter)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            保存
          </button>
          <button
            className="memo-edit-btn memo-edit-btn-cancel"
            onClick={handleCancel}
            title="取消 (ESC)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            取消
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="memo-item"
      onDoubleClick={onStartEdit}
      title="双击编辑"
    >
      <div className="memo-content">{memo.content || <span className="memo-empty">点击或双击编辑便签...</span>}</div>
      <div className="memo-footer">
        <span className="memo-time">{formatDate(memo.updatedAt)}</span>
        <button 
          className="memo-delete-btn"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          title="删除"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  )
}

const MemoPanel: React.FC = () => {
  const memos = useMemoStore((s) => s.memos)
  const editingId = useMemoStore((s) => s.editingId)
  const isLoading = useMemoStore((s) => s.isLoading)
  const loadMemos = useMemoStore((s) => s.loadMemos)
  const createMemo = useMemoStore((s) => s.createMemo)
  const updateMemo = useMemoStore((s) => s.updateMemo)
  const deleteMemo = useMemoStore((s) => s.deleteMemo)
  const startEditing = useMemoStore((s) => s.startEditing)
  const stopEditing = useMemoStore((s) => s.stopEditing)

  useEffect(() => {
    void loadMemos()
  }, [loadMemos])

  return (
    <div className="memo-panel">
      {/* 工具栏 */}
      <div className="memo-toolbar">
        <div className="memo-toolbar-actions">
          <button
            className="story-toolbar-btn"
            onClick={() => void createMemo()}
            title="新建便签"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* 便签列表 */}
      <div className="memo-list">
        {isLoading && memos.length === 0 && (
          <div className="memo-empty-state">
            <div className="loading-spinner" />
            <span>加载中...</span>
          </div>
        )}

        {!isLoading && memos.length === 0 && (
          <div className="memo-empty-state">
            <div className="memo-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div className="memo-empty-text">暂无便签</div>
            <div className="memo-empty-subtext">点击上方 + 按钮创建新便签</div>
          </div>
        )}

        {memos.map((memo) => (
          <MemoItem
            key={memo.id}
            memo={memo}
            isEditing={editingId === memo.id}
            onStartEdit={() => startEditing(memo.id)}
            onStopEdit={stopEditing}
            onUpdate={(content) => void updateMemo(memo.id, content)}
            onDelete={() => void deleteMemo(memo.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default MemoPanel
