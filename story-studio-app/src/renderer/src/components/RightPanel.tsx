import React from 'react'
import Sidebar from './Sidebar'
import { useLayoutStore } from '../stores/layoutStore'
import { useUiStore } from '../stores/uiStore'
import ProofreadPanel from './ProofreadPanel'

const RightPanel: React.FC = () => {
  const activeActivity = useUiStore((s) => s.activeRightActivity)
  const isOpen = useUiStore((s) => s.isRightSidebarOpen)
  const width = useLayoutStore((s) => s.rightPanelWidth)

  return (
    <Sidebar isOpen={isOpen} width={width} side="right" className="right-panel">
      <div className="right-panel-header">
        {activeActivity === 'proofread' && '文本校对'}
        {activeActivity === 'memo' && '便签/备忘'}
        {activeActivity === 'archive' && '存档'}
      </div>
      <div className="right-panel-content">
        {activeActivity === 'proofread' && <ProofreadPanel />}
        {activeActivity === 'memo' && (
          <div className="right-panel-placeholder">
            <div className="placeholder-icon">📝</div>
            <div className="placeholder-text">便签功能开发中...</div>
          </div>
        )}
        {activeActivity === 'archive' && (
          <div className="right-panel-placeholder">
            <div className="placeholder-icon">📦</div>
            <div className="placeholder-text">存档功能开发中...</div>
          </div>
        )}
      </div>
    </Sidebar>
  )
}

export default RightPanel
