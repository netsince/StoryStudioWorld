import React, { useState, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { StoryNode } from '../models'
import RenameDialog from './RenameDialog'
import ContextMenu from './ContextMenu'
import { getNodeDisplayName, isDefaultSettingCategory } from '../utils/nodeUtils'

const ROW_HEIGHT = 22
const INDENT_SIZE = 8
const TWISTIE_SIZE = 16

const FileIcon: React.FC<{ isFolder: boolean; isExpanded: boolean }> = ({
  isFolder,
  isExpanded
}) => {
  if (isFolder) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        {isExpanded ? (
          <path
            d="M14.5 3H7.71L6.14 1.43A1.5 1.5 0 0 0 5.09 1H1.5A1.5 1.5 0 0 0 0 2.5v11A1.5 1.5 0 0 0 1.5 15h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 3z"
            fill="#DCAD5A"
          />
        ) : (
          <path
            d="M14.5 3H7.71L6.14 1.43A1.5 1.5 0 0 0 5.09 1H1.5A1.5 1.5 0 0 0 0 2.5v11A1.5 1.5 0 0 0 1.5 15h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 3z"
            fill="#DCAD5A"
          />
        )}
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M3.5 1h5.79l3.21 3.21V14.5a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 3.5 1z"
        fill="#75BEFF"
        fillOpacity="0.6"
      />
    </svg>
  )
}

const Twistie: React.FC<{
  expanded: boolean
  onClick: (e: React.MouseEvent) => void
}> = ({ expanded, onClick }) => (
  <span
    onClick={onClick}
    style={{
      width: `${TWISTIE_SIZE}px`,
      height: `${ROW_HEIGHT}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      flexShrink: 0
    }}
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      style={{
        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.1s ease',
        opacity: 0.7
      }}
    >
      <path fill="currentColor" d="M6 4l4 4-4 4V4z" />
    </svg>
  </span>
)

const IndentGuide: React.FC<{ depth: number }> = ({ depth }) => {
  if (depth === 0) return null
  return (
    <>
      {Array.from({ length: depth }).map((_, i) => (
        <span
          key={`guide-${i}`}
          style={{
            position: 'absolute',
            left: `${(i + 1) * INDENT_SIZE + TWISTIE_SIZE / 2}px`,
            top: 0,
            bottom: 0,
            width: '1px',
            backgroundColor: 'var(--tree-indent-guide-color, rgba(128,128,128,0.2))',
            pointerEvents: 'none'
          }}
        />
      ))}
    </>
  )
}

interface TreeProps {
  nodes: StoryNode[]
  kind?: 'story' | 'setting'
  onOpenChapter: (node: StoryNode) => void
  onMoveNode: (nodeId: string, newParentId: string | null) => void
  onReorderNode: (nodeId: string, targetNodeId: string, position: 'before' | 'after') => void
  onRenameNode: (nodeId: string, newName: string) => void
  onDeleteNode: (nodeId: string) => void
  selectedNodeIds?: string[]
  expandedNodeIds?: string[]
  onSelectionChange?: (nodeIds: string[]) => void
  onExpandedChange?: (nodeIds: Set<string>) => void
  getNodeDescendants?: (nodeId: string) => { folders: number; files: number; fileNames: string[] }
}

type DropPosition = { nodeId: string; position: 'before' | 'after' | 'inside' } | null

const Tree: React.FC<TreeProps> = ({
  nodes,
  kind = 'story',
  onOpenChapter,
  onMoveNode,
  onReorderNode,
  onRenameNode,
  onDeleteNode,
  selectedNodeIds: externalSelectedNodeIds,
  expandedNodeIds: externalExpandedNodeIds,
  onSelectionChange,
  onExpandedChange,
  getNodeDescendants
}) => {
  const { t } = useTranslation()
  const [internalExpandedNodes, setInternalExpandedNodes] = useState<Set<string>>(() => new Set())
  const [internalSelectedNodeIds, setInternalSelectedNodeIds] = useState<Set<string>>(
    () => new Set()
  )
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<DropPosition>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(
    null
  )
  const [renameDialog, setRenameDialog] = useState<{ nodeId: string; initialValue: string } | null>(
    null
  )
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const treeRef = useRef<HTMLDivElement>(null)
  const lastClickedNodeIdRef = useRef<string | null>(null)

  const selectedNodeIds =
    externalSelectedNodeIds !== undefined
      ? new Set(externalSelectedNodeIds)
      : internalSelectedNodeIds

  const expandedNodes =
    externalExpandedNodeIds !== undefined ? new Set(externalExpandedNodeIds) : internalExpandedNodes

  const setSelectedNodes = (nodes: Set<string>) => {
    if (externalSelectedNodeIds !== undefined) {
      onSelectionChange?.(Array.from(nodes))
    } else {
      setInternalSelectedNodeIds(nodes)
    }
  }

  const toggleExpanded = useCallback(
    (nodeId: string) => {
      if (externalExpandedNodeIds !== undefined) {
        const newSet = new Set(externalExpandedNodeIds)
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId)
        } else {
          newSet.add(nodeId)
        }
        onExpandedChange?.(newSet)
      } else {
        setInternalExpandedNodes((prev) => {
          const next = new Set(prev)
          if (next.has(nodeId)) {
            next.delete(nodeId)
          } else {
            next.add(nodeId)
          }
          return next
        })
      }
    },
    [externalExpandedNodeIds, onExpandedChange]
  )

  const getNodeById = useCallback(
    (nodeId: string) => {
      return nodes.find((n) => n.id === nodeId)
    },
    [nodes]
  )

  const getChildren = useCallback(
    (parentId: string | null) => {
      return nodes
        .filter((n) => n.parentId === parentId && (n.kind === kind || !n.kind))
        .sort((a, b) => a.sortOrder - b.sortOrder)
    },
    [nodes, kind]
  )

  // Build visible node list for virtual rendering
  const visibleNodes = useMemo(() => {
    const result: { node: StoryNode; depth: number }[] = []

    const traverse = (parentId: string | null, depth: number): void => {
      const children = getChildren(parentId)
      for (const child of children) {
        result.push({ node: child, depth })
        if (child.type === 'folder' && expandedNodes.has(child.id)) {
          traverse(child.id, depth + 1)
        }
      }
    }

    traverse(null, 0)
    return result
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [nodes, expandedNodes, getChildren])

  const getAllVisibleNodeIds = useCallback((): string[] => {
    return visibleNodes.map(({ node }) => node.id)
  }, [visibleNodes])

  const handleDragStart = useCallback(
    (e: React.DragEvent, nodeId: string) => {
      const node = getNodeById(nodeId)
      if (node) {
        e.dataTransfer.setData(
          'application/json',
          JSON.stringify({
            type: 'story-node',
            nodeId: node.id,
            title: node.name,
            nodeType: node.type,
            kind: node.kind
          })
        )
      }
      setDraggingNodeId(nodeId)
      // 支持移动和复制（阅读编排需要复制）
      e.dataTransfer.effectAllowed = 'copyMove'
    },
    [getNodeById]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, nodeId: string) => {
      e.preventDefault()
      if (!draggingNodeId || draggingNodeId === nodeId) return

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const relativeY = e.clientY - rect.top
      const height = rect.height

      let position: 'before' | 'after' | 'inside'
      const node = getNodeById(nodeId)

      if (node?.type === 'folder') {
        if (relativeY < height * 0.3) {
          position = 'before'
        } else if (relativeY > height * 0.7) {
          position = 'after'
        } else {
          position = 'inside'
        }
      } else {
        position = relativeY < height / 2 ? 'before' : 'after'
      }

      setDropPosition({ nodeId, position })
    },
    [draggingNodeId, getNodeById]
  )

  const handleDragLeave = useCallback(() => {
    setDropPosition(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetNodeId: string) => {
      e.preventDefault()
      e.stopPropagation()

      if (!draggingNodeId || draggingNodeId === targetNodeId) {
        setDraggingNodeId(null)
        setDropPosition(null)
        return
      }

      const position = dropPosition?.position
      if (!position) {
        setDraggingNodeId(null)
        setDropPosition(null)
        return
      }

      const draggingNode = getNodeById(draggingNodeId)
      const targetNode = getNodeById(targetNodeId)

      if (!draggingNode || !targetNode) {
        setDraggingNodeId(null)
        setDropPosition(null)
        return
      }

      if (position === 'inside' && targetNode.type === 'folder') {
        onMoveNode(draggingNodeId, targetNodeId)
      } else if (
        draggingNode.parentId === targetNode.parentId &&
        (position === 'before' || position === 'after')
      ) {
        onReorderNode(draggingNodeId, targetNodeId, position)
      } else {
        onMoveNode(draggingNodeId, targetNode.parentId)
      }

      setDraggingNodeId(null)
      setDropPosition(null)
    },
    [draggingNodeId, dropPosition, getNodeById, onMoveNode, onReorderNode]
  )

  const handleDropOnRoot = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!draggingNodeId) return

      onMoveNode(draggingNodeId, null)
      setDraggingNodeId(null)
      setDropPosition(null)
    },
    [draggingNodeId, onMoveNode]
  )

  const isDefaultSettingNode = useCallback((node: StoryNode) => {
    return isDefaultSettingCategory(node)
  }, [])

  const getDisplayNodeName = useCallback(
    (node: StoryNode): string => {
      return getNodeDisplayName(node, t)
    },
    [t]
  )

  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId })
  }, [])

  const TreeNodeItem = React.memo(function TreeNodeItem({
    node,
    depth
  }: {
    node: StoryNode
    depth: number
  }) {
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNodeIds.has(node.id)
    const isDragging = draggingNodeId === node.id
    const isHovered = hoveredNodeId === node.id
    const isFolder = node.type === 'folder'
    const hasChildren = isFolder && getChildren(node.id).length > 0

    const isDropTarget = dropPosition?.nodeId === node.id
    const isDropInside = isDropTarget && dropPosition?.position === 'inside'
    const isDropBefore = isDropTarget && dropPosition?.position === 'before'
    const isDropAfter = isDropTarget && dropPosition?.position === 'after'

    const handleClick = (e: React.MouseEvent): void => {
      if (e.ctrlKey || e.metaKey) {
        const newSelection = new Set(selectedNodeIds)
        if (newSelection.has(node.id)) {
          newSelection.delete(node.id)
        } else {
          newSelection.add(node.id)
        }
        setSelectedNodes(newSelection)
      } else if (e.shiftKey && lastClickedNodeIdRef.current) {
        const allVisibleIds = getAllVisibleNodeIds()
        const lastIndex = allVisibleIds.indexOf(lastClickedNodeIdRef.current)
        const currentIndex = allVisibleIds.indexOf(node.id)
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex)
          const end = Math.max(lastIndex, currentIndex)
          const rangeIds = allVisibleIds.slice(start, end + 1)
          setSelectedNodes(new Set(rangeIds))
        }
      } else {
        setSelectedNodes(new Set([node.id]))
      }
      lastClickedNodeIdRef.current = node.id

      if (isFolder) {
        toggleExpanded(node.id)
      } else {
        onOpenChapter(node)
      }
    }

    return (
      <div style={{ position: 'relative' }}>
        {/* Drop indicator before */}
        {isDropBefore && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${depth * INDENT_SIZE}px`,
              right: 0,
              height: '2px',
              backgroundColor: 'var(--list-active-selection-bg, #007acc)',
              zIndex: 10
            }}
          />
        )}

        <div
          style={{
            height: `${ROW_HEIGHT}px`,
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            paddingLeft: `${depth * INDENT_SIZE}px`,
            backgroundColor: isSelected
              ? 'var(--list-active-selection-bg, #04395e)'
              : isHovered
                ? 'var(--list-hover-background, #2a2d2e)'
                : 'transparent',
            color: isSelected ? 'var(--list-active-selection-fg, #fff)' : 'var(--foreground, #ccc)',
            cursor: 'pointer',
            opacity: isDragging ? 0.5 : 1,
            outline: isDropInside ? '1px solid var(--accent-color, #007acc)' : 'none',
            outlineOffset: '-1px',
            userSelect: 'none'
          }}
          draggable
          onClick={handleClick}
          onMouseEnter={() => setHoveredNodeId(node.id)}
          onMouseLeave={() => setHoveredNodeId(null)}
          onDragStart={(e) => handleDragStart(e, node.id)}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.id)}
          onDragEnd={() => {
            setDraggingNodeId(null)
            setDropPosition(null)
          }}
          onContextMenu={(e) => handleContextMenu(e, node.id)}
        >
          <IndentGuide depth={depth} />

          {/* Twistie for folders */}
          {isFolder && hasChildren ? (
            <Twistie
              expanded={isExpanded}
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(node.id)
              }}
            />
          ) : (
            <span style={{ width: `${TWISTIE_SIZE}px`, flexShrink: 0 }} />
          )}

          {/* File/Folder icon */}
          <span style={{ marginRight: '4px', display: 'flex', alignItems: 'center' }}>
            <FileIcon isFolder={isFolder} isExpanded={isExpanded} />
          </span>

          {/* Node name */}
          <span
            style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '13px',
              lineHeight: `${ROW_HEIGHT}px`
            }}
          >
            {getDisplayNodeName(node)}
          </span>
        </div>

        {/* Drop indicator after */}
        {isDropAfter && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${depth * INDENT_SIZE}px`,
              right: 0,
              height: '2px',
              backgroundColor: 'var(--list-active-selection-bg, #007acc)',
              zIndex: 10
            }}
          />
        )}
      </div>
    )
  })

  return (
    <div
      ref={treeRef}
      className="monaco-tree"
      style={{
        height: '100%',
        overflow: 'auto',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}
      onDragOver={(e) => {
        e.preventDefault()
      }}
      onDrop={handleDropOnRoot}
    >
      {visibleNodes.map(({ node, depth }, index) => (
        <TreeNodeItem key={`${node.id}-${index}`} node={node} depth={depth} />
      ))}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            {
              key: 'rename',
              label: t('tree.rename'),
              onSelect: () => {
                const isMultiSelected = selectedNodeIds.size > 1
                if (isMultiSelected) return
                const node = getNodeById(contextMenu.nodeId)
                if (node) {
                  setRenameDialog({ nodeId: node.id, initialValue: node.name })
                }
                setContextMenu(null)
              }
            },
            {
              key: 'delete',
              label: t('tree.delete'),
              onSelect: () => {
                const nodeToDelete = getNodeById(contextMenu.nodeId)
                if (!nodeToDelete || isDefaultSettingNode(nodeToDelete)) {
                  setContextMenu(null)
                  return
                }

                if (nodeToDelete.type === 'folder' && getNodeDescendants) {
                  const descendants = getNodeDescendants(contextMenu.nodeId)

                  if (descendants.files > 0) {
                    const sortedByLength = [...descendants.fileNames].sort(
                      (a, b) => b.length - a.length
                    )
                    const top5ByLength = sortedByLength.slice(0, 5)
                    const fileList = top5ByLength.join(', ')
                    const moreText =
                      descendants.fileNames.length > 5
                        ? t('tree.deleteFolderWarning.moreFiles', {
                            count: descendants.fileNames.length
                          })
                        : ''

                    const confirmMessages = [
                      t('tree.deleteFolderWarning.title', {
                        name: nodeToDelete.name,
                        count: descendants.files
                      }) +
                        '\n\n' +
                        t('tree.deleteFolderWarning.fileList', {
                          files: fileList,
                          more: moreText
                        }) +
                        '\n\n' +
                        t('tree.deleteFolderWarning.confirm'),
                      t('tree.deleteFolderWarning.secondConfirm', {
                        name: nodeToDelete.name,
                        count: descendants.files,
                        files: fileList,
                        more: moreText
                      }),
                      t('tree.deleteFolderWarning.finalConfirm', {
                        name: nodeToDelete.name,
                        files: descendants.files,
                        folders: descendants.folders
                      })
                    ]

                    let confirmed = false
                    for (let i = 0; i < confirmMessages.length; i++) {
                      confirmed = confirm(confirmMessages[i])
                      if (!confirmed) break
                    }

                    if (confirmed) {
                      onDeleteNode(contextMenu.nodeId)
                    }
                  } else {
                    if (confirm(t('tree.confirmArchive', { name: nodeToDelete.name }))) {
                      onDeleteNode(contextMenu.nodeId)
                    }
                  }
                } else {
                  if (confirm(t('tree.confirmArchive', { name: nodeToDelete?.name || '' }))) {
                    onDeleteNode(contextMenu.nodeId)
                  }
                }
                setContextMenu(null)
              }
            }
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}

      {renameDialog && (
        <RenameDialog
          title={t('tree.rename')}
          initialValue={renameDialog.initialValue}
          onCancel={() => setRenameDialog(null)}
          onConfirm={(nextValue) => {
            if (nextValue && nextValue !== renameDialog.initialValue) {
              onRenameNode(renameDialog.nodeId, nextValue)
            }
            setRenameDialog(null)
          }}
        />
      )}
    </div>
  )
}

export default Tree
