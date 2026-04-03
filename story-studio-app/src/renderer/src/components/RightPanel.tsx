import React from 'react'
import { RightActivityType } from '../App'

interface RightPanelProps {
  activeActivity: RightActivityType
  isOpen: boolean
  width: number
}

const RightPanel: React.FC<RightPanelProps> = ({ activeActivity, isOpen, width }) => {
  return (
    <div className={`right-panel ${isOpen ? 'open' : ''}`} style={{ width: `${width}px` }}>
      <div style={{ minWidth: '0', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="explorer-header" style={{ padding: '10px 15px' }}>
          {activeActivity === 'proofread' && '文本校对'}
          {activeActivity === 'memo' && '便签/备忘'}
          {activeActivity === 'archive' && '分支与存档'}
        </div>
        <div style={{ padding: '15px', fontSize: '13px', color: 'var(--text-muted)' }}>
          功能开发中...
        </div>
      </div>
    </div>
  )
}

export default RightPanel
