import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useReadingOrderStore, scheduleSave, clearSaveTimer } from '../stores/readingOrderStore'
import { useProjectStore } from '../stores/projectStore'
import type { ReadingOrderItem } from '../models'

// 拖拽状态
interface DragState {
  draggingId: string | null
  dragOverId: string | null
  dragOverPosition: 'before' | 'after' | null
}

// VS Code style constants - 与 Tree.tsx 保持一致
const ROW_HEIGHT = 22
const INDENT_SIZE = 8

const ReadingOrderPanel: React.FC = () => {
  const { t } = useTranslation()
  const currentProject = useProjectStore((s) => s.currentProject)

  const items = useReadingOrderStore((s) => s.items)
  const isLoading = useReadingOrderStore((s) => s.isLoading)
  const hasUnsavedChanges = useReadingOrderStore((s) => s.hasUnsavedChanges)
  const loadReadingOrder = useReadingOrderStore((s) => s.loadReadingOrder)
  const saveReadingOrder = useReadingOrderStore((s) => s.saveReadingOrder)
  const addItem = useReadingOrderStore((s) => s.addItem)
  const removeItem = useReadingOrderStore((s) => s.removeItem)
  const reorderItem = useReadingOrderStore((s) => s.reorderItem)
  const moveItem = useReadingOrderStore((s) => s.moveItem)
  const clearItems = useReadingOrderStore((s) => s.clearItems)

  const [dragState, setDragState] = useState<DragState>({
    draggingId: null,
    dragOverId: null,
    dragOverPosition: null
  })
  const [isDragOver, setIsDragOver] = useState(false)

  // 加载阅读编排数据
  useEffect(() => {
    if (currentProject) {
      void loadReadingOrder(currentProject.projectSettingsPath)
    }
    return () => {
      clearSaveTimer()
    }
  }, [currentProject, loadReadingOrder])

  // 页面关闭前保存
  useEffect(() => {
    const handleBeforeUnload = (): void => {
      if (currentProject && hasUnsavedChanges) {
        clearSaveTimer()
        void saveReadingOrder(currentProject.projectSettingsPath)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [currentProject, hasUnsavedChanges, saveReadingOrder])

  // 处理拖拽进入
  const handleDragOver = useCallback((e: React.DragEvent, itemId?: string): void => {
    e.preventDefault()

    // 根据是否有正在拖拽的 item 判断是内部拖拽还是外部拖拽
    // 注意：dragOver 事件中无法读取 getData，所以用 draggingId 状态判断
    const isInternalDrag = dragState.draggingId !== null
    e.dataTransfer.dropEffect = isInternalDrag ? 'move' : 'copy'

    if (itemId) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const relativeY = e.clientY - rect.top
      const position: 'before' | 'after' = relativeY < rect.height / 2 ? 'before' : 'after'

      setDragState((prev) => ({
        ...prev,
        dragOverId: itemId,
        dragOverPosition: position
      }))
    } else {
      setIsDragOver(true)
    }
  }, [dragState.draggingId])

  const handleDragLeave = useCallback((e: React.DragEvent): void => {
    e.preventDefault()
    // 只有当真正离开容器时才清除状态
    const relatedTarget = e.relatedTarget as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    if (!currentTarget.contains(relatedTarget)) {
      setDragState({
        draggingId: null,
        dragOverId: null,
        dragOverPosition: null
      })
      setIsDragOver(false)
    }
  }, [])

  // Item 级别的 dragLeave - 只清除 dragOver 状态
  const handleItemDragLeave = useCallback((e: React.DragEvent): void => {
    e.preventDefault()
    setDragState((prev) => ({
      ...prev,
      dragOverId: null,
      dragOverPosition: null
    }))
  }, [])

  // 处理放置（从文件树拖拽章节）
  const handleDrop = useCallback((e: React.DragEvent, targetItemId?: string): void => {
    e.preventDefault()
    e.stopPropagation()

    const data = e.dataTransfer.getData('application/json')
    if (!data) {
      setDragState({ draggingId: null, dragOverId: null, dragOverPosition: null })
      setIsDragOver(false)
      return
    }

    try {
      const parsed = JSON.parse(data)
      if (parsed.type === 'story-node') {
        // 检查是否已存在
        if (items.some((item) => item.nodeId === parsed.nodeId)) {
          setDragState({ draggingId: null, dragOverId: null, dragOverPosition: null })
          setIsDragOver(false)
          return
        }

        if (targetItemId) {
          // 放置到特定位置
          const targetIndex = items.findIndex((item) => item.id === targetItemId)
          if (targetIndex !== -1) {
            const insertIndex = dragState.dragOverPosition === 'after' ? targetIndex + 1 : targetIndex
            // 先添加到最后，然后移动
            addItem(parsed.nodeId, parsed.title)
            const newItems = useReadingOrderStore.getState().items
            const newItemIndex = newItems.length - 1
            if (newItemIndex !== insertIndex && newItemIndex !== insertIndex - 1) {
              moveItem(newItemIndex, insertIndex > newItemIndex ? insertIndex - 1 : insertIndex)
            }
          } else {
            addItem(parsed.nodeId, parsed.title)
          }
        } else {
          // 添加到末尾
          addItem(parsed.nodeId, parsed.title)
        }

        // 触发保存
        if (currentProject) {
          scheduleSave(currentProject.projectSettingsPath)
        }
      }
    } catch (error) {
      console.error('Failed to parse drop data:', error)
    }

    setDragState({ draggingId: null, dragOverId: null, dragOverPosition: null })
    setIsDragOver(false)
  }, [items, addItem, moveItem, currentProject, dragState.dragOverPosition])

  // 处理内部拖拽（排序）
  const handleInternalDragStart = useCallback((e: React.DragEvent, item: ReadingOrderItem): void => {
    setDragState((prev) => ({ ...prev, draggingId: item.id }))
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'reading-order-item',
      itemId: item.id
    }))
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleInternalDrop = useCallback((e: React.DragEvent, targetItemId: string): void => {
    e.preventDefault()
    e.stopPropagation()

    const data = e.dataTransfer.getData('application/json')
    if (!data) {
      setDragState({ draggingId: null, dragOverId: null, dragOverPosition: null })
      return
    }

    try {
      const parsed = JSON.parse(data)
      if (parsed.type === 'reading-order-item') {
        const fromIndex = items.findIndex((item) => item.id === parsed.itemId)
        const toIndex = items.findIndex((item) => item.id === targetItemId)

        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
          const adjustedIndex = dragState.dragOverPosition === 'after' && toIndex > fromIndex
            ? toIndex
            : dragState.dragOverPosition === 'after' && toIndex < fromIndex
              ? toIndex + 1
              : dragState.dragOverPosition === 'before' && toIndex > fromIndex
                ? toIndex - 1
                : toIndex
          moveItem(fromIndex, adjustedIndex)

          if (currentProject) {
            scheduleSave(currentProject.projectSettingsPath)
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse drop data:', error)
    }

    setDragState({ draggingId: null, dragOverId: null, dragOverPosition: null })
  }, [items, moveItem, currentProject, dragState.dragOverPosition])

  // 上移/下移
  const handleMoveUp = useCallback((id: string): void => {
    reorderItem(id, 'up')
    if (currentProject) {
      scheduleSave(currentProject.projectSettingsPath)
    }
  }, [reorderItem, currentProject])

  const handleMoveDown = useCallback((id: string): void => {
    reorderItem(id, 'down')
    if (currentProject) {
      scheduleSave(currentProject.projectSettingsPath)
    }
  }, [reorderItem, currentProject])

  // 删除
  const handleRemove = useCallback((id: string): void => {
    removeItem(id)
    if (currentProject) {
      scheduleSave(currentProject.projectSettingsPath)
    }
  }, [removeItem, currentProject])

  // 清空
  const handleClear = useCallback((): void => {
    if (confirm(t('readingOrder.confirmClear'))) {
      clearItems()
      if (currentProject) {
        scheduleSave(currentProject.projectSettingsPath)
      }
    }
  }, [clearItems, currentProject, t])

  // 手动保存
  const handleSave = useCallback(async (): Promise<void> => {
    if (!currentProject) return
    await saveReadingOrder(currentProject.projectSettingsPath)
  }, [currentProject, saveReadingOrder])

  if (!currentProject) {
    return (
      <div className="reading-order-panel">
        <div className="reading-order-empty">
          <div className="reading-order-empty-icon">📚</div>
          <div className="reading-order-empty-text">{t('readingOrder.noProject')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="reading-order-panel">
      <div className="reading-order-header">
        <div className="reading-order-title">{t('readingOrder.title')}</div>
        <div className="reading-order-actions">
          {hasUnsavedChanges && (
            <span className="reading-order-unsaved">*</span>
          )}
          <button
            className="reading-order-btn"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isLoading}
            title={t('common.save')}
          >
            💾
          </button>
          {items.length > 0 && (
            <button
              className="reading-order-btn"
              onClick={handleClear}
              title={t('readingOrder.clearAll')}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      <div className="reading-order-hint">
        {t('readingOrder.dragHint')}
      </div>

      {/* monaco-tree 样式的阅读编排列表 */}
      <div
        className={`monaco-tree reading-order-tree ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => handleDragOver(e)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          // 判断是内部拖拽还是外部拖拽
          const data = e.dataTransfer.getData('application/json')
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'reading-order-item') {
              // 内部拖拽到空白区域，默认放到最后
              const fromIndex = items.findIndex((item) => item.id === parsed.itemId)
              if (fromIndex !== -1 && fromIndex !== items.length - 1) {
                moveItem(fromIndex, items.length - 1)
                if (currentProject) {
                  scheduleSave(currentProject.projectSettingsPath)
                }
              }
              setDragState({ draggingId: null, dragOverId: null, dragOverPosition: null })
              setIsDragOver(false)
            } else {
              // 外部拖拽
              handleDrop(e)
            }
          } catch {
            handleDrop(e)
          }
        }}
      >
        {items.length === 0 ? (
          <div className="reading-order-empty-list">
            <div className="reading-order-empty-icon">📋</div>
            <div className="reading-order-empty-text">{t('readingOrder.emptyList')}</div>
            <div className="reading-order-empty-hint">{t('readingOrder.emptyHint')}</div>
          </div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} style={{ position: 'relative' }}>
              {/* 拖拽指示器（上方） */}
              {dragState.dragOverId === item.id && dragState.dragOverPosition === 'before' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: 'var(--list-active-selection-bg, #007acc)',
                    zIndex: 10
                  }}
                />
              )}

              <div
                className={`reading-order-tree-item ${dragState.draggingId === item.id ? 'dragging' : ''}`}
                style={{
                  height: `${ROW_HEIGHT}px`,
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  paddingLeft: `${INDENT_SIZE}px`,
                  color: 'var(--foreground, #ccc)',
                  cursor: 'pointer',
                  opacity: dragState.draggingId === item.id ? 0.5 : 1,
                  userSelect: 'none'
                }}
                draggable
                onDragStart={(e) => handleInternalDragStart(e, item)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragLeave={handleItemDragLeave}
                onDrop={(e) => {
                  e.stopPropagation()
                  const data = e.dataTransfer.getData('application/json')
                  try {
                    const parsed = JSON.parse(data)
                    if (parsed.type === 'story-node') {
                      handleDrop(e, item.id)
                    } else if (parsed.type === 'reading-order-item') {
                      handleInternalDrop(e, item.id)
                    }
                  } catch {
                    handleDrop(e, item.id)
                  }
                }}
                onDragEnd={() => {
                  setDragState({ draggingId: null, dragOverId: null, dragOverPosition: null })
                }}
              >
                {/* Order number badge */}
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--accent-color, #007acc)',
                    color: 'white',
                    borderRadius: '50%',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    marginRight: '8px',
                    flexShrink: 0
                  }}
                >
                  {index + 1}
                </span>

                {/* File icon - VS Code style */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginRight: '4px' }}>
                  <path
                    d="M3.5 1h5.79l3.21 3.21V14.5a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 3.5 1z"
                    fill="#75BEFF"
                    fillOpacity="0.6"
                  />
                </svg>

                {/* Title */}
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '13px',
                    lineHeight: `${ROW_HEIGHT}px`
                  }}
                >
                  {item.title}
                </span>

                {/* Actions */}
                <div className="reading-order-item-actions">
                  <button
                    className="reading-order-item-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMoveUp(item.id)
                    }}
                    disabled={index === 0}
                    title={t('readingOrder.moveUp')}
                  >
                    ↑
                  </button>
                  <button
                    className="reading-order-item-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMoveDown(item.id)
                    }}
                    disabled={index === items.length - 1}
                    title={t('readingOrder.moveDown')}
                  >
                    ↓
                  </button>
                  <button
                    className="reading-order-item-btn delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(item.id)
                    }}
                    title={t('common.delete')}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* 拖拽指示器（下方） */}
              {dragState.dragOverId === item.id && dragState.dragOverPosition === 'after' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: 'var(--list-active-selection-bg, #007acc)',
                    zIndex: 10
                  }}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ReadingOrderPanel
