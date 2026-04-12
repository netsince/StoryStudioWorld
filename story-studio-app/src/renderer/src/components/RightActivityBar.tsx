import React from 'react'
import { RightActivityType } from '../models'

interface RightActivityBarProps {
  activeActivity: RightActivityType
  onActivityChange: (activity: RightActivityType) => void
  isOpen: boolean
}

const RightActivityBar: React.FC<RightActivityBarProps> = ({
  activeActivity,
  onActivityChange,
  isOpen
}) => {
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
        className={`activity-item ${isOpen && activeActivity === 'archive' ? 'active' : ''}`}
        title="存档"
        onClick={() => onActivityChange('archive')}
      >
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <path d="M7 7h10M7 7l-2 2M7 7l-2-2"></path>
            <path d="M3 11h18v8H3z"></path>
            <path d="M3 11V9h18v2"></path>
          </svg>
        </div>
        <span>存档</span>
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

export default RightActivityBar
