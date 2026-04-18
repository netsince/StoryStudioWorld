import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Tab } from '../../models'
import { findGroupNode } from '../../editor/editorTree'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'
import ContextMenu from '../ContextMenu'
import PlainTextEditor from '../PlainTextEditor'
import CreateProjectForm from './CreateProjectForm'
import TabBar from './TabBar'
import WelcomePage, { EmptyState } from './WelcomePage'
import AboutPage from './AboutPage'
import PreferencesPage from './PreferencesPage'
import { useTabDrag } from './hooks/useTabDrag'

const EditorGroup: React.FC<{ groupId: string }> = ({ groupId }) => {
  const groupRootRef = useRef<HTMLDivElement>(null)
  const [editorContent, setEditorContent] = useState<string>('')

  const currentProject = useProjectStore((s) => s.currentProject)
  const openProject = useProjectStore((s) => s.openProject)
  const createProject = useProjectStore((s) => s.createProject)
  const saveNodeContent = useProjectStore((s) => s.saveNodeContent)
  const setDraft = useProjectStore((s) => s.setDraft)
  const clearDraft = useProjectStore((s) => s.clearDraft)

  const group = useEditorStore(useCallback((s) => findGroupNode(s.editorTree, groupId), [groupId]))
  const focusedGroupId = useEditorStore((s) => s.focusedGroupId)
  const groupCount = useEditorStore((s) => s.groupCount())
  const setFocusedGroupId = useEditorStore((s) => s.setFocusedGroupId)
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

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId), [activeTabId, tabs])

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

  useEffect(() => {
    const loadContent = async (): Promise<void> => {
      if (activeTab?.type === 'file' && activeTab.nodeId && currentProject) {
        const draft = useProjectStore.getState().draftsByNodeId[activeTab.nodeId]
        if (typeof draft === 'string') {
          setEditorContent(draft)
          return
        }

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
    if (activeTab?.type === 'file') {
      setDirtyTab(groupId, activeTab.id, true)
      if (activeTab.nodeId) {
        setDraft(activeTab.nodeId, content)
      }
    }
  }

  const handleSave = async (): Promise<void> => {
    if (activeTab?.type === 'file' && activeTab.nodeId && currentProject) {
      await saveNodeContent(activeTab.nodeId, editorContent)
      setDirtyTab(groupId, activeTab.id, false)
      clearDraft(activeTab.nodeId)
    }
  }

  const renderFile = (): React.ReactNode => (
    <div className="editor-content">
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
      return <EmptyState onOpenWelcome={openWelcomeTab} />
    }

    if (activeTab.type === 'welcome') {
      return (
        <WelcomePage
          currentProject={currentProject}
          onOpenCreateProject={openCreateProjectTab}
          onOpenFolder={openProject}
        />
      )
    }

    if (activeTab.type === 'create-project') {
      return <CreateProjectForm onCreateProject={createProject} onPickProjectPath={() => window.api.pickProjectPath()} />
    }

    if (activeTab.type === 'about') {
      return <AboutPage />
    }

    if (activeTab.type === 'preferences') {
      return <PreferencesPage />
    }

    return renderFile()
  }

  const onTabClick = useCallback(
    (tabId: string): void => {
      setFocusedGroupId(groupId)
      switchTab(groupId, tabId)
    },
    [groupId, setFocusedGroupId, switchTab]
  )

  if (!group) {
    return null
  }

  return (
    <div
      ref={groupRootRef}
      className={`editor-group ${isFocused ? 'focused' : ''}`}
      onMouseDown={() => setFocusedGroupId(groupId)}
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
              label: tabs.find((tab) => tab.id === contextMenu.tabId)?.isPinned ? '取消固定' : '固定',
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

      {renderContent()}
    </div>
  )
}

export default EditorGroup
