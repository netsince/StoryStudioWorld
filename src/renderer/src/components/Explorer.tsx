import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { StoryNode } from '../models'
import { useEditorStore } from '../stores/editorStore'
import { useLayoutStore } from '../stores/layoutStore'
import { useProjectStore } from '../stores/projectStore'
import { useUiStore } from '../stores/uiStore'
import Tree from './Tree'
import Sidebar from './Sidebar'
import PluginManagerPanel from './editor/PluginManagerPanel'
import ContextMenu from './ContextMenu'

const RESERVED_CATEGORY_IDS = ['character', 'location', 'worldview', 'item', 'other']

const Explorer: React.FC = () => {
  const { t } = useTranslation()
  const activeActivity = useUiStore((s) => s.activeActivity)
  const isOpen = useUiStore((s) => s.isExplorerOpen)
  const expandNodePath = useUiStore((s) => s.expandNodePath)
  const setExpandNodePath = useUiStore((s) => s.setExpandNodePath)
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
  const [createMenuPosition, setCreateMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([])

  useEffect(() => {
    setSelectedNodeIds([])
  }, [activeActivity])

  const activityTitle = useMemo(() => {
    switch (activeActivity) {
      case 'chapter':
        return t('explorer.write')
      case 'setting':
        return t('explorer.worldSetting')
      case 'plugin':
        return t('sidebar.managePlugins')
      default:
        return t('explorer.write')
    }
  }, [activeActivity, t])

  useEffect(() => {
    if (expandNodePath.length > 0) {
      setExpandedNodeIds((prev) => {
        const newSet = new Set(prev)
        expandNodePath.forEach((id) => newSet.add(id))
        return Array.from(newSet)
      })
      setExpandNodePath([])
    }
  }, [expandNodePath, setExpandNodePath])

  const getSelectedFolderId = (): string | null => {
    if (selectedNodeIds.length === 1) {
      const selectedNode = storyNodes.find((n) => n.id === selectedNodeIds[0])
      if (selectedNode?.type === 'folder') {
        return selectedNode.id
      }
    }
    return null
  }

  const getNodeChildren = (parentId: string | null): StoryNode[] => {
    const kind = activeActivity === 'setting' ? 'setting' : 'story'
    return storyNodes
      .filter((n) => n.parentId === parentId && n.kind === kind)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  const getNodeDescendants = (
    nodeId: string
  ): { folders: number; files: number; fileNames: string[] } => {
    let folders = 0
    let files = 0
    const fileNames: string[] = []
    const queue = [nodeId]
    while (queue.length > 0) {
      const currentId = queue.shift()!
      const children = getNodeChildren(currentId)
      for (const child of children) {
        if (child.type === 'folder') {
          folders++
          queue.push(child.id)
        } else {
          files++
          fileNames.push(child.name)
        }
      }
    }
    return { folders, files, fileNames }
  }

  const handleCreateNode = async (type: 'folder' | 'file'): Promise<void> => {
    let name: string
    const kind = activeActivity === 'setting' ? 'setting' : 'story'

    if (type === 'folder') {
      name =
        kind === 'setting' && !getSelectedFolderId()
          ? t('sidebar.newCategory')
          : t('sidebar.newFolder')
    } else {
      const parentId = getSelectedFolderId()
      const siblings = getNodeChildren(parentId)
      if (kind === 'setting') {
        if (!parentId) {
          window.alert(t('explorer.createFolderFirst'))
          return
        }
        const parentNode = storyNodes.find((n) => n.id === parentId)
        if (
          parentNode &&
          parentNode.parentId === null &&
          RESERVED_CATEGORY_IDS.includes(parentNode.name)
        ) {
          window.alert(t('explorer.createFolderFirst'))
          return
        }
        name = t('explorer.newSetting')
      } else {
        const fileCount = siblings.filter((n) => n.type === 'file').length
        name = t('explorer.newChapter', { count: fileCount + 1 })
      }
    }
    const parentId = getSelectedFolderId()

    if (kind === 'setting' && type === 'folder' && RESERVED_CATEGORY_IDS.includes(name)) {
      window.alert(t('errors.cannotCreateInReservedCategory'))
      return
    }

    await onCreateStoryNode(parentId, name, type, kind)
    if (parentId && !expandedNodeIds.includes(parentId)) {
      setExpandedNodeIds((prev) => [...prev, parentId])
    }
    setIsCreateMenuOpen(false)
  }

  const onOpenChapter = (node: StoryNode): void => {
    if (!currentProject || node.type !== 'file') return
    openTab({ id: node.id, title: node.name, type: 'file', nodeId: node.id, kind: node.kind })
  }

  const onRefreshStoryNodes = useProjectStore((s) => s.refreshStoryNodes)

  const renderStoryTree = (): React.ReactNode => {
    if (activeActivity === 'plugin') {
      return <PluginManagerPanel />
    }

    const kind = activeActivity === 'setting' ? 'setting' : 'story'
    if (!currentProject) {
      return (
        <div className="explorer-content">
          <div className="explorer-text-group">{t('explorer.noProject')}</div>
          <button className="action-button" onClick={onOpenCreateProject}>
            {t('explorer.newProject')}
          </button>
          <button className="action-button secondary" onClick={onOpenFolder}>
            {t('explorer.openProject')}
          </button>
        </div>
      )
    }

    return (
      <div
        className={`explorer-${kind}`}
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <div
          className="story-toolbar-panel"
          style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div
            className="story-toolbar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '2px'
            }}
          >
            <div
              className="story-toolbar-actions"
              style={{ position: 'relative', display: 'flex', gap: '2px' }}
            >
              {kind === 'setting' && (
                <button
                  className="story-toolbar-btn"
                  title={t('explorer.addRootNode')}
                  disabled={isBusy}
                  onClick={() =>
                    void onCreateStoryNode(null, t('sidebar.newCategory'), 'folder', 'setting')
                  }
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}
              <button
                className="story-toolbar-btn"
                title={t('explorer.refresh')}
                disabled={isBusy}
                onClick={() => void onRefreshStoryNodes()}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
              </button>
              <button
                className="story-toolbar-btn story-action-button"
                title={t('explorer.createNew')}
                disabled={isBusy}
                onClick={(event) => {
                  event.stopPropagation()
                  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
                  setCreateMenuPosition({ x: rect.left, y: rect.bottom + 4 })
                  setIsCreateMenuOpen((prev) => !prev)
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              {isCreateMenuOpen && createMenuPosition && (
                <ContextMenu
                  x={createMenuPosition.x}
                  y={createMenuPosition.y}
                  items={[
                    {
                      key: 'folder',
                      label: `📁 ${t('explorer.folder')}`,
                      onSelect: () => {
                        void handleCreateNode('folder')
                        setIsCreateMenuOpen(false)
                      }
                    },
                    {
                      key: 'file',
                      label: `📄 ${kind === 'setting' ? t('explorer.setting') : t('explorer.chapter')}`,
                      onSelect: () => {
                        void handleCreateNode('file')
                        setIsCreateMenuOpen(false)
                      }
                    }
                  ]}
                  onClose={() => setIsCreateMenuOpen(false)}
                />
              )}
              <button
                className="story-toolbar-btn"
                title={t('sidebar.archive')}
                disabled={isBusy}
                onClick={() => {
                  openTab({
                    id: kind === 'setting' ? 'setting-archive' : 'archive',
                    title:
                      kind === 'setting'
                        ? t('explorer.settingArchive')
                        : t('explorer.archiveSpace'),
                    type: 'archive'
                  })
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="21 8 21 21 3 21 3 8"></polyline>
                  <rect x="1" y="3" width="22" height="5"></rect>
                  <line x1="10" y1="12" x2="14" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="story-list-panel" style={{ flex: 1, overflow: 'hidden' }}>
          <Tree
            nodes={storyNodes}
            kind={kind}
            onOpenChapter={onOpenChapter}
            onMoveNode={onMoveStoryNode}
            onReorderNode={onReorderStoryNode}
            onRenameNode={onRenameStoryNode}
            onDeleteNode={onDeleteStoryNode}
            selectedNodeIds={selectedNodeIds}
            expandedNodeIds={expandedNodeIds}
            onSelectionChange={setSelectedNodeIds}
            onExpandedChange={(ids) => setExpandedNodeIds(Array.from(ids))}
            getNodeDescendants={getNodeDescendants}
          />
        </div>
      </div>
    )
  }

  return (
    <Sidebar isOpen={isOpen} width={width} side="left" className="explorer-panel">
      <div className="explorer-header">{activityTitle}</div>

      <div className="explorer-body" style={{ height: 'calc(100% - 40px)' }}>
        <div className="explorer-static-section" style={{ height: '100%' }}>
          {renderStoryTree()}

          {errorMessage && <div className="explorer-inline-error">{errorMessage}</div>}

          {!currentProject && (
            <div className="explorer-recent-section">
              <div className="explorer-header" style={{ padding: '0 15px 10px 15px' }}>
                {t('explorer.recentProjects')}
              </div>
              {recentProjects.length === 0 ? (
                <div className="explorer-list-item muted">{t('explorer.noRecentProjects')}</div>
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
      </div>
    </Sidebar>
  )
}

export default Explorer
