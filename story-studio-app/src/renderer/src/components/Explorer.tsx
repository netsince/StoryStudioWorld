import React, { useEffect, useMemo, useState } from 'react'
import { ActivityType, ProjectData, RecentProject, StoryNode } from '../models'
import ContextMenu from './ContextMenu'
import RenameDialog from './RenameDialog'

interface ExplorerProps {
  activeActivity: ActivityType
  currentProject: ProjectData | null
  storyNodes: StoryNode[]
  recentProjects: RecentProject[]
  onOpenFolder: () => void
  onOpenRecentProject: (projectSettingsPath: string) => Promise<void>
  onOpenCreateProject: () => void
  onOpenChapter: (node: StoryNode) => void
  onCreateStoryNode: (parentId: string | null, name: string, type: 'folder' | 'file') => Promise<void>
  onRenameStoryNode: (nodeId: string, newName: string) => Promise<void>
  onDeleteStoryNode: (nodeId: string) => Promise<void>
  onMoveStoryNode: (nodeId: string, newParentId: string | null) => Promise<void>
  isOpen: boolean
  width: number
  isBusy: boolean
  errorMessage: string | null
}

type SelectedNode = { type: 'node'; nodeId: string } | null

const Explorer: React.FC<ExplorerProps> = ({
  activeActivity,
  currentProject,
  storyNodes,
  recentProjects,
  onOpenFolder,
  onOpenRecentProject,
  onOpenCreateProject,
  onOpenChapter,
  onCreateStoryNode,
  onRenameStoryNode,
  onDeleteStoryNode,
  onMoveStoryNode,
  isOpen,
  width,
  isBusy,
  errorMessage
}) => {
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const [createMenuParentId, setCreateMenuParentId] = useState<string | null>(null)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    nodeId: string
    nodeType: 'folder' | 'file'
  } | null>(null)
  const [renameDialog, setRenameDialog] = useState<{
    nodeId: string
    title: string
    initialValue: string
  } | null>(null)

  useEffect(() => {
    const closeMenus = (): void => {
      setIsCreateMenuOpen(false)
      setContextMenu(null)
    }

    const handleMouseDown = (event: MouseEvent): void => {
      if (event.button !== 0) return
      closeMenus()
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeMenus()
      }
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
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

  const nodeTree = useMemo(() => {
    const tree = new Map<string | null, StoryNode[]>()
    for (const node of storyNodes) {
      const parentId = node.parentId
      if (!tree.has(parentId)) {
        tree.set(parentId, [])
      }
      tree.get(parentId)!.push(node)
    }
    for (const children of tree.values()) {
      children.sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return tree
  }, [storyNodes])

  const getNodeById = (nodeId: string): StoryNode | undefined => {
    return storyNodes.find((n) => n.id === nodeId)
  }

  const toggleExpanded = (nodeId: string): void => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const handleCreateNode = async (type: 'folder' | 'file'): Promise<void> => {
    const name = type === 'folder' ? '新文件夹' : '新章节'
    await onCreateStoryNode(createMenuParentId, name, type)
    setIsCreateMenuOpen(false)
  }

  const handleRename = async (): Promise<void> => {
    if (!contextMenu || !currentProject) return

    const node = getNodeById(contextMenu.nodeId)
    if (!node) return

    setContextMenu(null)
    setRenameDialog({
      nodeId: contextMenu.nodeId,
      title: contextMenu.nodeType === 'folder' ? '重命名文件夹' : '重命名文件',
      initialValue: node.name
    })
  }

  const handleDelete = async (): Promise<void> => {
    if (!contextMenu || !currentProject) return
    await onDeleteStoryNode(contextMenu.nodeId)
    setContextMenu(null)
  }

  const renderNode = (node: StoryNode, depth: number): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id)
    const isFolder = node.type === 'folder'
    const isSelected = selectedNode?.type === 'node' && selectedNode.nodeId === node.id
    const children = nodeTree.get(node.id) || []

    return (
      <div key={node.id}>
        <div
          className={`story-tree-item ${isFolder ? 'folder' : 'file'} ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          draggable
          onClick={() => {
            setSelectedNode({ type: 'node', nodeId: node.id })
            if (isFolder) {
              toggleExpanded(node.id)
            }
          }}
          onDoubleClick={() => {
            if (!isFolder) {
              onOpenChapter(node)
            }
          }}
          onDragStart={(event) => {
            setDraggingNodeId(node.id)
            event.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(event) => {
            event.preventDefault()
            if (draggingNodeId && isFolder) {
              event.dataTransfer.dropEffect = 'move'
            }
          }}
          onDrop={(event) => {
            event.preventDefault()
            if (draggingNodeId && isFolder && draggingNodeId !== node.id) {
              onMoveStoryNode(draggingNodeId, node.id)
            }
            setDraggingNodeId(null)
          }}
          onDragEnd={() => setDraggingNodeId(null)}
          onContextMenu={(event) => {
            event.preventDefault()
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              nodeId: node.id,
              nodeType: node.type
            })
          }}
        >
          {isFolder && (
            <button
              className={`story-toggle ${isExpanded ? '' : 'collapsed'}`}
              onClick={(event) => {
                event.stopPropagation()
                toggleExpanded(node.id)
              }}
            >
              {isExpanded ? '▾' : '▸'}
            </button>
          )}
          <span className="story-icon">{isFolder ? '📁' : '📄'}</span>
          <span className="story-label">{node.name}</span>
        </div>

        {isFolder && isExpanded && children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
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

    const rootNodes = nodeTree.get(null) || []

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
                  setCreateMenuParentId(null)
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
                  onMouseDown={(event) => event.stopPropagation()}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                >
                  <div
                    className="menu-item"
                    onMouseDown={(event) => {
                      if (event.button !== 0) return
                      event.preventDefault()
                      event.stopPropagation()
                      void handleCreateNode('folder')
                    }}
                  >
                    📁 新建文件夹
                  </div>
                  <div
                    className="menu-item"
                    onMouseDown={(event) => {
                      if (event.button !== 0) return
                      event.preventDefault()
                      event.stopPropagation()
                      void handleCreateNode('file')
                    }}
                  >
                    📄 新建文件
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="story-list-panel">
          <div className="story-tree">
            {rootNodes.map((node) => renderNode(node, 0))}
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
              },
              {
                key: 'delete',
                label: '删除',
                onSelect: () => void handleDelete()
              }
            ]}
          />
        )}

        {renameDialog && (
          <RenameDialog
            title={renameDialog.title}
            initialValue={renameDialog.initialValue}
            onCancel={() => setRenameDialog(null)}
            onConfirm={(nextValue) => {
              void onRenameStoryNode(renameDialog.nodeId, nextValue)
              setRenameDialog(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default Explorer
