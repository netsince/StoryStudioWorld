import React from 'react'

const RightSidebar: React.FC = () => {
  return (
    <div className="right-sidebar">
      <div className="activity-item" title="校对">
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <span>校对</span>
      </div>
      <div className="activity-item" title="便签">
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <span>便签</span>
      </div>
      <div className="activity-item" title="分支与存档">
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <path d="M7 7h10M7 7l-2 2M7 7l-2-2"></path>
            <path d="M3 11h18v8H3z"></path>
            <path d="M3 11V9h18v2"></path>
          </svg>
        </div>
        <span>分支存档</span>
      </div>
      <div className="activity-item" title="更多" style={{ marginTop: 'auto', marginBottom: '10px' }}>
        <span className="activity-icon">⋯</span>
      </div>
    </div>
  )
}

export default RightSidebar
