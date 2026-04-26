import React, { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { StoryNode } from '../../models'

interface ArchiveTreeProps {
  nodes: StoryNode[]
  onRestoreNode: (nodeId: string, newParentId: string | null) => void
  onPermanentlyDeleteNode: (nodeId: string) => void
  isBusy: boolean
}

const ArchiveTree: React.FC<ArchiveTreeProps> = ({
  nodes,
  onRestoreNode,
  onPermanentlyDeleteNode,
  isBusy
}) => {
  const { t } = useTranslation()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const getChildren = useCallback(
    (parentId: string | null) => {
      return nodes
        .filter((n) => n.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    },
    [nodes]
  )

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  const renderNode = (node: StoryNode, depth: number): React.ReactNode => {
    const isExpanded = expandedIds.has(node.id)
    const isFolder = node.type === 'folder'
    const children = getChildren(node.id)

    return (
      <React.Fragment key={node.id}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px',
            paddingLeft: `${depth * 16 + 8}px`,
            cursor: isFolder ? 'pointer' : 'default',
            borderRadius: '4px',
            marginBottom: '2px',
            gap: '8px',
            background: 'var(--panel-bg, #2d2d2d)'
          }}
          onClick={() => {
            if (isFolder) {
              toggleExpanded(node.id)
            }
          }}
        >
          {isFolder && (
            <span style={{ 
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
              transition: 'transform 0.15s',
              fontSize: '10px'
            }}>
              ▶
            </span>
          )}
          {!isFolder && <span style={{ width: '10px' }} />}
          
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
            {node.type === 'folder' ? '📁' : '📄'} {node.name}
          </span>
          
          <span style={{ fontSize: '11px', color: 'var(--foreground, #888)', flexShrink: 0 }}>
            {node.deletedAt ? new Date(node.deletedAt).toLocaleDateString() : ''}
          </span>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(t('archive.confirmRestore', { name: node.name }))) {
                const newParentId = node.type === 'folder' ? node.parentId : null
                onRestoreNode(node.id, newParentId)
              }
            }}
            disabled={isBusy}
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              background: 'var(--button-bg, #0e639c)',
              color: '#fff',
              border: 'none',
              borderRadius: '3px',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              opacity: isBusy ? 0.5 : 1
            }}
          >
            {t('archive.restore')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(t('archive.confirmDelete', { name: node.name }))) {
                onPermanentlyDeleteNode(node.id)
              }
            }}
            disabled={isBusy}
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              background: '#f85149',
              color: '#fff',
              border: 'none',
              borderRadius: '3px',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              opacity: isBusy ? 0.5 : 1
            }}
          >
            {t('common.delete')}
          </button>
        </div>
        {isFolder && isExpanded && children.map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    )
  }

  const rootNodes = useMemo(() => getChildren(null), [getChildren])

  return (
    <div style={{ padding: '4px 0' }}>
      {rootNodes.map((node) => renderNode(node, 0))}
    </div>
  )
}

export default ArchiveTree
