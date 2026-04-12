import React, { useCallback, useEffect, useMemo, useState } from 'react'
import TitleBar from './components/TitleBar'
import ActivityBar from './components/ActivityBar'
import Explorer from './components/Explorer'
import Editor from './components/Editor'
import RightActivityBar from './components/RightActivityBar'
import RightPanel from './components/RightPanel'
import StatusBar from './components/StatusBar'
import Sash from './components/Sash'
import {
  ActivityType,
  EditorGroupNode,
  EditorNode,
  ProjectData,
  RecentProject,
  RightActivityType,
  StoryChapter,
  StoryVolume,
  Tab
} from './models'

const LAST_PROJECT_SETTINGS_PATH_KEY = 'ssw:last-project-settings-path'

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}:${crypto.randomUUID()}`
  }
  return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`
}

const createEmptyGroup = (): EditorGroupNode => ({
  kind: 'group',
  id: createId('group'),
  tabs: [],
  activeTabId: ''
})

const countGroups = (node: EditorNode): number =>
  node.kind === 'group' ? 1 : countGroups(node.first) + countGroups(node.second)

const hasGroup = (node: EditorNode, groupId: string): boolean => {
  if (node.kind === 'group') return node.id === groupId
  return hasGroup(node.first, groupId) || hasGroup(node.second, groupId)
}

const findFirstGroupId = (node: EditorNode): string =>
  node.kind === 'group' ? node.id : findFirstGroupId(node.first)

const findGroupNode = (node: EditorNode, groupId: string): EditorGroupNode | null => {
  if (node.kind === 'group') return node.id === groupId ? node : null
  return findGroupNode(node.first, groupId) ?? findGroupNode(node.second, groupId)
}

const updateGroup = (
  node: EditorNode,
  groupId: string,
  updater: (group: EditorGroupNode) => EditorGroupNode
): EditorNode => {
  if (node.kind === 'group') {
    return node.id === groupId ? updater(node) : node
  }
  const nextFirst = updateGroup(node.first, groupId, updater)
  const nextSecond = updateGroup(node.second, groupId, updater)
  if (nextFirst === node.first && nextSecond === node.second) return node
  return { ...node, first: nextFirst, second: nextSecond }
}

const mapGroups = (
  node: EditorNode,
  mapper: (group: EditorGroupNode) => EditorGroupNode
): EditorNode => {
  if (node.kind === 'group') return mapper(node)
  return { ...node, first: mapGroups(node.first, mapper), second: mapGroups(node.second, mapper) }
}

const updateSplitRatio = (node: EditorNode, splitId: string, ratio: number): EditorNode => {
  if (node.kind === 'group') return node
  if (node.id === splitId) return { ...node, ratio }
  const nextFirst = updateSplitRatio(node.first, splitId, ratio)
  const nextSecond = updateSplitRatio(node.second, splitId, ratio)
  if (nextFirst === node.first && nextSecond === node.second) return node
  return { ...node, first: nextFirst, second: nextSecond }
}

const splitAtGroup = (
  node: EditorNode,
  groupId: string,
  direction: 'row' | 'column',
  newGroup: EditorGroupNode,
  place: 'first' | 'second' = 'second'
): EditorNode => {
  if (node.kind === 'group') {
    if (node.id !== groupId) return node
    return {
      kind: 'split',
      id: createId('split'),
      direction,
      ratio: 0.5,
      first: place === 'first' ? newGroup : node,
      second: place === 'first' ? node : newGroup
    }
  }
  const nextFirst = splitAtGroup(node.first, groupId, direction, newGroup, place)
  const nextSecond = splitAtGroup(node.second, groupId, direction, newGroup, place)
  if (nextFirst === node.first && nextSecond === node.second) return node
  return { ...node, first: nextFirst, second: nextSecond }
}

const removeGroup = (
  node: EditorNode,
  groupId: string
): { node: EditorNode | null; removed: boolean } => {
  if (node.kind === 'group') {
    return node.id === groupId ? { node: null, removed: true } : { node, removed: false }
  }

  const left = removeGroup(node.first, groupId)
  if (left.removed) {
    if (left.node === null) return { node: node.second, removed: true }
    return { node: { ...node, first: left.node }, removed: true }
  }

  const right = removeGroup(node.second, groupId)
  if (right.removed) {
    if (right.node === null) return { node: node.first, removed: true }
    return { node: { ...node, second: right.node }, removed: true }
  }

  return { node, removed: false }
}

function App(): React.JSX.Element {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )
  const [activeActivity, setActiveActivity] = useState<ActivityType>('chapter')
  const [activeRightActivity, setActiveRightActivity] = useState<RightActivityType>('proofread')
  const [isExplorerOpen, setIsExplorerOpen] = useState(true)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false)
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null)
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isProjectBusy, setIsProjectBusy] = useState(false)

  const [explorerWidth, setExplorerWidth] = useState(280)
  const [rightPanelWidth, setRightPanelWidth] = useState(300)
  const [isDragging, setIsDragging] = useState(false)
  const [initialEditor] = useState(() => {
    const root = createEmptyGroup()
    return { root, focusedGroupId: root.id }
  })
  const [editorTree, setEditorTree] = useState<EditorNode>(initialEditor.root)
  const [focusedGroupId, setFocusedGroupId] = useState<string>(initialEditor.focusedGroupId)

  useEffect(() => {
    const handleResize = (): void => {
      setViewportWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const layoutSize = useMemo(() => {
    if (viewportWidth <= 720) return 'tiny'
    if (viewportWidth <= 900) return 'narrow'
    if (viewportWidth <= 1200) return 'compact'
    return 'default'
  }, [viewportWidth])

  const updateRecentProjects = useCallback((project: ProjectData): void => {
    setRecentProjects((prev) => {
      const next = [
        { projectSettingsPath: project.projectSettingsPath, name: project.projectName },
        ...prev
      ]
      const deduped = next.filter(
        (item, index) =>
          next.findIndex(
            (candidate) => candidate.projectSettingsPath === item.projectSettingsPath
          ) === index
      )
      return deduped.slice(0, 8)
    })
  }, [])

  const handleProjectLoaded = useCallback(
    (project: ProjectData): void => {
      setCurrentProject(project)
      setErrorMessage(null)
      window.localStorage.setItem(LAST_PROJECT_SETTINGS_PATH_KEY, project.projectSettingsPath)
      updateRecentProjects(project)
      setEditorTree((prev) =>
        mapGroups(prev, (group) => {
          const nextTabs = group.tabs.filter((tab) => tab.type !== 'create-project')
          const nextActiveTabId = group.activeTabId === 'create-project' ? '' : group.activeTabId
          return group.tabs === nextTabs && group.activeTabId === nextActiveTabId
            ? group
            : { ...group, tabs: nextTabs, activeTabId: nextActiveTabId }
        })
      )
    },
    [updateRecentProjects]
  )

  const openWelcomeTab = useCallback((): void => {
    const tab: Tab = { id: 'welcome', title: '欢迎使用', type: 'welcome' }
    setEditorTree((prev) => {
      const targetGroupId = hasGroup(prev, focusedGroupId) ? focusedGroupId : findFirstGroupId(prev)
      return updateGroup(prev, targetGroupId, (group) => {
        const exists = group.tabs.some((t) => t.id === tab.id)
        const nextTabs = exists ? group.tabs : [...group.tabs, tab]
        return { ...group, tabs: nextTabs, activeTabId: tab.id }
      })
    })
  }, [focusedGroupId])

  const loadProject = useCallback(
    async (projectSettingsPath: string, showAlert = true): Promise<boolean> => {
      try {
        setIsProjectBusy(true)
        const project = await window.api.loadProject(projectSettingsPath)
        handleProjectLoaded(project)
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : '打开项目失败。'
        setErrorMessage(message)
        if (showAlert) {
          window.alert(message)
        }
        return false
      } finally {
        setIsProjectBusy(false)
      }
    },
    [handleProjectLoaded]
  )

  useEffect(() => {
    const restoreLastProject = async (): Promise<void> => {
      const lastProjectSettingsPath = window.localStorage.getItem(LAST_PROJECT_SETTINGS_PATH_KEY)
      if (lastProjectSettingsPath) {
        const loaded = await loadProject(lastProjectSettingsPath, false)
        if (loaded) {
          return
        }
        window.localStorage.removeItem(LAST_PROJECT_SETTINGS_PATH_KEY)
      }

      openWelcomeTab()
    }

    void restoreLastProject()
  }, [loadProject, openWelcomeTab])

  const handleOpenProject = async (): Promise<void> => {
    const projectSettingsPath = await window.api.openProject()
    if (projectSettingsPath) {
      await loadProject(projectSettingsPath)
    }
  }

  const openCreateProjectTab = (): void => {
    const tab: Tab = { id: 'create-project', title: '新建项目', type: 'create-project' }
    setEditorTree((prev) => {
      const targetGroupId = hasGroup(prev, focusedGroupId) ? focusedGroupId : findFirstGroupId(prev)
      setFocusedGroupId(targetGroupId)
      return updateGroup(prev, targetGroupId, (group) => {
        const exists = group.tabs.some((t) => t.id === tab.id)
        const nextTabs = exists ? group.tabs : [...group.tabs, tab]
        return { ...group, tabs: nextTabs, activeTabId: tab.id }
      })
    })
  }

  const handleOpenRecentProject = async (projectSettingsPath: string): Promise<void> => {
    await loadProject(projectSettingsPath)
  }

  const handleCreateProject = async (input: {
    projectName: string
    description: string
    projectPath: string
  }): Promise<void> => {
    try {
      setIsProjectBusy(true)
      const project = await window.api.createProject(input)
      handleProjectLoaded(project)
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建项目失败。'
      setErrorMessage(message)
      window.alert(message)
      throw error
    } finally {
      setIsProjectBusy(false)
    }
  }

  const updateProjectState = (project: ProjectData): void => {
    setCurrentProject(project)
    setErrorMessage(null)
    updateRecentProjects(project)
  }

  const handleCreateStoryNode = async (
    nodeType: 'volume' | 'chapter',
    parentVolumeId?: string
  ): Promise<void> => {
    if (!currentProject) return

    try {
      setIsProjectBusy(true)
      const project = await window.api.createStoryNode({
        projectSettingsPath: currentProject.projectSettingsPath,
        nodeType,
        parentVolumeId
      })
      updateProjectState(project)
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建失败。'
      setErrorMessage(message)
      window.alert(message)
    } finally {
      setIsProjectBusy(false)
    }
  }

  const handleRenameStoryNode = async (
    nodeType: 'volume' | 'chapter',
    nodeId: string,
    nextName: string
  ): Promise<void> => {
    if (!currentProject) return

    try {
      setIsProjectBusy(true)
      const project = await window.api.renameStoryNode({
        projectSettingsPath: currentProject.projectSettingsPath,
        nodeType,
        nodeId,
        nextName
      })
      updateProjectState(project)
    } catch (error) {
      const message = error instanceof Error ? error.message : '重命名失败。'
      setErrorMessage(message)
      window.alert(message)
    } finally {
      setIsProjectBusy(false)
    }
  }

  const handleToggleVolumeCollapsed = async (volumeId: string): Promise<void> => {
    if (!currentProject) return

    try {
      const project = await window.api.toggleVolumeCollapsed({
        projectSettingsPath: currentProject.projectSettingsPath,
        volumeId
      })
      updateProjectState(project)
    } catch (error) {
      const message = error instanceof Error ? error.message : '切换卷状态失败。'
      setErrorMessage(message)
      window.alert(message)
    }
  }

  const handleReorderVolumes = async (
    draggedVolumeId: string,
    targetVolumeId: string
  ): Promise<void> => {
    if (!currentProject || draggedVolumeId === targetVolumeId) return

    try {
      setIsProjectBusy(true)
      const project = await window.api.reorderVolumes({
        projectSettingsPath: currentProject.projectSettingsPath,
        draggedVolumeId,
        targetVolumeId
      })
      updateProjectState(project)
    } catch (error) {
      const message = error instanceof Error ? error.message : '卷排序失败。'
      setErrorMessage(message)
      window.alert(message)
    } finally {
      setIsProjectBusy(false)
    }
  }

  const handleMoveChapterToVolume = async (
    chapterId: string,
    targetVolumeId: string
  ): Promise<void> => {
    if (!currentProject) return

    try {
      setIsProjectBusy(true)
      const project = await window.api.moveChapterToVolume({
        projectSettingsPath: currentProject.projectSettingsPath,
        chapterId,
        targetVolumeId
      })
      updateProjectState(project)
    } catch (error) {
      const message = error instanceof Error ? error.message : '移动章失败。'
      setErrorMessage(message)
      window.alert(message)
    } finally {
      setIsProjectBusy(false)
    }
  }

  const handleOpenChapter = (volume: StoryVolume, chapter: StoryChapter): void => {
    if (!currentProject) return

    const path = `${currentProject.projectPath}/story/${volume.folderName}/${chapter.fileName}`
    openTab({
      id: `${volume.id}:${chapter.id}`,
      title: chapter.name,
      type: 'file',
      path
    })
  }

  const handleActivityChange = (activity: ActivityType): void => {
    if (activeActivity === activity) {
      setIsExplorerOpen(!isExplorerOpen)
    } else {
      setActiveActivity(activity)
      setIsExplorerOpen(true)
    }
  }

  const handleRightActivityChange = (activity: RightActivityType): void => {
    if (activeRightActivity === activity) {
      setIsRightSidebarOpen(!isRightSidebarOpen)
    } else {
      setActiveRightActivity(activity)
      setIsRightSidebarOpen(true)
    }
  }

  const handleExplorerResize = (deltaX: number): void => {
    setExplorerWidth((prev) => Math.max(220, Math.min(600, prev + deltaX)))
  }

  const handleRightPanelResize = (deltaX: number): void => {
    setRightPanelWidth((prev) => Math.max(150, Math.min(600, prev + deltaX)))
  }

  const openTab = (tab: Tab): void => {
    setEditorTree((prev) => {
      const targetGroupId = hasGroup(prev, focusedGroupId) ? focusedGroupId : findFirstGroupId(prev)
      return updateGroup(prev, targetGroupId, (group) => {
        const exists = group.tabs.some((item) => item.id === tab.id)
        const nextTabs = exists ? group.tabs : [...group.tabs, tab]
        return { ...group, tabs: nextTabs, activeTabId: tab.id }
      })
    })
  }

  const closeTab = (groupId: string, tabId: string): void => {
    setEditorTree((prev) =>
      updateGroup(prev, groupId, (group) => {
        const tab = group.tabs.find((item) => item.id === tabId)
        if (tab?.isDirty && !window.confirm(`${tab.title} 有未保存的更改，确定要关闭吗？`)) {
          return group
        }

        const nextTabs = group.tabs.filter((item) => item.id !== tabId)
        const nextActive =
          group.activeTabId === tabId
            ? (nextTabs[nextTabs.length - 1]?.id ?? '')
            : group.activeTabId
        return { ...group, tabs: nextTabs, activeTabId: nextActive }
      })
    )
  }

  const closeOtherTabs = (groupId: string, tabId: string): void => {
    setEditorTree((prev) =>
      updateGroup(prev, groupId, (group) => {
        const nextTabs = group.tabs.filter((tab) => tab.id === tabId || tab.isPinned)
        return { ...group, tabs: nextTabs, activeTabId: tabId }
      })
    )
  }

  const closeAllTabs = (groupId: string): void => {
    setEditorTree((prev) =>
      updateGroup(prev, groupId, (group) => {
        const nextTabs = group.tabs.filter((tab) => tab.isPinned)
        return { ...group, tabs: nextTabs, activeTabId: nextTabs[0]?.id ?? '' }
      })
    )
  }

  const togglePinTab = (groupId: string, tabId: string): void => {
    setEditorTree((prev) =>
      updateGroup(prev, groupId, (group) => ({
        ...group,
        tabs: group.tabs.map((tab) =>
          tab.id === tabId ? { ...tab, isPinned: !tab.isPinned } : tab
        )
      }))
    )
  }

  const toggleDirtyTab = (groupId: string, tabId: string): void => {
    setEditorTree((prev) =>
      updateGroup(prev, groupId, (group) => ({
        ...group,
        tabs: group.tabs.map((tab) => (tab.id === tabId ? { ...tab, isDirty: !tab.isDirty } : tab))
      }))
    )
  }

  const reorderTabs = (groupId: string, draggedId: string, targetId: string): void => {
    setEditorTree((prev) =>
      updateGroup(prev, groupId, (group) => {
        const draggedIndex = group.tabs.findIndex((tab) => tab.id === draggedId)
        const targetIndex = group.tabs.findIndex((tab) => tab.id === targetId)
        if (draggedIndex === -1 || targetIndex === -1) return group

        const nextTabs = [...group.tabs]
        const [draggedTab] = nextTabs.splice(draggedIndex, 1)
        nextTabs.splice(targetIndex, 0, draggedTab)
        return { ...group, tabs: nextTabs }
      })
    )
  }

  const moveTab = (
    fromGroupId: string,
    toGroupId: string,
    tabId: string,
    beforeTabId?: string
  ): void => {
    setEditorTree((prev) => {
      if (fromGroupId === toGroupId) return prev

      let movedTab: Tab | undefined
      const withoutSource = updateGroup(prev, fromGroupId, (group) => {
        const tab = group.tabs.find((t) => t.id === tabId)
        if (!tab) return group
        movedTab = tab
        const nextTabs = group.tabs.filter((t) => t.id !== tabId)
        const nextActiveTabId =
          group.activeTabId === tabId
            ? (nextTabs[nextTabs.length - 1]?.id ?? '')
            : group.activeTabId
        return { ...group, tabs: nextTabs, activeTabId: nextActiveTabId }
      })

      if (!movedTab) return prev

      const next = updateGroup(withoutSource, toGroupId, (group) => {
        if (group.tabs.some((t) => t.id === movedTab!.id)) {
          return { ...group, activeTabId: movedTab!.id }
        }
        const nextTabs = [...group.tabs]
        const insertIndex = beforeTabId ? nextTabs.findIndex((t) => t.id === beforeTabId) : -1
        if (insertIndex === -1) {
          nextTabs.push(movedTab!)
        } else {
          nextTabs.splice(Math.max(0, insertIndex), 0, movedTab!)
        }
        return { ...group, tabs: nextTabs, activeTabId: movedTab!.id }
      })

      setFocusedGroupId(toGroupId)
      return next
    })
  }

  const dockTabToSplit = (
    fromGroupId: string,
    targetGroupId: string,
    tabId: string,
    side: 'left' | 'right' | 'top' | 'bottom'
  ): void => {
    setEditorTree((prev) => {
      if (fromGroupId === targetGroupId) return prev

      let movedTab: Tab | undefined
      const withoutSource = updateGroup(prev, fromGroupId, (group) => {
        const tab = group.tabs.find((t) => t.id === tabId)
        if (!tab) return group
        movedTab = tab
        const nextTabs = group.tabs.filter((t) => t.id !== tabId)
        const nextActiveTabId =
          group.activeTabId === tabId
            ? (nextTabs[nextTabs.length - 1]?.id ?? '')
            : group.activeTabId
        return { ...group, tabs: nextTabs, activeTabId: nextActiveTabId }
      })

      if (!movedTab) return prev

      const newGroup: EditorGroupNode = {
        kind: 'group',
        id: createId('group'),
        tabs: [movedTab],
        activeTabId: movedTab.id
      }

      const direction: 'row' | 'column' = side === 'left' || side === 'right' ? 'row' : 'column'
      const place: 'first' | 'second' = side === 'left' || side === 'top' ? 'first' : 'second'
      const next = splitAtGroup(withoutSource, targetGroupId, direction, newGroup, place)
      setFocusedGroupId(newGroup.id)
      return next
    })
  }

  const switchTab = (groupId: string, tabId: string): void => {
    setEditorTree((prev) =>
      updateGroup(prev, groupId, (group) => ({ ...group, activeTabId: tabId }))
    )
  }

  const splitGroup = (groupId: string, direction: 'row' | 'column', tabId?: string): void => {
    setEditorTree((prev) => {
      const sourceGroup = tabId ? findGroupNode(prev, groupId) : null
      const tab = tabId ? sourceGroup?.tabs.find((t) => t.id === tabId) : undefined
      const newGroup: EditorGroupNode = tab
        ? { kind: 'group', id: createId('group'), tabs: [tab], activeTabId: tab.id }
        : createEmptyGroup()
      const nextTree = splitAtGroup(prev, groupId, direction, newGroup, 'second')
      setFocusedGroupId(newGroup.id)
      return nextTree
    })
  }

  const closeGroup = (groupId: string): void => {
    setEditorTree((prev) => {
      if (countGroups(prev) <= 1) return prev
      const next = removeGroup(prev, groupId).node
      if (!next) return prev
      if (!hasGroup(next, focusedGroupId)) {
        setFocusedGroupId(findFirstGroupId(next))
      }
      return next
    })
  }

  const resizeSplit = (splitId: string, ratio: number): void => {
    setEditorTree((prev) => updateSplitRatio(prev, splitId, clamp(ratio, 0.1, 0.9)))
  }

  return (
    <>
      <svg style={{ display: 'none' }}>
        <defs>
          <linearGradient
            id="brandGradient"
            x1="-344.92"
            y1="2136.1"
            x2="1972.3"
            y2="47.63"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#30cfd0" />
            <stop offset="1" stopColor="#330867" />
          </linearGradient>
        </defs>
      </svg>

      <div className={`app-container ${isDragging ? 'dragging' : ''} layout-${layoutSize}`}>
        <TitleBar onOpenWelcome={openWelcomeTab} />
        <div className="main-area">
          <ActivityBar
            activeActivity={activeActivity}
            onActivityChange={handleActivityChange}
            isOpen={isExplorerOpen}
          />
          <div style={{ position: 'relative', display: 'flex', height: '100%' }}>
            <Explorer
              activeActivity={activeActivity}
              currentProject={currentProject}
              recentProjects={recentProjects}
              onOpenFolder={handleOpenProject}
              onOpenRecentProject={handleOpenRecentProject}
              onOpenCreateProject={openCreateProjectTab}
              onOpenChapter={handleOpenChapter}
              onCreateStoryNode={handleCreateStoryNode}
              onRenameStoryNode={handleRenameStoryNode}
              onToggleVolumeCollapsed={handleToggleVolumeCollapsed}
              onReorderVolumes={handleReorderVolumes}
              onMoveChapterToVolume={handleMoveChapterToVolume}
              isOpen={isExplorerOpen}
              width={explorerWidth}
              isBusy={isProjectBusy}
              errorMessage={errorMessage}
            />
            {isExplorerOpen && (
              <Sash
                side="left"
                onResize={handleExplorerResize}
                setIsDraggingGlobal={setIsDragging}
              />
            )}
          </div>

          <Editor
            currentProject={currentProject}
            onOpenFolder={handleOpenProject}
            onOpenWelcome={openWelcomeTab}
            onOpenCreateProject={openCreateProjectTab}
            onCreateProject={handleCreateProject}
            onPickProjectPath={() => window.api.pickProjectPath()}
            editorTree={editorTree}
            focusedGroupId={focusedGroupId}
            groupCount={countGroups(editorTree)}
            onFocusGroup={setFocusedGroupId}
            onTabSwitch={switchTab}
            onTabClose={closeTab}
            onCloseOthers={closeOtherTabs}
            onCloseAll={closeAllTabs}
            onPinTab={togglePinTab}
            onDirtyTab={toggleDirtyTab}
            onReorderTabs={reorderTabs}
            onMoveTab={moveTab}
            onDockTabToSplit={dockTabToSplit}
            onSplitGroup={splitGroup}
            onCloseGroup={closeGroup}
            onResizeSplit={resizeSplit}
          />

          <div style={{ display: 'flex', height: '100%' }}>
            <div style={{ position: 'relative', display: 'flex', height: '100%' }}>
              {isRightSidebarOpen && (
                <Sash
                  side="right"
                  onResize={handleRightPanelResize}
                  setIsDraggingGlobal={setIsDragging}
                />
              )}
              <RightPanel
                activeActivity={activeRightActivity}
                isOpen={isRightSidebarOpen}
                width={rightPanelWidth}
              />
            </div>
            <RightActivityBar
              activeActivity={activeRightActivity}
              onActivityChange={handleRightActivityChange}
              isOpen={isRightSidebarOpen}
            />
          </div>
        </div>
        <StatusBar />
      </div>
    </>
  )
}

export default App
