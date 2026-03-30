import React from 'react'
import { RightActivityType } from '../App'

interface RightPanelProps {
  activeActivity: RightActivityType
  isOpen: boolean
  width: number
}

const RightPanel: React.FC<RightPanelProps> = ({ activeActivity, isOpen, width }) => {
  if (!isOpen) return null

  return (
    <div className="right-panel" style={{ width: `${width}px` }}>
      <div className="explorer-header" style={{ padding: '10px 15px' }}>
        {activeActivity === 'proofread' && '文本校对'}
        {activeActivity === 'memo' && '便签/备忘'}
        {activeActivity === 'archive' && '分支与存档'}
      </div>
      <div style={{ padding: '15px', fontSize: '13px', color: 'var(--text-muted)' }}>
        功能开发中...
      </div>
    </div>
  )
}

export default RightPanel
