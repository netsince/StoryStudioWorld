import React, { useEffect, useRef, useState } from 'react'
import type { EditorNode, ProjectData } from '../models'
import EditorGroup from './editor/EditorGroup'

interface EditorProps {
  currentProject: ProjectData | null
  onOpenFolder: () => void
  onOpenWelcome: () => void
  onOpenCreateProject: () => void
  onCreateProject: (input: { projectName: string; description: string; projectPath: string }) => Promise<void>
  onPickProjectPath: () => Promise<string | null>
  onSaveNodeContent: (nodeId: string, content: string) => Promise<void>

  editorTree: EditorNode
  focusedGroupId: string
  groupCount: number
  onFocusGroup: (groupId: string) => void

  onTabSwitch: (groupId: string, tabId: string) => void
  onTabClose: (groupId: string, tabId: string) => void
  onCloseOthers: (groupId: string, tabId: string) => void
  onCloseAll: (groupId: string) => void
  onPinTab: (groupId: string, tabId: string) => void
  onSetDirtyTab: (groupId: string, tabId: string, isDirty: boolean) => void
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

const Editor: React.FC<EditorProps> = ({
  currentProject,
  onOpenFolder,
  onOpenWelcome,
  onOpenCreateProject,
  onCreateProject,
  onPickProjectPath,
  onSaveNodeContent,
  editorTree,
  focusedGroupId,
  groupCount,
  onFocusGroup,
  onTabSwitch,
  onTabClose,
  onCloseOthers,
  onCloseAll,
  onPinTab,
  onSetDirtyTab,
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
        <EditorGroup
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
          onSaveNodeContent={onSaveNodeContent}
          onTabSwitch={onTabSwitch}
          onTabClose={onTabClose}
          onCloseOthers={onCloseOthers}
          onCloseAll={onCloseAll}
          onPinTab={onPinTab}
          onSetDirtyTab={onSetDirtyTab}
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
        <SplitDivider direction={node.direction} splitId={node.id} ratio={node.ratio} onResize={onResizeSplit} />
        <div className="editor-split-child" style={{ flex: `${1 - node.ratio} 1 0%` }}>
          {renderNode(node.second)}
        </div>
      </div>
    )
  }

  return <div className="editor-area editor-split-root">{renderNode(editorTree)}</div>
}

export default Editor

