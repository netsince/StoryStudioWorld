import React from 'react'

const Explorer: React.FC = () => {
  return (
    <div className="explorer-panel">
      <div className="explorer-header">资源管理器</div>
      <div className="explorer-content">
        <div className="explorer-text-group">您尚未打开任何项目。</div>
        <button className="action-button">新建项目</button>
        <button className="action-button secondary">打开文件夹</button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <div className="explorer-header" style={{ padding: '0 15px 10px 15px' }}>
          最近的项目
        </div>
        <div className="explorer-list-item">
          <svg className="icon icon-sm" style={{ marginRight: '8px' }} viewBox="0 0 24 24">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          项目列表...
        </div>
      </div>
    </div>
  )
}

export default Explorer
