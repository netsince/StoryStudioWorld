import React, { useState, useCallback, useMemo, useRef } from 'react'
import { StoryNode } from '../models'

interface TreeProps {
  nodes: StoryNode[]
  onOpenChapter: (node: StoryNode) => void
  onMoveNode: (nodeId: string, newParentId: string | null) => void
  onReorderNode: (nodeId: string, targetNodeId: string, position: 'before' | 'after') => void
  onRenameNode: (nodeId: string, newName: string) => void
  onDeleteNode: (nodeId: string) => void
}

type DropPosition = { nodeId: string; position: 'before' | 'after' | 'inside' } | null

// VS Code style constants
const ROW_HEIGHT = 22
const INDENT_SIZE = 8
const TWISTIE_SIZE = 16

const Tree: React.FC<TreeProps> = ({
  nodes,
  onOpenChapter,
  onMoveNode,
  onReorderNode,
  onRenameNode,
  onDeleteNode
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<DropPosition>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const treeRef = useRef<HTMLDivElement>(null)

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  const getNodeById = useCallback((nodeId: string) => {
    return nodes.find(n => n.id === nodeId)
  }, [nodes])

  const getChildren = useCallback((parentId: string | null) => {
    return nodes
      .filter(n => n.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [nodes])

  // Build visible node list for virtual rendering
  const visibleNodes = useMemo(() => {
    const result: { node: StoryNode; depth: number }[] = []
    
    const traverse = (parentId: string | null, depth: number) => {
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
  }, [nodes, expandedNodes, getChildren])

  const handleDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
    setDraggingNodeId(nodeId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, nodeId: string) => {
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
  }, [draggingNodeId, getNodeById])

  const handleDragLeave = useCallback(() => {
    setDropPosition(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetNodeId: string) => {
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
    } else if (draggingNode.parentId === targetNode.parentId && (position === 'before' || position === 'after')) {
      onReorderNode(draggingNodeId, targetNodeId, position)
    } else {
      onMoveNode(draggingNodeId, targetNode.parentId)
    }

    setDraggingNodeId(null)
    setDropPosition(null)
  }, [draggingNodeId, dropPosition, getNodeById, onMoveNode, onReorderNode])

  const handleDropOnRoot = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!draggingNodeId) return

    onMoveNode(draggingNodeId, null)
    setDraggingNodeId(null)
    setDropPosition(null)
  }, [draggingNodeId, onMoveNode])

  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId })
  }, [])

  // VS Code style file icon
  const FileIcon = ({ isFolder, isExpanded }: { isFolder: boolean; isExpanded: boolean }) => {
    if (isFolder) {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          {isExpanded ? (
            <path d="M14.5 3H7.71L6.14 1.43A1.5 1.5 0 0 0 5.09 1H1.5A1.5 1.5 0 0 0 0 2.5v11A1.5 1.5 0 0 0 1.5 15h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 3z" fill="#DCAD5A"/>
          ) : (
            <path d="M14.5 3H7.71L6.14 1.43A1.5 1.5 0 0 0 5.09 1H1.5A1.5 1.5 0 0 0 0 2.5v11A1.5 1.5 0 0 0 1.5 15h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 3z" fill="#DCAD5A"/>
          )}
        </svg>
      )
    }
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M3.5 1h5.79l3.21 3.21V14.5a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 3.5 1z" fill="#75BEFF" fillOpacity="0.6"/>
      </svg>
    )
  }

  // VS Code style twistie (chevron)
  const Twistie = ({ expanded, onClick }: { expanded: boolean; onClick: (e: React.MouseEvent) => void }) => (
    <span
      onClick={onClick}
      style={{
        width: `${TWISTIE_SIZE}px`,
        height: `${ROW_HEIGHT}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        style={{
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.1s ease',
          opacity: 0.7,
        }}
      >
        <path
          fill="currentColor"
          d="M6 4l4 4-4 4V4z"
        />
      </svg>
    </span>
  )

  // Indent guide component
  const IndentGuide = ({ depth }: { depth: number }) => {
    if (depth === 0) return null
    return (
      <>
        {Array.from({ length: depth }).map((_, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${(i + 1) * INDENT_SIZE + TWISTIE_SIZE / 2}px`,
              top: 0,
              bottom: 0,
              width: '1px',
              backgroundColor: 'var(--tree-indent-guide-color, rgba(128,128,128,0.2))',
              pointerEvents: 'none',
            }}
          />
        ))}
      </>
    )
  }

  const renderNode = (node: StoryNode, depth: number, _index: number): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNodeId === node.id
    const isDragging = draggingNodeId === node.id
    const isHovered = hoveredNodeId === node.id
    const isFolder = node.type === 'folder'
    const hasChildren = isFolder && getChildren(node.id).length > 0

    const isDropTarget = dropPosition?.nodeId === node.id
    const isDropInside = isDropTarget && dropPosition?.position === 'inside'
    const isDropBefore = isDropTarget && dropPosition?.position === 'before'
    const isDropAfter = isDropTarget && dropPosition?.position === 'after'

    return (
      <div key={node.id} style={{ position: 'relative' }}>
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
              zIndex: 10,
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
            color: isSelected
              ? 'var(--list-active-selection-fg, #fff)'
              : 'var(--foreground, #ccc)',
            cursor: 'pointer',
            opacity: isDragging ? 0.5 : 1,
            outline: isDropInside ? '1px solid var(--accent-color, #007acc)' : 'none',
            outlineOffset: '-1px',
            userSelect: 'none',
          }}
          draggable
          onClick={() => {
            setSelectedNodeId(node.id)
            if (isFolder) {
              toggleExpanded(node.id)
            } else {
              onOpenChapter(node)
            }
          }}
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
              lineHeight: `${ROW_HEIGHT}px`,
            }}
          >
            {node.name}
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
              zIndex: 10,
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div
      ref={treeRef}
      className="monaco-tree"
      style={{
        height: '100%',
        overflow: 'auto',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
      onDragOver={(e) => {
        e.preventDefault()
      }}
      onDrop={handleDropOnRoot}
    >
      {visibleNodes.map(({ node, depth }, index) => renderNode(node, depth, index))}

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--menu-bg, #252526)',
            border: '1px solid var(--menu-border, #454545)',
            borderRadius: '4px',
            padding: '4px 0',
            zIndex: 1000,
            minWidth: '120px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              padding: '6px 16px',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--menu-fg, #ccc)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--menu-hover-bg, #094771)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            onClick={() => {
              const node = getNodeById(contextMenu.nodeId)
              if (node) {
                const newName = prompt('重命名', node.name)
                if (newName && newName !== node.name) {
                  onRenameNode(node.id, newName)
                }
              }
              setContextMenu(null)
            }}
          >
            重命名
          </div>
          <div
            style={{
              padding: '6px 16px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#f85149',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--menu-hover-bg, #094771)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            onClick={() => {
              if (confirm('确定要删除吗？')) {
                onDeleteNode(contextMenu.nodeId)
              }
              setContextMenu(null)
            }}
          >
            删除
          </div>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
          }}
          onClick={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

export default Tree
