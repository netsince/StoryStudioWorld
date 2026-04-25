import React, { useEffect, useState } from 'react'
import { useSnapshotStore } from '../stores/snapshotStore'
import { useProjectStore } from '../stores/projectStore'
import type { Snapshot, DiffResult, DiffNode } from '../../../main/snapshot'
import ConfirmModal from './ConfirmModal'

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const CreateSnapshotModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, description: string) => void
}> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (name.trim()) {
      onCreate(name.trim(), description.trim())
      setName('')
      setDescription('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="ssw-modal-overlay" onClick={onClose}>
      <div className="ssw-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ssw-modal-title">保存快照</div>
        <form onSubmit={handleSubmit}>
          <div className="snapshot-form-body">
            <div className="snapshot-form-field">
              <input
                className="ssw-modal-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="快照名称（例如：第一章完成）"
                autoFocus
              />
            </div>
            <div className="snapshot-form-field" style={{ marginTop: '12px' }}>
              <textarea
                className="ssw-modal-input"
                style={{ resize: 'none', height: '80px' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述这次变更的内容（可选）..."
              />
            </div>
          </div>
          <div className="ssw-modal-actions">
            <button type="button" className="action-button secondary inline-button" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              className="action-button inline-button"
              disabled={!name.trim()}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const DiffView: React.FC<{
  diff: DiffResult
  onBack: () => void
}> = ({ diff, onBack }) => {
  const totalChanges =
    diff.story.added.length + diff.story.modified.length + diff.story.deleted.length +
    diff.setting.added.length + diff.setting.modified.length + diff.setting.deleted.length

  const renderDiffNode = (node: DiffNode, type: 'added' | 'modified' | 'deleted'): JSX.Element => {
    const className = `diff-node ${type}`
    const icon = node.type === 'folder' ? (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
    ) : (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
    )

    return (
      <div key={node.id} className={className}>
        <div className="diff-node-main">
          <span className="diff-node-icon">{icon}</span>
          <div className="diff-node-info">
            <span className="diff-node-name" title={node.name}>{node.name}</span>
            {node.path && <span className="diff-node-path" title={node.path}>{node.path}</span>}
          </div>
        </div>
        <div className="diff-node-meta">
          <span className={`diff-tag ${type}`}>{
            type === 'added' ? '新增' :
            type === 'modified' ? '修改' : '删除'
          }</span>
        </div>
      </div>
    )
  }

  return (
    <div className="snapshot-diff">
      <div className="snapshot-diff-header">
        <button className="snapshot-btn icon-btn" onClick={onBack} title="返回列表">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span className="snapshot-diff-title">变更对比</span>
      </div>

      <div className="snapshot-diff-stats">
        <div className="stat-item added">
          <span className="stat-value">{diff.story.added.length + diff.setting.added.length}</span>
          <span className="stat-label">新增</span>
        </div>
        <div className="stat-item modified">
          <span className="stat-value">{diff.story.modified.length + diff.setting.modified.length}</span>
          <span className="stat-label">修改</span>
        </div>
        <div className="stat-item deleted">
          <span className="stat-value">{diff.story.deleted.length + diff.setting.deleted.length}</span>
          <span className="stat-label">删除</span>
        </div>
      </div>

      <div className="snapshot-diff-content">
        {/* Story Nodes */}
        {(diff.story.added.length > 0 || diff.story.modified.length > 0 || diff.story.deleted.length > 0) && (
          <div className="diff-section">
            <div className="diff-section-title">
              <svg width="12" height="12" style={{ marginRight: '6px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              编写节点
            </div>
            {diff.story.added.length > 0 && (
              <div className="diff-group">
                <div className="diff-group-title">新增</div>
                {diff.story.added.map(node => renderDiffNode(node, 'added'))}
              </div>
            )}
            {diff.story.modified.length > 0 && (
              <div className="diff-group">
                <div className="diff-group-title">修改</div>
                {diff.story.modified.map(node => renderDiffNode(node, 'modified'))}
              </div>
            )}
            {diff.story.deleted.length > 0 && (
              <div className="diff-group">
                <div className="diff-group-title">删除</div>
                {diff.story.deleted.map(node => renderDiffNode(node, 'deleted'))}
              </div>
            )}
          </div>
        )}

        {/* Setting Nodes */}
        {(diff.setting.added.length > 0 || diff.setting.modified.length > 0 || diff.setting.deleted.length > 0) && (
          <div className="diff-section">
            <div className="diff-section-title">
              <svg width="12" height="12" style={{ marginRight: '6px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              设定节点
            </div>
            {diff.setting.added.length > 0 && (
              <div className="diff-group">
                <div className="diff-group-title">新增</div>
                {diff.setting.added.map(node => renderDiffNode(node, 'added'))}
              </div>
            )}
            {diff.setting.modified.length > 0 && (
              <div className="diff-group">
                <div className="diff-group-title">修改</div>
                {diff.setting.modified.map(node => renderDiffNode(node, 'modified'))}
              </div>
            )}
            {diff.setting.deleted.length > 0 && (
              <div className="diff-group">
                <div className="diff-group-title">删除</div>
                {diff.setting.deleted.map(node => renderDiffNode(node, 'deleted'))}
              </div>
            )}
          </div>
        )}

        {totalChanges === 0 && (
          <div className="diff-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>未发现任何变更</span>
          </div>
        )}
      </div>
    </div>
  )
}

const SnapshotItem: React.FC<{
  snapshot: Snapshot
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onCompare: () => void
  onRestore: () => void
}> = ({ snapshot, isSelected, onSelect, onDelete, onCompare, onRestore }) => {
  return (
    <div
      className={`snapshot-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="snapshot-item-header">
        <span className="snapshot-name">{snapshot.name}</span>
        <span className="snapshot-time">{formatTime(snapshot.createdAt)}</span>
      </div>
      {snapshot.description && (
        <div className="snapshot-description">{snapshot.description}</div>
      )}
      <div className="snapshot-stats">
        <span className="snapshot-stat" title={`包含 ${snapshot.nodeCount} 个节点`}>
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
          {snapshot.nodeCount}
        </span>
        {snapshot.storyCount > 0 && (
          <span className="snapshot-stat" title={`包含 ${snapshot.storyCount} 个编写节点`}>
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            {snapshot.storyCount}
          </span>
        )}
        {snapshot.settingCount > 0 && (
          <span className="snapshot-stat" title={`包含 ${snapshot.settingCount} 个设定节点`}>
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            {snapshot.settingCount}
          </span>
        )}
      </div>
      <div className="snapshot-actions">
        <button className="snapshot-btn primary small" onClick={(e) => { e.stopPropagation(); onCompare() }}>
          对比
        </button>
        <button className="snapshot-btn small" onClick={(e) => { e.stopPropagation(); onRestore() }}>
          恢复
        </button>
        <button className="snapshot-btn small danger" onClick={(e) => { e.stopPropagation(); onDelete() }}>
          删除
        </button>
      </div>
    </div>
  )
}

const SnapshotPanel: React.FC = () => {
  const currentProject = useProjectStore((s) => s.currentProject)

  const snapshots = useSnapshotStore((s) => s.snapshots)
  const isLoading = useSnapshotStore((s) => s.isLoading)
  const selectedSnapshotId = useSnapshotStore((s) => s.selectedSnapshotId)
  const currentDiff = useSnapshotStore((s) => s.currentDiff)
  const isCreateModalOpen = useSnapshotStore((s) => s.isCreateModalOpen)

  const loadSnapshots = useSnapshotStore((s) => s.loadSnapshots)
  const createSnapshot = useSnapshotStore((s) => s.createSnapshot)
  const deleteSnapshot = useSnapshotStore((s) => s.deleteSnapshot)
  const restoreSnapshot = useSnapshotStore((s) => s.restoreSnapshot)
  const compareWithCurrent = useSnapshotStore((s) => s.compareWithCurrent)
  const clearDiff = useSnapshotStore((s) => s.clearDiff)
  const openCreateModal = useSnapshotStore((s) => s.openCreateModal)
  const closeCreateModal = useSnapshotStore((s) => s.closeCreateModal)
  const selectSnapshot = useSnapshotStore((s) => s.selectSnapshot)

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    isDanger?: boolean
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  useEffect(() => {
    if (currentProject) {
      void loadSnapshots(currentProject.projectSettingsPath)
    }
  }, [currentProject, loadSnapshots])

  const handleCreate = (name: string, description: string): void => {
    if (currentProject) {
      void createSnapshot(currentProject.projectSettingsPath, name, description)
    }
  }

  const handleDelete = (snapshotId: string): void => {
    if (currentProject) {
      setConfirmState({
        isOpen: true,
        title: '删除快照',
        message: '确定要删除这个快照吗？此操作不可撤销。',
        isDanger: true,
        onConfirm: () => {
          void deleteSnapshot(currentProject.projectSettingsPath, snapshotId)
          setConfirmState(prev => ({ ...prev, isOpen: false }))
        }
      })
    }
  }

  const handleRestore = (snapshotId: string): void => {
    if (!currentProject) return

    setConfirmState({
      isOpen: true,
      title: '恢复快照',
      message: '⚠️ 警告：恢复快照将覆盖当前项目的所有内容，未保存的更改将丢失。\n\n是否继续？',
      isDanger: true,
      onConfirm: () => {
        void restoreSnapshot(currentProject.projectSettingsPath, snapshotId).then((success) => {
          if (success) {
            window.location.reload()
          }
        })
        setConfirmState(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const handleCompare = (snapshotId: string): void => {
    if (currentProject) {
      void compareWithCurrent(currentProject.projectSettingsPath, snapshotId)
    }
  }

  if (!currentProject) {
    return (
      <div className="snapshot-panel">
        <div className="snapshot-empty">
          <div className="snapshot-empty-icon">
            <svg className="icon-xl" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          </div>
          <div className="snapshot-empty-text">请先打开项目</div>
          <div className="snapshot-empty-subtext">快照功能需要打开项目后才能使用</div>
        </div>
      </div>
    )
  }

  if (currentDiff) {
    return (
      <div className="snapshot-panel">
        <DiffView
          diff={currentDiff}
          onBack={clearDiff}
        />
      </div>
    )
  }

  return (
    <div className="snapshot-panel">
      {/* 工具栏 */}
      <div className="snapshot-toolbar">
        <div className="snapshot-toolbar-left" />
        <button
          className="story-toolbar-btn"
          onClick={openCreateModal}
          title="保存快照"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      {/* 快照列表 */}
      <div className="snapshot-list">
        {isLoading && snapshots.length === 0 && (
          <div className="snapshot-loading">
            <div className="loading-spinner" />
            <span>加载中...</span>
          </div>
        )}

        {!isLoading && snapshots.length === 0 && (
          <div className="snapshot-empty">
            <div className="snapshot-empty-icon">
              <svg className="icon-xl" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <div className="snapshot-empty-text">暂无快照</div>
            <div className="snapshot-empty-subtext">点击上方 + 按钮创建第一个快照</div>
          </div>
        )}

        {snapshots.map((snapshot) => (
          <SnapshotItem
            key={snapshot.id}
            snapshot={snapshot}
            isSelected={selectedSnapshotId === snapshot.id}
            onSelect={() => selectSnapshot(snapshot.id)}
            onDelete={() => handleDelete(snapshot.id)}
            onCompare={() => handleCompare(snapshot.id)}
            onRestore={() => handleRestore(snapshot.id)}
          />
        ))}
      </div>

      {/* 创建快照弹窗 */}
      <CreateSnapshotModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onCreate={handleCreate}
      />

      {/* 确认弹窗 */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        isDanger={confirmState.isDanger}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}

export default SnapshotPanel
