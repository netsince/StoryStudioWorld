import React, { useCallback, useEffect, useState } from 'react'
import TitleBar from './components/TitleBar'
import ActivityBar from './components/ActivityBar'
import Explorer from './components/Explorer'
import Editor from './components/Editor'
import RightActivityBar from './components/RightActivityBar'
import RightPanel from './components/RightPanel'
import StatusBar from './components/StatusBar'
import Sash from './components/Sash'
import { StatusbarProvider } from './contexts/StatusbarContext'
import type { ActivityType, RightActivityType, StoryNode } from './models'
import { useEditorTree } from './hooks/useEditorTree'
import { useProjectManager } from './hooks/useProjectManager'
import { useResponsiveLayout } from './hooks/useResponsiveLayout'

function App(): React.JSX.Element {
  const [activeActivity, setActiveActivity] = useState<ActivityType>('chapter')
  const [activeRightActivity, setActiveRightActivity] = useState<RightActivityType>('proofread')
  const [isExplorerOpen, setIsExplorerOpen] = useState(true)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false)
  const closeRightSidebar = useCallback((): void => setIsRightSidebarOpen(false), [])

  const editor = useEditorTree()
  const project = useProjectManager(editor.removeCreateProjectTabs)
  const layout = useResponsiveLayout(isRightSidebarOpen, closeRightSidebar)

  useEffect(() => {
    const restoreLastProject = async (): Promise<void> => {
      const lastProjectSettingsPath = project.lastProjectMarker()
      if (lastProjectSettingsPath) {
        const loaded = await project.loadProject(lastProjectSettingsPath, false)
        if (loaded) return
        project.clearLastProjectMarker()
      }

      editor.openWelcomeTab()
    }

    void restoreLastProject()
  }, [project.clearLastProjectMarker, project.lastProjectMarker, project.loadProject, editor.openWelcomeTab])

  const handleOpenChapter = useCallback(
    (node: StoryNode): void => {
      if (!project.currentProject || node.type !== 'file') return
      editor.openTab({ id: node.id, title: node.name, type: 'file', nodeId: node.id })
    },
    [project.currentProject, editor.openTab]
  )

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

      <StatusbarProvider>
        <div
          className={`app-container ${layout.isDragging ? 'dragging' : ''} layout-${layout.layoutSize}`}
        >
          <TitleBar onOpenWelcome={editor.openWelcomeTab} />
          <div className="main-area">
            <ActivityBar
              activeActivity={activeActivity}
              onActivityChange={handleActivityChange}
              isOpen={isExplorerOpen}
            />
            <div style={{ position: 'relative', display: 'flex', height: '100%' }}>
              <Explorer
                activeActivity={activeActivity}
                currentProject={project.currentProject}
                storyNodes={project.storyNodes}
                recentProjects={project.recentProjects}
                onOpenFolder={project.openProject}
                onOpenRecentProject={project.openRecentProject}
                onOpenCreateProject={editor.openCreateProjectTab}
                onOpenChapter={handleOpenChapter}
                onCreateStoryNode={project.createStoryNode}
                onRenameStoryNode={project.renameStoryNode}
                onDeleteStoryNode={project.deleteStoryNode}
                onMoveStoryNode={project.moveStoryNode}
                onReorderStoryNode={project.reorderStoryNode}
                isOpen={isExplorerOpen}
                width={layout.explorerWidth}
                isBusy={project.isProjectBusy}
                errorMessage={project.errorMessage}
              />
              {isExplorerOpen && (
                <Sash
                  side="left"
                  onResize={layout.handleExplorerResize}
                  setIsDraggingGlobal={layout.setIsDragging}
                />
              )}
            </div>

            <Editor
              currentProject={project.currentProject}
              onOpenFolder={project.openProject}
              onOpenWelcome={editor.openWelcomeTab}
              onOpenCreateProject={editor.openCreateProjectTab}
              onCreateProject={project.createProject}
              onPickProjectPath={() => window.api.pickProjectPath()}
              onSaveNodeContent={project.saveNodeContent}
              editorTree={editor.editorTree}
              focusedGroupId={editor.focusedGroupId}
              groupCount={editor.groupCount}
              onFocusGroup={editor.setFocusedGroupId}
              onTabSwitch={editor.switchTab}
              onTabClose={editor.closeTab}
              onCloseOthers={editor.closeOtherTabs}
              onCloseAll={editor.closeAllTabs}
              onPinTab={editor.togglePinTab}
              onSetDirtyTab={editor.setDirtyTab}
              onReorderTabs={editor.reorderTabs}
              onMoveTab={editor.moveTab}
              onDockTabToSplit={editor.dockTabToSplit}
              onSplitGroup={editor.splitGroup}
              onCloseGroup={editor.closeGroup}
              onResizeSplit={editor.resizeSplit}
            />

            <div style={{ display: 'flex', height: '100%' }}>
              <div style={{ position: 'relative', display: 'flex', height: '100%' }}>
                {isRightSidebarOpen && (
                  <Sash
                    side="right"
                    onResize={layout.handleRightPanelResize}
                    setIsDraggingGlobal={layout.setIsDragging}
                  />
                )}
                <RightPanel
                  activeActivity={activeRightActivity}
                  isOpen={isRightSidebarOpen}
                  width={layout.rightPanelWidth}
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
      </StatusbarProvider>
    </>
  )
}

export default App
