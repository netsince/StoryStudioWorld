import React from 'react'
import { useUiStore } from '../stores/uiStore'

const ActivityBar: React.FC = () => {
  const activeActivity = useUiStore((s) => s.activeActivity)
  const isOpen = useUiStore((s) => s.isExplorerOpen)
  const onActivityChange = useUiStore((s) => s.handleActivityChange)

  return (
    <div className="activity-bar">
      <div
        className={`activity-item ${isOpen && activeActivity === 'chapter' ? 'active' : ''}`}
        title="编写"
        onClick={() => onActivityChange('chapter')}
      >
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <span>编写</span>
      </div>
      <div
        className={`activity-item ${isOpen && activeActivity === 'character' ? 'active' : ''}`}
        title="角色"
        onClick={() => onActivityChange('character')}
      >
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <span>角色</span>
      </div>
      <div
        className={`activity-item ${isOpen && activeActivity === 'setting' ? 'active' : ''}`}
        title="设定"
        onClick={() => onActivityChange('setting')}
      >
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </div>
        <span>设定</span>
      </div>
      <div
        className={`activity-item ${isOpen && activeActivity === 'plugin' ? 'active' : ''}`}
        title="插件"
        onClick={() => onActivityChange('plugin')}
      >
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        </div>
        <span>插件</span>
      </div>
      <div
        className="activity-item"
        title="更多"
        style={{ marginTop: 'auto', marginBottom: '10px' }}
      >
        <span className="activity-icon">⋯</span>
      </div>
    </div>
  )
}

export default ActivityBar
