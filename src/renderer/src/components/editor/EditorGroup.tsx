import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Tab } from '../../models'
import { findGroupNode } from '../../editor/editorTree'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'
import { useUiStore } from '../../stores/uiStore'
import { commandService } from '../../services/commandService'
import { triggerTabChange } from '../../services/pluginService'
import ContextMenu from '../ContextMenu'
import TabBar from './TabBar'
import { EmptyState } from './WelcomePage'
import TabContentRenderer from './TabContentRenderer'
import { useTabDrag } from './hooks/useTabDrag'

const EditorGroup: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { t } = useTranslation()
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

  // 当组获得焦点时触发 Tab 变更事件
  useEffect(() => {
    if (isFocused && group?.activeTabId) {
      const activeTab = group.tabs.find((t) => t.id === group.activeTabId)
      if (activeTab) {
        triggerTabChange(activeTab)
      }
    }
  }, [isFocused, group?.activeTabId, group?.tabs])

  const handleContextMenu = (event: React.MouseEvent, tabId: string): void => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, groupId, tabId })
  }

  const confirmClose = useCallback(
    (tab: Tab) => {
      const shouldClose = window.confirm(t('editor.confirmClose', { title: tab.title }))
      if (shouldClose && tab.type === 'file' && tab.nodeId) {
        clearDraft(tab.nodeId)
      }
      return { shouldClose }
    },
    [clearDraft, t]
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

      // 触发插件 Tab 切换事件
      triggerTabChange(tab || null)

      if (tab && tab.nodeId && storyNodes.length > 0) {
        const nodeId = tab.nodeId
        const parentIds: string[] = []
        let current = storyNodes.find((n) => n.id === nodeId)
        while (current?.parentId) {
          parentIds.unshift(current.parentId)
          current = storyNodes.find((n) => n.id === current!.parentId)
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

      <div
        className="editor-container"
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      >
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
                isActive={tab.id === activeTabId}
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
                    label: t('editor.splitRight'),
                    onSelect: () => splitGroup(contextMenu.groupId, 'row', contextMenu.tabId)
                  },
                  {
                    key: 'split-down',
                    label: t('editor.splitDown'),
                    onSelect: () => splitGroup(contextMenu.groupId, 'column', contextMenu.tabId)
                  }
                ]
              : []),
            ...(groupCount > 1
              ? [
                  {
                    key: 'close-group',
                    label: t('editor.closeSplit'),
                    onSelect: () => closeGroup(contextMenu.groupId)
                  }
                ]
              : []),
            {
              key: 'close',
              label: t('editor.closeTab'),
              onSelect: () => closeTab(contextMenu.groupId, contextMenu.tabId, confirmClose)
            },
            {
              key: 'pin',
              label: tabs.find((tab) => tab.id === contextMenu.tabId)?.isPinned
                ? t('editor.unpin')
                : t('editor.pin'),
              onSelect: () => togglePinTab(contextMenu.groupId, contextMenu.tabId)
            },
            {
              key: 'close-others',
              label: t('editor.closeOthers'),
              onSelect: () => closeOtherTabs(contextMenu.groupId, contextMenu.tabId)
            },
            {
              key: 'close-all',
              label: t('editor.closeAll'),
              onSelect: () => closeAllTabs(contextMenu.groupId)
            }
          ]}
        />
      )}
    </div>
  )
}

export default EditorGroup
