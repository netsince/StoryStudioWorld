import React, { useEffect, useMemo, useRef, useState } from 'react'
import { EditorNode, ProjectData, Tab } from '../models'
import ContextMenu from './ContextMenu'

const ssworldNobgSvg = new URL('../assets/ssw-nobg.svg', import.meta.url).href

type DropSide = 'left' | 'right' | 'top' | 'bottom' | 'center'
type DropOverlayRect = { top: string; left: string; width: string; height: string }

interface EditorProps {
  currentProject: ProjectData | null
  onOpenFolder: () => void
  onOpenWelcome: () => void
  onOpenCreateProject: () => void
  onCreateProject: (input: {
    projectName: string
    description: string
    projectPath: string
  }) => Promise<void>
  onPickProjectPath: () => Promise<string | null>

  editorTree: EditorNode
  focusedGroupId: string
  groupCount: number
  onFocusGroup: (groupId: string) => void

  onTabSwitch: (groupId: string, tabId: string) => void
  onTabClose: (groupId: string, tabId: string) => void
  onCloseOthers: (groupId: string, tabId: string) => void
  onCloseAll: (groupId: string) => void
  onPinTab: (groupId: string, tabId: string) => void
  onDirtyTab: (groupId: string, tabId: string) => void
  onReorderTabs: (groupId: string, draggedId: string, targetId: string) => void

  onMoveTab: (fromGroupId: string, toGroupId: string, tabId: string, beforeTabId?: string) => void
  onDockTabToSplit: (
    fromGroupId: string,
    targetGroupId: string,
    tabId: string,
    side: 'left' | 'right' | 'top' | 'bottom'
  ) => void

  onSplitGroup: (groupId: string, direction: 'row' | 'column', tabId?: string) => void
  onCloseGroup: (groupId: string) => void
  onResizeSplit: (splitId: string, ratio: number) => void
}

const TAB_DND_MIME = 'application/x-ssw-tab'
const TAB_DRAG_CLEANUP_EVENT = 'ssw:tab-drag-cleanup'
let activeTabDrag: { groupId: string; tabId: string } | null = null

const dispatchTabDragCleanup = (): void => {
  activeTabDrag = null
  window.dispatchEvent(new CustomEvent(TAB_DRAG_CLEANUP_EVENT))
}

const readTabDragPayload = (event: React.DragEvent): { groupId: string; tabId: string } | null => {
  const raw = event.dataTransfer.getData(TAB_DND_MIME)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'groupId' in parsed &&
      'tabId' in parsed &&
      typeof (parsed as { groupId: unknown }).groupId === 'string' &&
      typeof (parsed as { tabId: unknown }).tabId === 'string'
    ) {
      return parsed as { groupId: string; tabId: string }
    }
    return null
  } catch {
    return null
  }
}

const getTabDragPayload = (event: React.DragEvent): { groupId: string; tabId: string } | null =>
  readTabDragPayload(event) ?? activeTabDrag

const getOverlayOffsetHeight = (tabsVisible: boolean, tabsCount: number): number =>
  tabsVisible && tabsCount > 0 ? 35 : 0

const computeDropOperation = (
  clientX: number,
  clientY: number,
  rect: DOMRect,
  overlayOffsetHeight: number
): { side: DropSide; overlay: DropOverlayRect } => {
  const editorWidth = rect.width
  const editorHeight = Math.max(0, rect.height - overlayOffsetHeight)
  if (!editorWidth || !editorHeight) {
    return {
      side: 'center',
      overlay: { top: '0', left: '0', width: '100%', height: '100%' }
    }
  }

  const offsetX = clientX - rect.left
  const offsetY = clientY - rect.top - overlayOffsetHeight

  const edgeWidthThreshold = editorWidth * 0.1
  const edgeHeightThreshold = editorHeight * 0.1
  const splitHeightThreshold = editorHeight / 3

  let side: DropSide = 'center'
  if (
    !(
      offsetX > edgeWidthThreshold &&
      offsetX < editorWidth - edgeWidthThreshold &&
      offsetY > edgeHeightThreshold &&
      offsetY < editorHeight - edgeHeightThreshold
    )
  ) {
    if (offsetY < splitHeightThreshold) {
      side = 'top'
    } else if (offsetY > splitHeightThreshold * 2) {
      side = 'bottom'
    } else if (offsetX < editorWidth / 2) {
      side = 'left'
    } else {
      side = 'right'
    }
  }

  switch (side) {
    case 'top':
      return {
        side,
        overlay: { top: `${overlayOffsetHeight}px`, left: '0', width: '100%', height: '50%' }
      }
    case 'bottom':
      return {
        side,
        overlay: {
          top: `calc(${overlayOffsetHeight}px + 50%)`,
          left: '0',
          width: '100%',
          height: '50%'
        }
      }
    case 'left':
      return {
        side,
        overlay: {
          top: `${overlayOffsetHeight}px`,
          left: '0',
          width: '50%',
          height: `calc(100% - ${overlayOffsetHeight}px)`
        }
      }
    case 'right':
      return {
        side,
        overlay: {
          top: `${overlayOffsetHeight}px`,
          left: '50%',
          width: '50%',
          height: `calc(100% - ${overlayOffsetHeight}px)`
        }
      }
    default:
      return {
        side: 'center',
        overlay: {
          top: `${overlayOffsetHeight}px`,
          left: '0',
          width: '100%',
          height: `calc(100% - ${overlayOffsetHeight}px)`
        }
      }
  }
}

const SplitDivider: React.FC<{
  direction: 'row' | 'column'
  splitId: string
  ratio: number
  onResize: (splitId: string, ratio: number) => void
}> = ({ direction, splitId, ratio, onResize }) => {
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startClient: number; startRatio: number; size: number } | null>(null)
  const cursor = direction === 'row' ? 'col-resize' : 'row-resize'

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent): void => {
      if (!isDragging || !dragRef.current) return
      const client = direction === 'row' ? event.clientX : event.clientY
      const delta = client - dragRef.current.startClient
      const next = dragRef.current.startRatio + delta / dragRef.current.size
      onResize(splitId, next)
    }

    const handleMouseUp = (): void => {
      setIsDragging(false)
      dragRef.current = null
      document.body.style.cursor = ''
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = cursor
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [cursor, direction, isDragging, onResize, splitId])

  return (
    <div
      className={`editor-split-divider editor-split-divider-${direction} ${isDragging ? 'active' : ''}`}
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const parent = (event.currentTarget.parentElement as HTMLElement | null) ?? undefined
        const rect = parent?.getBoundingClientRect()
        const size = rect ? (direction === 'row' ? rect.width : rect.height) : 0
        if (!size) return
        dragRef.current = {
          startClient: direction === 'row' ? event.clientX : event.clientY,
          startRatio: ratio,
          size
        }
        setIsDragging(true)
      }}
      style={{ cursor }}
    />
  )
}

const EditorGroupView: React.FC<{
  currentProject: ProjectData | null
  groupId: string
  tabs: Tab[]
  activeTabId: string
  isFocused: boolean
  groupCount: number
  onFocusGroup: (groupId: string) => void
  onOpenFolder: () => void
  onOpenWelcome: () => void
  onOpenCreateProject: () => void
  onCreateProject: (input: {
    projectName: string
    description: string
    projectPath: string
  }) => Promise<void>
  onPickProjectPath: () => Promise<string | null>

  onTabSwitch: (groupId: string, tabId: string) => void
  onTabClose: (groupId: string, tabId: string) => void
  onCloseOthers: (groupId: string, tabId: string) => void
  onCloseAll: (groupId: string) => void
  onPinTab: (groupId: string, tabId: string) => void
  onDirtyTab: (groupId: string, tabId: string) => void
  onReorderTabs: (groupId: string, draggedId: string, targetId: string) => void

  onMoveTab: (fromGroupId: string, toGroupId: string, tabId: string, beforeTabId?: string) => void
  onDockTabToSplit: (
    fromGroupId: string,
    targetGroupId: string,
    tabId: string,
    side: 'left' | 'right' | 'top' | 'bottom'
  ) => void

  onSplitGroup: (groupId: string, direction: 'row' | 'column', tabId?: string) => void
  onCloseGroup: (groupId: string) => void
}> = ({
  currentProject,
  groupId,
  tabs,
  activeTabId,
  isFocused,
  groupCount,
  onFocusGroup,
  onOpenFolder,
  onOpenWelcome,
  onOpenCreateProject,
  onCreateProject,
  onPickProjectPath,
  onTabSwitch,
  onTabClose,
  onCloseOthers,
  onCloseAll,
  onPinTab,
  onDirtyTab,
  onReorderTabs,
  onMoveTab,
  onDockTabToSplit,
  onSplitGroup,
  onCloseGroup
}) => {
  const groupRootRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLDivElement>(null)
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null)
  const [isSubmittingProject, setIsSubmittingProject] = useState(false)
  const [createProjectForm, setCreateProjectForm] = useState({
    projectName: '',
    description: '',
    projectPath: ''
  })
  const [dropOverlay, setDropOverlay] = useState<{
    visible: boolean
    side: DropSide
    overlay: DropOverlayRect
  }>({
    visible: false,
    side: 'center',
    overlay: { top: '0', left: '0', width: '100%', height: '100%' }
  })
  const dragDepthRef = useRef(0)
  const lastOverlaySideRef = useRef<DropSide>('center')
  const overlayOffsetHeight = getOverlayOffsetHeight(true, tabs.length)

  const resetDropOverlay = (): void => {
    dragDepthRef.current = 0
    lastOverlaySideRef.current = 'center'
    setDropOverlay({
      visible: false,
      side: 'center',
      overlay: { top: '0', left: '0', width: '100%', height: '100%' }
    })
  }

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId), [activeTabId, tabs])

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    groupId: string
    tabId: string
  } | null>(null)

  useEffect(() => {
    if (activeTabRef.current && tabsRef.current) {
      const container = tabsRef.current
      const tab = activeTabRef.current
      const tabLeft = tab.offsetLeft
      const tabRight = tabLeft + tab.offsetWidth
      const containerLeft = container.scrollLeft
      const containerRight = containerLeft + container.offsetWidth

      if (tabLeft < containerLeft) {
        container.scrollTo({ left: tabLeft, behavior: 'smooth' })
      } else if (tabRight > containerRight) {
        container.scrollTo({ left: tabRight - container.offsetWidth, behavior: 'smooth' })
      }
    }
  }, [activeTabId])

  useEffect(() => {
    const handleClick = (): void => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    const handleGlobalDragCleanup = (): void => {
      setDraggedTabId(null)
      resetDropOverlay()
    }

    window.addEventListener(TAB_DRAG_CLEANUP_EVENT, handleGlobalDragCleanup as EventListener)
    window.addEventListener('dragend', handleGlobalDragCleanup)
    window.addEventListener('drop', handleGlobalDragCleanup)

    return () => {
      window.removeEventListener(
        TAB_DRAG_CLEANUP_EVENT,
        handleGlobalDragCleanup as EventListener
      )
      window.removeEventListener('dragend', handleGlobalDragCleanup)
      window.removeEventListener('drop', handleGlobalDragCleanup)
    }
  }, [])

  const handleWheel = (event: React.WheelEvent): void => {
    if (tabsRef.current) {
      tabsRef.current.scrollLeft += event.deltaY
    }
  }

  const handleContextMenu = (event: React.MouseEvent, tabId: string): void => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, groupId, tabId })
  }

  const handleDragStart = (event: React.DragEvent, tabId: string): void => {
    dispatchTabDragCleanup()
    setDraggedTabId(tabId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(TAB_DND_MIME, JSON.stringify({ groupId, tabId }))
    event.dataTransfer.setData('text/plain', tabId)
    activeTabDrag = { groupId, tabId }
    const img = new Image()
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    event.dataTransfer.setDragImage(img, 0, 0)
  }

  const handleDragOver = (event: React.DragEvent, targetId: string): void => {
    event.preventDefault()
    if (draggedTabId && draggedTabId !== targetId) {
      onReorderTabs(groupId, draggedTabId, targetId)
    }
  }

  const handleCreateProjectSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (isSubmittingProject) return

    setIsSubmittingProject(true)
    try {
      await onCreateProject(createProjectForm)
      setCreateProjectForm({ projectName: '', description: '', projectPath: '' })
    } finally {
      setIsSubmittingProject(false)
    }
  }

  const renderWelcome = (): React.ReactNode => (
    <div
      key="welcome"
      className="editor-content"
      style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
    >
      <img className="brand-logo brand-logo-xl" src={ssworldNobgSvg} alt="Story Studio World" />
      <div className="project-title">Story Studio World</div>
      <div className="project-subtitle" style={{ marginBottom: '40px' }}>
        {currentProject ? `当前项目：${currentProject.projectPath}` : '选择项目以开始或继续。'}
      </div>

      <div className="start-group" style={{ maxWidth: '320px' }}>
        <div className="start-item" onClick={onOpenCreateProject}>
          <span className="start-item-icon">
            <svg className="icon" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </span>
          <span>新建项目</span>
        </div>
        <div className="start-item" onClick={onOpenFolder}>
          <span className="start-item-icon">
            <svg className="icon" viewBox="0 0 24 24">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </span>
          <span>打开项目...</span>
        </div>
      </div>
    </div>
  )

  const renderEmptyState = (): React.ReactNode => (
    <div
      key="empty"
      className="editor-content"
      style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
    >
      <img
        className="brand-logo brand-logo-xl"
        src={ssworldNobgSvg}
        alt="Story Studio World"
        style={{ cursor: 'pointer' }}
        onClick={onOpenWelcome}
      />
    </div>
  )

  const renderCreateProject = (): React.ReactNode => (
    <div key="create-project" className="editor-content create-project-page">
      <div className="create-project-shell">
        <div className="create-project-title">新建项目</div>
        <div className="create-project-subtitle">
          填写项目名、简介和项目路径。创建后会自动生成{' '}
          <code>storystudioworld.sswprojectsetting</code> 项目文件。
        </div>

        <form
          className="create-project-form"
          onSubmit={(event) => void handleCreateProjectSubmit(event)}
        >
          <label className="form-field">
            <span>项目名</span>
            <input
              value={createProjectForm.projectName}
              onChange={(event) =>
                setCreateProjectForm((prev) => ({ ...prev, projectName: event.target.value }))
              }
              placeholder="例如：长夜群星"
            />
          </label>

          <label className="form-field">
            <span>项目简介</span>
            <textarea
              value={createProjectForm.description}
              onChange={(event) =>
                setCreateProjectForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="简单描述这个故事项目。"
              rows={5}
            />
          </label>

          <label className="form-field">
            <span>路径</span>
            <div className="path-picker-row">
              <input
                value={createProjectForm.projectPath}
                onChange={(event) =>
                  setCreateProjectForm((prev) => ({ ...prev, projectPath: event.target.value }))
                }
                placeholder="选择一个空文件夹路径"
              />
              <button
                type="button"
                className="action-button secondary inline-button"
                onClick={async () => {
                  const path = await onPickProjectPath()
                  if (path) {
                    setCreateProjectForm((prev) => ({ ...prev, projectPath: path }))
                  }
                }}
              >
                选择
              </button>
            </div>
          </label>

          <div className="create-project-actions">
            <button type="submit" className="action-button" disabled={isSubmittingProject}>
              {isSubmittingProject ? '创建中...' : '创建项目'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  const renderFile = (): React.ReactNode => (
    <div key={activeTab?.id} className="editor-content">
      <div style={{ maxWidth: '840px', width: '100%', margin: '0 auto' }}>
        <h2 className="project-title" style={{ fontSize: '24px', fontWeight: '600' }}>
          {activeTab?.title} {activeTab?.isPinned && <span style={{ fontSize: '12px' }}>📌</span>}
        </h2>
        <p className="project-subtitle" style={{ fontSize: '12px', marginBottom: '20px' }}>
          {activeTab?.path}
        </p>
        <hr
          style={{
            border: 'none',
            borderTop: '1px solid var(--border-color)',
            marginBottom: '20px'
          }}
        />
        <div style={{ color: 'var(--text-main)', lineHeight: '1.8', fontSize: '15px' }}>
          <p>
            当前已经打开 <strong>{activeTab?.title}</strong>。
          </p>
          <p>卷章树、项目创建和文件结构已经接入，正文编辑逻辑后续再继续扩展。</p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button
              className="action-button"
              style={{ width: 'auto' }}
              onClick={() => activeTab && onDirtyTab(groupId, activeTab.id)}
            >
              {activeTab?.isDirty ? '取消模拟修改' : '模拟修改内容'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderContent = (): React.ReactNode => {
    if (!activeTab) {
      return renderEmptyState()
    }

    if (activeTab.type === 'welcome') {
      return renderWelcome()
    }

    if (activeTab.type === 'create-project') {
      return renderCreateProject()
    }

    return renderFile()
  }

  return (
    <div
      ref={groupRootRef}
      className={`editor-group ${isFocused ? 'focused' : ''}`}
      onMouseDown={() => onFocusGroup(groupId)}
      onDragEnter={(event) => {
        const payload = getTabDragPayload(event)
        if (!payload) return
        dragDepthRef.current += 1
        if (!dropOverlay.visible) {
          setDropOverlay((prev) => ({ ...prev, visible: true }))
        }
      }}
      onDragOver={(event) => {
        const payload = getTabDragPayload(event)
        if (!payload) return
        event.preventDefault()
        const rect = event.currentTarget.getBoundingClientRect()
        const operation = computeDropOperation(
          event.clientX,
          event.clientY,
          rect,
          overlayOffsetHeight
        )
        if (lastOverlaySideRef.current !== operation.side || !dropOverlay.visible) {
          lastOverlaySideRef.current = operation.side
          setDropOverlay({ visible: true, side: operation.side, overlay: operation.overlay })
        }
      }}
      onDragLeave={(event) => {
        // Prevent flicker when moving between children inside the group
        const nextTarget = event.relatedTarget as Node | null
        if (nextTarget && event.currentTarget.contains(nextTarget)) return

        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
        if (dragDepthRef.current === 0) {
          resetDropOverlay()
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const payload = getTabDragPayload(event)
        const intendedSide = lastOverlaySideRef.current
        resetDropOverlay()
        if (!payload) return

        const rect = event.currentTarget.getBoundingClientRect()
        const computedSide = computeDropOperation(
          event.clientX,
          event.clientY,
          rect,
          overlayOffsetHeight
        ).side
        const side = computedSide === 'center' ? intendedSide : computedSide
        if (payload.groupId === groupId && side === 'center') return

        if (side === 'center') {
          onMoveTab(payload.groupId, groupId, payload.tabId)
        } else {
          onDockTabToSplit(payload.groupId, groupId, payload.tabId, side)
        }

        dispatchTabDragCleanup()
      }}
    >
      {dropOverlay.visible && (
        <div
          className={`editor-drop-overlay editor-drop-overlay-${dropOverlay.side}`}
          style={dropOverlay.overlay}
          aria-hidden="true"
        />
      )}

      {tabs.length > 0 && (
        <div
          className="editor-tabs"
          ref={tabsRef}
          onWheel={handleWheel}
          onDragOver={(event) => event.preventDefault()}
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              ref={tab.id === activeTabId ? activeTabRef : null}
              className={`editor-tab ${tab.id === activeTabId ? 'active' : ''} ${tab.isPinned ? 'pinned' : ''} ${tab.isDirty ? 'dirty' : ''} ${draggedTabId === tab.id ? 'dragging' : ''}`}
              draggable
              onDragStart={(event) => handleDragStart(event, tab.id)}
              onDragOver={(event) => handleDragOver(event, tab.id)}
              onDragEnd={() => {
                dispatchTabDragCleanup()
              }}
              onClick={() => {
                onFocusGroup(groupId)
                onTabSwitch(groupId, tab.id)
              }}
              onContextMenu={(event) => handleContextMenu(event, tab.id)}
            >
              <span className="tab-title">{tab.title}</span>
              <div className="tab-actions">
                {tab.isDirty && <span className="tab-dirty-dot" />}
                <span
                  className="tab-close"
                  onClick={(event) => {
                    event.stopPropagation()
                    onTabClose(groupId, tab.id)
                  }}
                >
                  ✕
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              key: 'split-right',
              label: '向右分屏',
              onSelect: () => onSplitGroup(contextMenu.groupId, 'row', contextMenu.tabId)
            },
            {
              key: 'split-down',
              label: '向下分屏',
              onSelect: () => onSplitGroup(contextMenu.groupId, 'column', contextMenu.tabId)
            },
            ...(groupCount > 1
              ? [
                  {
                    key: 'close-group',
                    label: '关闭分屏',
                    onSelect: () => onCloseGroup(contextMenu.groupId)
                  }
                ]
              : []),
            {
              key: 'close',
              label: '关闭',
              onSelect: () => onTabClose(contextMenu.groupId, contextMenu.tabId)
            },
            {
              key: 'pin',
              label: tabs.find((tab) => tab.id === contextMenu.tabId)?.isPinned
                ? '取消固定'
                : '固定',
              onSelect: () => onPinTab(contextMenu.groupId, contextMenu.tabId)
            },
            {
              key: 'close-others',
              label: '关闭其他',
              onSelect: () => onCloseOthers(contextMenu.groupId, contextMenu.tabId)
            },
            {
              key: 'close-all',
              label: '关闭所有',
              onSelect: () => onCloseAll(contextMenu.groupId)
            }
          ]}
        />
      )}

      {renderContent()}
    </div>
  )
}

const Editor: React.FC<EditorProps> = ({
  currentProject,
  onOpenFolder,
  onOpenWelcome,
  onOpenCreateProject,
  onCreateProject,
  onPickProjectPath,
  editorTree,
  focusedGroupId,
  groupCount,
  onFocusGroup,
  onTabSwitch,
  onTabClose,
  onCloseOthers,
  onCloseAll,
  onPinTab,
  onDirtyTab,
  onReorderTabs,
  onMoveTab,
  onDockTabToSplit,
  onSplitGroup,
  onCloseGroup,
  onResizeSplit
}) => {
  const renderNode = (node: EditorNode): React.ReactNode => {
    if (node.kind === 'group') {
      return (
        <EditorGroupView
          currentProject={currentProject}
          groupId={node.id}
          tabs={node.tabs}
          activeTabId={node.activeTabId}
          isFocused={node.id === focusedGroupId}
          groupCount={groupCount}
          onFocusGroup={onFocusGroup}
          onOpenFolder={onOpenFolder}
          onOpenWelcome={onOpenWelcome}
          onOpenCreateProject={onOpenCreateProject}
          onCreateProject={onCreateProject}
          onPickProjectPath={onPickProjectPath}
          onTabSwitch={onTabSwitch}
          onTabClose={onTabClose}
          onCloseOthers={onCloseOthers}
          onCloseAll={onCloseAll}
          onPinTab={onPinTab}
          onDirtyTab={onDirtyTab}
          onReorderTabs={onReorderTabs}
          onMoveTab={onMoveTab}
          onDockTabToSplit={onDockTabToSplit}
          onSplitGroup={onSplitGroup}
          onCloseGroup={onCloseGroup}
        />
      )
    }

    return (
      <div className={`editor-split editor-split-${node.direction}`}>
        <div className="editor-split-child" style={{ flex: `${node.ratio} 1 0%` }}>
          {renderNode(node.first)}
        </div>
        <SplitDivider
          direction={node.direction}
          splitId={node.id}
          ratio={node.ratio}
          onResize={onResizeSplit}
        />
        <div className="editor-split-child" style={{ flex: `${1 - node.ratio} 1 0%` }}>
          {renderNode(node.second)}
        </div>
      </div>
    )
  }

  return <div className="editor-area editor-split-root">{renderNode(editorTree)}</div>
}

export default Editor
