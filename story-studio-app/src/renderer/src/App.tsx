import React, { useCallback, useEffect, useMemo, useState } from 'react'
import TitleBar from './components/TitleBar'
import ActivityBar from './components/ActivityBar'
import Explorer from './components/Explorer'
import Editor from './components/Editor'
import RightActivityBar from './components/RightActivityBar'
import RightPanel from './components/RightPanel'
import StatusBar from './components/StatusBar'
import Sash from './components/Sash'

export type ActivityType = 'chapter' | 'character' | 'setting' | 'plugin'
export type RightActivityType = 'proofread' | 'memo' | 'archive'

export interface StoryChapter {
  id: string
  name: string
  fileName: string
}

export interface StoryVolume {
  id: string
  name: string
  folderName: string
  collapsed: boolean
  chapters: StoryChapter[]
}

export interface ProjectData {
  version: number
  projectName: string
  description: string
  projectPath: string
  projectSettingsPath: string
  storyVolumes: StoryVolume[]
}

export interface RecentProject {
  projectSettingsPath: string
  name: string
}

export interface Tab {
  id: string
  title: string
  type: 'welcome' | 'file' | 'create-project'
  path?: string
  isDirty?: boolean
  isPinned?: boolean
}

const LAST_PROJECT_SETTINGS_PATH_KEY = 'ssw:last-project-settings-path'

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

  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string>('')

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

  const updateRecentProjects = (project: ProjectData): void => {
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
  }

  const handleProjectLoaded = useCallback((project: ProjectData): void => {
    setCurrentProject(project)
    setErrorMessage(null)
    window.localStorage.setItem(LAST_PROJECT_SETTINGS_PATH_KEY, project.projectSettingsPath)
    updateRecentProjects(project)
    setTabs((prev) => {
      const withoutCreateTab = prev.filter((tab) => tab.type !== 'create-project')
      return withoutCreateTab
    })
    setActiveTabId((prev) => (prev === 'create-project' ? '' : prev))
  }, [])

  const openWelcomeTab = useCallback((): void => {
    setTabs((prev) => {
      if (prev.some((tab) => tab.id === 'welcome')) {
        return prev
      }
      return [...prev, { id: 'welcome', title: '欢迎使用', type: 'welcome' }]
    })
    setActiveTabId('welcome')
  }, [])

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
    setTabs((prev) => {
      if (prev.some((tab) => tab.id === 'create-project')) {
        return prev
      }
      return [...prev, { id: 'create-project', title: '新建项目', type: 'create-project' }]
    })
    setActiveTabId('create-project')
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
    setTabs((prev) => {
      if (prev.some((item) => item.id === tab.id)) {
        return prev
      }
      return [...prev, tab]
    })
    setActiveTabId(tab.id)
  }

  const closeTab = (e: React.MouseEvent, tabId: string): void => {
    e.stopPropagation()
    const tab = tabs.find((item) => item.id === tabId)
    if (tab?.isDirty && !window.confirm(`${tab.title} 有未保存的更改，确定要关闭吗？`)) {
      return
    }

    const newTabs = tabs.filter((item) => item.id !== tabId)
    setTabs(newTabs)

    if (activeTabId === tabId) {
      const fallback = newTabs[newTabs.length - 1]
      setActiveTabId(fallback?.id ?? '')
    }
  }

  const closeOtherTabs = (tabId: string): void => {
    const newTabs = tabs.filter((tab) => tab.id === tabId || tab.isPinned)
    setTabs(newTabs)
    setActiveTabId(tabId)
  }

  const closeAllTabs = (): void => {
    const newTabs = tabs.filter((tab) => tab.isPinned)
    setTabs(newTabs)
    setActiveTabId(newTabs[0]?.id ?? '')
  }

  const togglePinTab = (tabId: string): void => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, isPinned: !tab.isPinned } : tab))
    )
  }

  const toggleDirtyTab = (tabId: string): void => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, isDirty: !tab.isDirty } : tab))
    )
  }

  const reorderTabs = (draggedId: string, targetId: string): void => {
    const draggedIndex = tabs.findIndex((tab) => tab.id === draggedId)
    const targetIndex = tabs.findIndex((tab) => tab.id === targetId)
    if (draggedIndex === -1 || targetIndex === -1) return

    const newTabs = [...tabs]
    const [draggedTab] = newTabs.splice(draggedIndex, 1)
    newTabs.splice(targetIndex, 0, draggedTab)
    setTabs(newTabs)
  }

  const switchTab = (tabId: string): void => {
    setActiveTabId(tabId)
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
            tabs={tabs}
            activeTabId={activeTabId}
            onTabSwitch={switchTab}
            onTabClose={closeTab}
            onCloseOthers={closeOtherTabs}
            onCloseAll={closeAllTabs}
            onPinTab={togglePinTab}
            onDirtyTab={toggleDirtyTab}
            onReorderTabs={reorderTabs}
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
