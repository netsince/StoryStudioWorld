import React, { useState, useEffect, useMemo } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import type { StoryNode } from '../../models'
import ArchiveTree from './ArchiveTree'

interface ArchiveViewProps {
  kind?: 'story' | 'setting'
}

const ArchiveView: React.FC<ArchiveViewProps> = ({ kind = 'story' }) => {
  const [timeFilter, setTimeFilter] = useState<string>('all')
  
  const currentProject = useProjectStore((s) => s.currentProject)
  const archivedNodes = useProjectStore((s) => s.archivedNodes)
  const isBusy = useProjectStore((s) => s.isProjectBusy)
  const refreshArchivedNodes = useProjectStore((s) => s.refreshArchivedNodes)
  const restoreArchivedNode = useProjectStore((s) => s.restoreArchivedNode)
  const permanentlyDeleteNode = useProjectStore((s) => s.permanentlyDeleteNode)

  useEffect(() => {
    if (currentProject) {
      void refreshArchivedNodes()
    }
  }, [currentProject, refreshArchivedNodes])

  const filteredNodes = useMemo(() => {
    let nodes = archivedNodes.filter(n => n.kind === kind)
    
    if (timeFilter === 'all') {
      return nodes
    }
    const filterDate = new Date()
    
    switch (timeFilter) {
      case 'today':
        filterDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        filterDate.setDate(filterDate.getDate() - 7)
        break
      case 'month':
        filterDate.setMonth(filterDate.getMonth() - 1)
        break
      case 'year':
        filterDate.setFullYear(filterDate.getFullYear() - 1)
        break
      default:
        return nodes
    }
    
    return nodes.filter((node: StoryNode) => {
      if (!node.deletedAt) return false
      const deleteDate = new Date(node.deletedAt)
      return deleteDate >= filterDate
    })
  }, [archivedNodes, timeFilter, kind])

  return (
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <h2 style={{ marginBottom: '16px' }}>{kind === 'setting' ? '设定归档' : '归档空间'}</h2>
      
      <div style={{ marginBottom: '16px' }}>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          disabled={isBusy}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'var(--input-bg, #3c3c3c)',
            color: 'var(--foreground, #ccc)',
            border: '1px solid var(--border-color, #454545)',
            borderRadius: '4px',
            fontSize: '13px'
          }}
        >
          <option value="all">全部</option>
          <option value="today">今天</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
          <option value="year">本年</option>
        </select>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {!currentProject ? (
          <div style={{ color: 'var(--foreground, #888)' }}>请先打开项目</div>
        ) : filteredNodes.length === 0 ? (
          <div style={{ color: 'var(--foreground, #888)' }}>暂无归档内容</div>
        ) : (
          <ArchiveTree
            nodes={filteredNodes}
            onRestoreNode={(nodeId, newParentId) => restoreArchivedNode(nodeId, newParentId)}
            onPermanentlyDeleteNode={permanentlyDeleteNode}
            isBusy={isBusy}
          />
        )}
      </div>
    </div>
  )
}

export default ArchiveView
