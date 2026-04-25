import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { Tab } from '../../models'
import { findGroupNode } from '../../editor/editorTree'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'
import { useUiStore } from '../../stores/uiStore'
import { commandService } from '../../services/commandService'
import ContextMenu from '../ContextMenu'
import TabBar from './TabBar'
import { EmptyState } from './WelcomePage'
import TabContentRenderer from './TabContentRenderer'
import { useTabDrag } from './hooks/useTabDrag'

const EditorGroup: React.FC<{ groupId: string }> = ({ groupId }) => {
  const groupRootRef = useRef<HTMLDivElement>(null)

  const currentProject = useProjectStore((s) => s.currentProject)
  const storyNodes = useProjectStore((s) => s.storyNodes)
  const openProject = useProjectStore((s) => s.openProject)
  const createProject = useProjectStore((s) => s.createProject)
  const saveNodeContent = useProjectStore((s) => s.saveNodeContent)
  const setDraft = useProjectStore((s) => s.setDraft)
  const clearDraft = useProjectStore((s) => s.clearDraft)

  const setExpandNodePath = useUiStore((s) => s.setExpandNodePath)

  const group = useEditorStore(useCallback((s) => findGroupNode(s.editorTree, groupId), [groupId]))
  const focusedGroupId = useEditorStore((s) => s.focusedGroupId)
  const groupCount = useEditorStore((s) => s.groupCount())
  const setFocusedGroupId = useEditorStore((s) => s.setFocusedGroupId)
  const setActiveGroup = useEditorStore((s) => s.setActiveGroup)
  const switchTab = useEditorStore((s) => s.switchTab)
  const closeTab = useEditorStore((s) => s.closeTab)
  const closeOtherTabs = useEditorStore((s) => s.closeOtherTabs)
  const closeAllTabs = useEditorStore((s) => s.closeAllTabs)
  const togglePinTab = useEditorStore((s) => s.togglePinTab)
  const setDirtyTab = useEditorStore((s) => s.setDirtyTab)
  const reorderTabs = useEditorStore((s) => s.reorderTabs)
  const moveTab = useEditorStore((s) => s.moveTab)
  const dockTabToSplit = useEditorStore((s) => s.dockTabToSplit)
  const splitGroup = useEditorStore((s) => s.splitGroup)
  const closeGroup = useEditorStore((s) => s.closeGroup)
  const openWelcomeTab = useEditorStore((s) => s.openWelcomeTab)
  const openCreateProjectTab = useEditorStore((s) => s.openCreateProjectTab)

  const isFocused = focusedGroupId === groupId
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tabs = group?.tabs ?? []
  const activeTabId = group?.activeTabId ?? ''

  const tabDrag = useTabDrag({
    groupId,
    tabsCount: tabs.length,
    tabsVisible: true,
    onReorderTabs: reorderTabs,
    onMoveTab: moveTab,
    onDockTabToSplit: dockTabToSplit
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

  const confirmClose = useCallback(
    (tab: Tab) => {
      const shouldClose = window.confirm(`${tab.title} 有未保存的更改，确定要关闭吗？`)
      if (shouldClose && tab.type === 'file' && tab.nodeId) {
        clearDraft(tab.nodeId)
      }
      return { shouldClose }
    },
    [clearDraft]
  )

  const onTabClick = useCallback(
    (tabId: string): void => {
      setFocusedGroupId(groupId)
      setActiveGroup(groupId)
      commandService.setActiveGroup(groupId)
      switchTab(groupId, tabId)
      
      const currentGroup = useEditorStore.getState().editorTree
        ? findGroupNode(useEditorStore.getState().editorTree, groupId)
        : null
      const tab = currentGroup?.tabs.find((t) => t.id === tabId)
      if (tab && tab.nodeId && storyNodes.length > 0) {
        const nodeId = tab.nodeId
        const parentIds: string[] = []
        let current = storyNodes.find(n => n.id === nodeId)
        while (current?.parentId) {
          parentIds.unshift(current.parentId)
          current = storyNodes.find(n => n.id === current!.parentId)
        }
        if (parentIds.length > 0) {
          setExpandNodePath(parentIds)
        }
      }
    },
    [groupId, setFocusedGroupId, setActiveGroup, switchTab, storyNodes, setExpandNodePath]
  )

  if (!group) {
    return null
  }

  return (
    <div
      ref={groupRootRef}
      className={`editor-group ${isFocused ? 'focused' : ''}`}
      onMouseDown={() => {
        setFocusedGroupId(groupId)
        setActiveGroup(groupId)
        commandService.setActiveGroup(groupId)
      }}
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
        onTabClose={(tabId) => closeTab(groupId, tabId, confirmClose)}
        onTabContextMenu={handleContextMenu}
        onTabDragStart={tabDrag.onTabDragStart}
        onTabDragOver={tabDrag.onTabDragOver}
        onTabDragEnd={tabDrag.onTabDragEnd}
      />

      <div className="editor-container" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {tabs.length === 0 ? (
          <EmptyState onOpenWelcome={openWelcomeTab} />
        ) : (
          tabs.map((tab) => (
            <div
              key={tab.id}
              className="tab-pane"
              style={{
                display: tab.id === activeTabId ? 'flex' : 'none',
                flex: 1,
                height: '100%',
                width: '100%',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <TabContentRenderer
                tab={tab}
                groupId={groupId}
                currentProject={currentProject}
                onOpenCreateProject={openCreateProjectTab}
                onOpenFolder={openProject}
                onCreateProject={createProject}
                saveNodeContent={saveNodeContent}
                setDraft={setDraft}
                clearDraft={clearDraft}
                setDirtyTab={setDirtyTab}
              />
            </div>
          ))
        )}
      </div>

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
                    onSelect: () => splitGroup(contextMenu.groupId, 'row', contextMenu.tabId)
                  },
                  {
                    key: 'split-down',
                    label: '向下分屏',
                    onSelect: () => splitGroup(contextMenu.groupId, 'column', contextMenu.tabId)
                  }
                ]
              : []),
            ...(groupCount > 1
              ? [
                  {
                    key: 'close-group',
                    label: '关闭分屏',
                    onSelect: () => closeGroup(contextMenu.groupId)
                  }
                ]
              : []),
            {
              key: 'close',
              label: '关闭',
              onSelect: () => closeTab(contextMenu.groupId, contextMenu.tabId, confirmClose)
            },
            {
              key: 'pin',
              label: tabs.find((tab) => tab.id === contextMenu.tabId)?.isPinned
                ? '取消固定'
                : '固定',
              onSelect: () => togglePinTab(contextMenu.groupId, contextMenu.tabId)
            },
            {
              key: 'close-others',
              label: '关闭其他',
              onSelect: () => closeOtherTabs(contextMenu.groupId, contextMenu.tabId)
            },
            {
              key: 'close-all',
              label: '关闭所有',
              onSelect: () => closeAllTabs(contextMenu.groupId)
            }
          ]}
        />
      )}
    </div>
  )
}

export default EditorGroup
