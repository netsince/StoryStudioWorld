import React from 'react'
import Sidebar from './Sidebar'
import { useLayoutStore } from '../stores/layoutStore'
import { useUiStore } from '../stores/uiStore'
import ProofreadPanel from './ProofreadPanel'
import MemoPanel from './MemoPanel'
import SnapshotPanel from './SnapshotPanel'

const RightPanel: React.FC = () => {
  const activeActivity = useUiStore((s) => s.activeRightActivity)
  const isOpen = useUiStore((s) => s.isRightSidebarOpen)
  const width = useLayoutStore((s) => s.rightPanelWidth)

  return (
    <Sidebar isOpen={isOpen} width={width} side="right" className="right-panel">
      <div className="right-panel-header">
        {activeActivity === 'proofread' && '文本校对'}
        {activeActivity === 'memo' && '便签/备忘'}
        {activeActivity === 'snapshot' && '快照'}
      </div>
      <div className="right-panel-content">
        {activeActivity === 'proofread' && <ProofreadPanel />}
        {activeActivity === 'memo' && <MemoPanel />}
        {activeActivity === 'snapshot' && <SnapshotPanel />}
      </div>
    </Sidebar>
  )
}

export default RightPanel
