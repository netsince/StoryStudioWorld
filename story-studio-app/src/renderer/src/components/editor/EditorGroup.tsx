import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectData, Tab } from '../../models'
import ContextMenu from '../ContextMenu'
import PlainTextEditor from '../PlainTextEditor'
import CreateProjectForm from './CreateProjectForm'
import TabBar from './TabBar'
import WelcomePage, { EmptyState } from './WelcomePage'
import { useTabDrag } from './hooks/useTabDrag'

interface EditorGroupProps {
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
  onCreateProject: (input: { projectName: string; description: string; projectPath: string }) => Promise<void>
  onPickProjectPath: () => Promise<string | null>
  onSaveNodeContent: (nodeId: string, content: string) => Promise<void>

  onTabSwitch: (groupId: string, tabId: string) => void
  onTabClose: (groupId: string, tabId: string) => void
  onCloseOthers: (groupId: string, tabId: string) => void
  onCloseAll: (groupId: string) => void
  onPinTab: (groupId: string, tabId: string) => void
  onDirtyTab: (groupId: string, tabId: string) => void
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
}

const EditorGroup: React.FC<EditorGroupProps> = ({
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
  onSaveNodeContent,
  onTabSwitch,
  onTabClose,
  onCloseOthers,
  onCloseAll,
  onPinTab,
  onDirtyTab: _onDirtyTab,
  onSetDirtyTab,
  onReorderTabs,
  onMoveTab,
  onDockTabToSplit,
  onSplitGroup,
  onCloseGroup
}) => {
  const groupRootRef = useRef<HTMLDivElement>(null)
  const [editorContent, setEditorContent] = useState<string>('')

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId), [activeTabId, tabs])

  const tabDrag = useTabDrag({
    groupId,
    tabsCount: tabs.length,
    tabsVisible: true,
    onReorderTabs,
    onMoveTab,
    onDockTabToSplit
  })

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    groupId: string
    tabId: string
  } | null>(null)

  useEffect(() => {
    const handleClick = (): void => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const handleContextMenu = (event: React.MouseEvent, tabId: string): void => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, groupId, tabId })
  }

  useEffect(() => {
    const loadContent = async (): Promise<void> => {
      if (activeTab?.type === 'file' && activeTab.nodeId && currentProject) {
        const content = await window.api.readNodeContent(currentProject.projectSettingsPath, activeTab.nodeId)
        setEditorContent(content || '')
      } else {
        setEditorContent('')
      }
    }
    void loadContent()
  }, [activeTab?.id, activeTab?.nodeId, currentProject])

  const handleEditorChange = (content: string): void => {
    setEditorContent(content)
    if (activeTab) {
      onSetDirtyTab(groupId, activeTab.id, true)
    }
  }

  const handleSave = async (): Promise<void> => {
    if (activeTab?.type === 'file' && activeTab.nodeId && currentProject) {
      await onSaveNodeContent(activeTab.nodeId, editorContent)
      onSetDirtyTab(groupId, activeTab.id, false)
    }
  }

  const renderFile = (): React.ReactNode => (
    <div key={activeTab?.id} className="editor-content">
      <PlainTextEditor
        content={editorContent}
        onChange={handleEditorChange}
        onSave={handleSave}
        placeholder={`开始写作「${activeTab?.title}」...`}
      />
    </div>
  )

  const renderContent = (): React.ReactNode => {
    if (!activeTab) {
      return <EmptyState onOpenWelcome={onOpenWelcome} />
    }

    if (activeTab.type === 'welcome') {
      return (
        <WelcomePage
          currentProject={currentProject}
          onOpenCreateProject={onOpenCreateProject}
          onOpenFolder={onOpenFolder}
        />
      )
    }

    if (activeTab.type === 'create-project') {
      return <CreateProjectForm onCreateProject={onCreateProject} onPickProjectPath={onPickProjectPath} />
    }

    return renderFile()
  }

  const onTabClick = useCallback(
    (tabId: string): void => {
      onFocusGroup(groupId)
      onTabSwitch(groupId, tabId)
    },
    [groupId, onFocusGroup, onTabSwitch]
  )

  return (
    <div
      ref={groupRootRef}
      className={`editor-group ${isFocused ? 'focused' : ''}`}
      onMouseDown={() => onFocusGroup(groupId)}
      onDragEnter={tabDrag.onGroupDragEnter}
      onDragOver={tabDrag.onGroupDragOver}
      onDragLeave={tabDrag.onGroupDragLeave}
      onDrop={tabDrag.onGroupDrop}
    >
      {tabDrag.dropOverlay.visible && (
        <div
          className={`editor-drop-overlay editor-drop-overlay-${tabDrag.dropOverlay.side}`}
          style={tabDrag.dropOverlay.overlay}
          aria-hidden="true"
        />
      )}

      <TabBar
        groupId={groupId}
        tabs={tabs}
        activeTabId={activeTabId}
        draggedTabId={tabDrag.draggedTabId}
        onTabClick={onTabClick}
        onTabClose={(tabId) => onTabClose(groupId, tabId)}
        onTabContextMenu={handleContextMenu}
        onTabDragStart={tabDrag.onTabDragStart}
        onTabDragOver={tabDrag.onTabDragOver}
        onTabDragEnd={tabDrag.onTabDragEnd}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            ...(!(groupCount > 1 && tabs.length <= 1)
              ? [
                  {
                    key: 'split-right',
                    label: '向右分屏',
                    onSelect: () => onSplitGroup(contextMenu.groupId, 'row', contextMenu.tabId)
                  },
                  {
                    key: 'split-down',
                    label: '向下分屏',
                    onSelect: () => onSplitGroup(contextMenu.groupId, 'column', contextMenu.tabId)
                  }
                ]
              : []),
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
              label: tabs.find((tab) => tab.id === contextMenu.tabId)?.isPinned ? '取消固定' : '固定',
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

export default EditorGroup

