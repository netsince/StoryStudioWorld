import React, { useEffect, useMemo, useState } from 'react'
import { ActivityType, ProjectData, RecentProject, StoryChapter, StoryVolume } from '../App'
import ContextMenu from './ContextMenu'

interface ExplorerProps {
  activeActivity: ActivityType
  currentProject: ProjectData | null
  recentProjects: RecentProject[]
  onOpenFolder: () => void
  onOpenRecentProject: (projectSettingsPath: string) => Promise<void>
  onOpenCreateProject: () => void
  onOpenChapter: (volume: StoryVolume, chapter: StoryChapter) => void
  onCreateStoryNode: (nodeType: 'volume' | 'chapter', parentVolumeId?: string) => Promise<void>
  onRenameStoryNode: (
    nodeType: 'volume' | 'chapter',
    nodeId: string,
    nextName: string
  ) => Promise<void>
  onToggleVolumeCollapsed: (volumeId: string) => Promise<void>
  onReorderVolumes: (draggedVolumeId: string, targetVolumeId: string) => Promise<void>
  onMoveChapterToVolume: (chapterId: string, targetVolumeId: string) => Promise<void>
  isOpen: boolean
  width: number
  isBusy: boolean
  errorMessage: string | null
}

type SelectedNode =
  | { type: 'volume'; volumeId: string }
  | { type: 'chapter'; volumeId: string; chapterId: string }
  | null

const Explorer: React.FC<ExplorerProps> = ({
  activeActivity,
  currentProject,
  recentProjects,
  onOpenFolder,
  onOpenRecentProject,
  onOpenCreateProject,
  onOpenChapter,
  onCreateStoryNode,
  onRenameStoryNode,
  onToggleVolumeCollapsed,
  onReorderVolumes,
  onMoveChapterToVolume,
  isOpen,
  width,
  isBusy,
  errorMessage
}) => {
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null)
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const [draggingVolumeId, setDraggingVolumeId] = useState<string | null>(null)
  const [draggingChapterId, setDraggingChapterId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    nodeType: 'volume' | 'chapter'
    nodeId: string
  } | null>(null)

  useEffect(() => {
    const closeMenus = (): void => {
      setIsCreateMenuOpen(false)
      setContextMenu(null)
    }

    window.addEventListener('click', closeMenus)
    return () => window.removeEventListener('click', closeMenus)
  }, [])

  const activityTitle = useMemo(() => {
    switch (activeActivity) {
      case 'chapter':
        return '编写'
      case 'character':
        return '角色管理'
      case 'setting':
        return '世界设定'
      case 'plugin':
        return '插件中心'
      default:
        return '编写'
    }
  }, [activeActivity])

  const activeVolumeId =
    selectedNode?.type === 'volume'
      ? selectedNode.volumeId
      : selectedNode?.type === 'chapter'
        ? selectedNode.volumeId
        : currentProject?.storyVolumes[0]?.id

  const handleCreateChapter = async (): Promise<void> => {
    setIsCreateMenuOpen(false)
    await onCreateStoryNode('chapter', activeVolumeId)
  }

  const handleRename = async (): Promise<void> => {
    if (!contextMenu || !currentProject) return

    const volume = currentProject.storyVolumes.find((item) => item.id === contextMenu.nodeId)
    const chapter = currentProject.storyVolumes
      .flatMap((item) => item.chapters)
      .find((item) => item.id === contextMenu.nodeId)
    const currentName =
      contextMenu.nodeType === 'volume' ? (volume?.name ?? '') : (chapter?.name ?? '')
    const promptText = contextMenu.nodeType === 'volume' ? '输入卷名：' : '输入章名：'
    const nextName = window.prompt(promptText, currentName)

    setContextMenu(null)

    if (nextName === null) return
    await onRenameStoryNode(contextMenu.nodeType, contextMenu.nodeId, nextName)
  }

  const renderStoryTree = (): React.ReactNode => {
    if (!currentProject) {
      return (
        <div className="explorer-content">
          <div className="explorer-text-group">您尚未打开任何项目。</div>
          <button className="action-button" onClick={onOpenCreateProject}>
            新建项目
          </button>
          <button className="action-button secondary" onClick={onOpenFolder}>
            打开项目
          </button>
        </div>
      )
    }

    return (
      <div className="explorer-story">
        <div className="story-toolbar-panel">
          <div className="story-toolbar">
            <div className="story-toolbar-actions">
              <button
                className="action-button story-action-button"
                title="新建"
                disabled={isBusy}
                onClick={(event) => {
                  event.stopPropagation()
                  setIsCreateMenuOpen((prev) => !prev)
                }}
              >
                <svg className="icon icon-sm" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              {isCreateMenuOpen && (
                <div
                  className="context-menu story-create-menu"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="menu-item" onClick={() => void onCreateStoryNode('volume')}>
                    卷
                  </div>
                  <div className="menu-item" onClick={() => void handleCreateChapter()}>
                    章
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="story-list-panel">
          <div className="story-tree">
            {currentProject.storyVolumes.map((volume, index) => {
              const volumeLabel = volume.name.trim()
                ? `第${index}卷 {${volume.name.trim()}}`
                : `第${index}卷`
              const isVolumeSelected =
                selectedNode?.type === 'volume' && selectedNode.volumeId === volume.id

              return (
                <div
                  key={volume.id}
                  className="story-volume-group"
                  onDragOver={(event) => {
                    event.preventDefault()
                    if (draggingChapterId) {
                      event.dataTransfer.dropEffect = 'move'
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (draggingChapterId) {
                      void onMoveChapterToVolume(draggingChapterId, volume.id)
                      setDraggingChapterId(null)
                    }
                  }}
                >
                  <div
                    className={`story-tree-item volume ${isVolumeSelected ? 'selected' : ''}`}
                    draggable
                    onClick={() => setSelectedNode({ type: 'volume', volumeId: volume.id })}
                    onDoubleClick={() => void onToggleVolumeCollapsed(volume.id)}
                    onDragStart={(event) => {
                      setDraggingVolumeId(volume.id)
                      event.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragOver={(event) => {
                      event.preventDefault()
                      if (draggingVolumeId) {
                        event.dataTransfer.dropEffect = 'move'
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (draggingVolumeId) {
                        void onReorderVolumes(draggingVolumeId, volume.id)
                        setDraggingVolumeId(null)
                      }
                    }}
                    onDragEnd={() => setDraggingVolumeId(null)}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      setContextMenu({
                        x: event.clientX,
                        y: event.clientY,
                        nodeType: 'volume',
                        nodeId: volume.id
                      })
                    }}
                  >
                    <button
                      className={`story-toggle ${volume.collapsed ? 'collapsed' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        void onToggleVolumeCollapsed(volume.id)
                      }}
                    >
                      {volume.collapsed ? '▸' : '▾'}
                    </button>
                    <span className="story-label">{volumeLabel}</span>
                  </div>

                  {!volume.collapsed &&
                    volume.chapters.map((chapter) => {
                      const isChapterSelected =
                        selectedNode?.type === 'chapter' && selectedNode.chapterId === chapter.id

                      return (
                        <div
                          key={chapter.id}
                          className={`story-tree-item chapter ${isChapterSelected ? 'selected' : ''}`}
                          draggable
                          onClick={() => {
                            setSelectedNode({
                              type: 'chapter',
                              volumeId: volume.id,
                              chapterId: chapter.id
                            })
                            onOpenChapter(volume, chapter)
                          }}
                          onDragStart={(event) => {
                            setDraggingChapterId(chapter.id)
                            event.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragEnd={() => setDraggingChapterId(null)}
                          onContextMenu={(event) => {
                            event.preventDefault()
                            setContextMenu({
                              x: event.clientX,
                              y: event.clientY,
                              nodeType: 'chapter',
                              nodeId: chapter.id
                            })
                          }}
                        >
                          <span className="story-indent" />
                          <span className="story-label">{chapter.name}</span>
                        </div>
                      )
                    })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`explorer-panel ${isOpen ? 'open' : ''}`}
      style={{ width: `${isOpen ? width : 0}px` }}
    >
      <div
        className="panel-inner"
        style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
      >
        <div className="explorer-header">{activityTitle}</div>

        <div className="explorer-body">
          {activeActivity === 'chapter' ? (
            <>
              <div className="explorer-static-section">
                {renderStoryTree()}

                {errorMessage && <div className="explorer-inline-error">{errorMessage}</div>}

                {!currentProject && (
                  <div className="explorer-recent-section">
                    <div className="explorer-header" style={{ padding: '0 15px 10px 15px' }}>
                      最近的项目
                    </div>
                    {recentProjects.length === 0 ? (
                      <div className="explorer-list-item muted">暂无最近项目</div>
                    ) : (
                      recentProjects.map((project) => (
                        <div
                          key={project.projectSettingsPath}
                          className="explorer-list-item"
                          onClick={() => void onOpenRecentProject(project.projectSettingsPath)}
                        >
                          <svg className="icon icon-sm" viewBox="0 0 24 24">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                          </svg>
                          {project.name}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="explorer-content">
              <div className="dev-placeholder-title">{activityTitle}</div>
              <div className="dev-placeholder-text">功能开发中...</div>
            </div>
          )}
        </div>

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={[
              {
                key: 'rename',
                label: '重命名',
                onSelect: () => void handleRename()
              }
            ]}
          />
        )}
      </div>
    </div>
  )
}

export default Explorer
