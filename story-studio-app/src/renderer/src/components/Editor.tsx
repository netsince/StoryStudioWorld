import React from 'react'

const Editor: React.FC = () => {
  return (
    <div className="editor-area">
      <div className="editor-tabs">
        <div className="editor-tab">
          欢迎使用
          <span style={{ fontSize: '10px', marginLeft: '5px' }}>✕</span>
        </div>
      </div>
      <div className="editor-content">
        <svg className="brand-logo brand-logo-xl" viewBox="0 0 1920 1920">
          <rect fill="url(#brandGradient)" x="38.97" y="53.96" width="1842.06" height="1812.08" />
          <path
            fill="#ffffff"
            d="m1069.48,1340.14l-288.83,134.7c-14.31,6.67-30.18-5.61-27.31-21.13l57.87-313.39L1570.56,158.89H158.89v1602.22h1602.22V446.24l-691.64,893.91Zm-339.41,259.1h-414.17c-16.56,0-29.99-13.43-29.99-29.99s13.43-29.99,29.99-29.99h414.17c16.56,0,29.99,13.43,29.99,29.99s-13.43,29.99-29.99,29.99Z"
          />
        </svg>
        <div className="project-title">Story Studio World</div>
        <div className="project-subtitle">选择项目以开始您的创作之旅。</div>

        <div className="start-group">
          <div className="start-item">
            <span className="start-item-icon">
              <svg className="icon" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </span>
            <span>新建项目</span>
          </div>
          <div className="start-item">
            <span className="start-item-icon">
              <svg className="icon" viewBox="0 0 24 24">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </span>
            <span>打开文件夹...</span>
          </div>
          <div className="start-item">
            <span className="start-item-icon">
              <svg className="icon" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </span>
            <span>查看最近使用的项目</span>
          </div>
        </div>

        <div className="recent-section">
          <div className="recent-title">最近的项目</div>
          <div className="recent-list">
            <div className="recent-item">
              <span className="recent-name">我的奇幻小说</span>
              <span className="recent-path">D:\Documents\Stories\Fantasy</span>
            </div>
            <div className="recent-item">
              <span className="recent-name">角色设定集</span>
              <span className="recent-path">D:\Documents\Stories\Characters</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Editor
