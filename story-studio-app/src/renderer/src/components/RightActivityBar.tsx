import React from 'react'
import { useUiStore } from '../stores/uiStore'
import { usePluginService } from '../services/pluginService'

const RightActivityBar: React.FC = () => {
  const activeActivity = useUiStore((s) => s.activeRightActivity)
  const isOpen = useUiStore((s) => s.isRightSidebarOpen)
  const onActivityChange = useUiStore((s) => s.handleRightActivityChange)
  const pluginItems = usePluginService((s) => s.rightActivityItems)

  const renderIcon = (icon: React.ReactNode | string): React.ReactNode => {
    if (typeof icon === 'string') {
      return <span dangerouslySetInnerHTML={{ __html: icon }} />
    }
    return icon
  }

  return (
    <div className="right-activity-bar">
      <div
        className={`activity-item ${isOpen && activeActivity === 'proofread' ? 'active' : ''}`}
        title="校对"
        onClick={() => onActivityChange('proofread')}
      >
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <span>校对</span>
      </div>
      <div
        className={`activity-item ${isOpen && activeActivity === 'memo' ? 'active' : ''}`}
        title="便签"
        onClick={() => onActivityChange('memo')}
      >
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <span>便签</span>
      </div>
      <div
        className={`activity-item ${isOpen && activeActivity === 'snapshot' ? 'active' : ''}`}
        title="快照"
        onClick={() => onActivityChange('snapshot')}
      >
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <span>快照</span>
      </div>

      {pluginItems.length > 0 && (
        <>
          <div className="activity-separator" style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 12px' }} />
          {pluginItems.map((item) => (
            <div
              key={item.id}
              className={`activity-item ${isOpen && activeActivity === item.id ? 'active' : ''}`}
              title={item.title}
              onClick={() => onActivityChange(item.id as 'proofread' | 'memo' | 'snapshot')}
            >
              <div className="activity-icon">
                {renderIcon(item.icon)}
              </div>
              <span>{item.title}</span>
            </div>
          ))}
        </>
      )}

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

export default RightActivityBar
