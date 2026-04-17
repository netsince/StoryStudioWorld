import React, { useMemo, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { StoryNode } from '../models'
import { useEditorStore } from '../stores/editorStore'
import { useLayoutStore } from '../stores/layoutStore'
import { useProjectStore } from '../stores/projectStore'
import { useUiStore } from '../stores/uiStore'
import Tree from './Tree'
import Sidebar from './Sidebar'

interface CreateMenuPortalProps {
  onClose: () => void
  onCreateFolder: () => void
  onCreateFile: () => void
}

const CreateMenuPortal: React.FC<CreateMenuPortalProps> = ({ onClose, onCreateFolder, onCreateFile }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const button = document.querySelector('.story-action-button') as HTMLElement
    if (button) {
      const rect = button.getBoundingClientRect()
      setPosition({ top: rect.bottom + 4, left: rect.left })
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  if (!position) return null

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 999999,
        background: 'var(--panel-bg, #252526)',
        border: '1px solid var(--border-color, #454545)',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        minWidth: '120px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          padding: '8px 16px',
          cursor: 'pointer',
          fontSize: '13px',
          color: 'var(--foreground, #ccc)',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--list-hover-background, #2a2d2e)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
        onClick={() => {
          onCreateFolder()
          onClose()
        }}
      >
        📁 文件夹
      </div>
      <div
        style={{
          padding: '8px 16px',
          cursor: 'pointer',
          fontSize: '13px',
          color: 'var(--foreground, #ccc)',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--list-hover-background, #2a2d2e)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
        onClick={() => {
          onCreateFile()
          onClose()
        }}
      >
        📄 章
      </div>
    </div>,
    document.body
  )
}

const Explorer: React.FC = () => {
  const activeActivity = useUiStore((s) => s.activeActivity)
  const isOpen = useUiStore((s) => s.isExplorerOpen)
  const width = useLayoutStore((s) => s.explorerWidth)

  const currentProject = useProjectStore((s) => s.currentProject)
  const storyNodes = useProjectStore((s) => s.storyNodes)
  const recentProjects = useProjectStore((s) => s.recentProjects)
  const isBusy = useProjectStore((s) => s.isProjectBusy)
  const errorMessage = useProjectStore((s) => s.errorMessage)
  const onOpenFolder = useProjectStore((s) => s.openProject)
  const onOpenRecentProject = useProjectStore((s) => s.openRecentProject)
  const onCreateStoryNode = useProjectStore((s) => s.createStoryNode)
  const onRenameStoryNode = useProjectStore((s) => s.renameStoryNode)
  const onDeleteStoryNode = useProjectStore((s) => s.deleteStoryNode)
  const onMoveStoryNode = useProjectStore((s) => s.moveStoryNode)
  const onReorderStoryNode = useProjectStore((s) => s.reorderStoryNode)

  const onOpenCreateProject = useEditorStore((s) => s.openCreateProjectTab)
  const openTab = useEditorStore((s) => s.openTab)

  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)

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

  const handleCreateNode = async (type: 'folder' | 'file'): Promise<void> => {
    let name: string
    if (type === 'folder') {
      name = '新文件夹'
    } else {
      const fileCount = storyNodes.filter((n) => n.type === 'file').length
      name = `第${fileCount + 1}章`
    }
    await onCreateStoryNode(null, name, type)
    setIsCreateMenuOpen(false)
  }

  const onOpenChapter = (node: StoryNode): void => {
    if (!currentProject || node.type !== 'file') return
    openTab({ id: node.id, title: node.name, type: 'file', nodeId: node.id })
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
      <div className="explorer-story" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="story-toolbar-panel" style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="story-toolbar" style={{ display: 'flex', alignItems: 'center' }}>
            <div className="story-toolbar-actions" style={{ position: 'relative' }}>
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
                <CreateMenuPortal
                  onClose={() => setIsCreateMenuOpen(false)}
                  onCreateFolder={() => void handleCreateNode('folder')}
                  onCreateFile={() => void handleCreateNode('file')}
                />
              )}
            </div>
          </div>
        </div>

        <div className="story-list-panel" style={{ flex: 1, overflow: 'hidden' }}>
          <Tree
            nodes={storyNodes}
            onOpenChapter={onOpenChapter}
            onMoveNode={onMoveStoryNode}
            onReorderNode={onReorderStoryNode}
            onRenameNode={onRenameStoryNode}
            onDeleteNode={onDeleteStoryNode}
          />
        </div>
      </div>
    )
  }

  return (
    <Sidebar isOpen={isOpen} width={width} side="left" className="explorer-panel">
      <div className="explorer-header">{activityTitle}</div>

        <div className="explorer-body" style={{ height: 'calc(100% - 40px)' }}>
          {activeActivity === 'chapter' ? (
            <>
              <div className="explorer-static-section" style={{ height: '100%' }}>
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

    </Sidebar>
  )
}

export default Explorer
