import React from 'react'
import { RightActivityType } from '../models'
import Sidebar from './Sidebar'

interface RightPanelProps {
  activeActivity: RightActivityType
  isOpen: boolean
  width: number
}

const RightPanel: React.FC<RightPanelProps> = ({ activeActivity, isOpen, width }) => {
  return (
    <Sidebar isOpen={isOpen} width={width} side="right" className="right-panel">
      <div className="explorer-header" style={{ padding: '10px 15px' }}>
        {activeActivity === 'proofread' && '文本校对'}
        {activeActivity === 'memo' && '便签/备忘'}
        {activeActivity === 'archive' && '存档'}
      </div>
      <div style={{ padding: '15px', fontSize: '13px', color: 'var(--text-muted)' }}>
        功能开发中...
      </div>
    </Sidebar>
  )
}

export default RightPanel
