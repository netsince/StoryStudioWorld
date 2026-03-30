import React from 'react'
import { Tab } from '../App'

interface EditorProps {
  openedFolderPath: string | null
  onOpenFolder: () => void
  tabs: Tab[]
  activeTabId: string
  onTabSwitch: (tabId: string) => void
  onTabClose: (e: React.MouseEvent, tabId: string) => void
}

const Editor: React.FC<EditorProps> = ({
  openedFolderPath,
  onOpenFolder,
  tabs,
  activeTabId,
  onTabSwitch,
  onTabClose
}) => {
  const activeTab = tabs.find((t) => t.id === activeTabId)

  const renderContent = (): React.ReactNode => {
    if (!activeTab) {
      return (
        <div className="editor-content">
          <div className="project-title">无打开的标签页</div>
          <div className="project-subtitle">从左侧资源管理器中打开一个文件以开始。</div>
        </div>
      )
    }

    if (activeTab.type === 'welcome') {
      return (
        <div className="editor-content" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <svg className="brand-logo brand-logo-xl" viewBox="0 0 1920 1920">
            <rect fill="url(#brandGradient)" x="38.97" y="53.96" width="1842.06" height="1812.08" />
            <path
              fill="#ffffff"
              d="m1069.48,1340.14l-288.83,134.7c-14.31,6.67-30.18-5.61-27.31-21.13l57.87-313.39L1570.56,158.89H158.89v1602.22h1602.22V446.24l-691.64,893.91Zm-339.41,259.1h-414.17c-16.56,0-29.99-13.43-29.99-29.99s13.43-29.99,29.99-29.99h414.17c16.56,0,29.99,13.43,29.99,29.99s-13.43,29.99-29.99,29.99Z"
            />
          </svg>
          <div className="project-title">Story Studio World</div>
          <div className="project-subtitle" style={{ marginBottom: '40px' }}>
            {openedFolderPath ? `当前项目：${openedFolderPath}` : '选择项目以开始您的创作之旅。'}
          </div>

          <div className="start-group" style={{ maxWidth: '300px' }}>
            <div className="start-item">
              <span className="start-item-icon">
                <svg className="icon" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </span>
              <span>新建项目</span>
            </div>
            <div className="start-item" onClick={onOpenFolder}>
              <span className="start-item-icon">
                <svg className="icon" viewBox="0 0 24 24">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
              </span>
              <span>打开文件夹...</span>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="editor-content" key={activeTab.id}>
        <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
          <h2 className="project-title" style={{ fontSize: '24px', fontWeight: '600' }}>
            {activeTab.title}
          </h2>
          <p className="project-subtitle" style={{ fontSize: '12px', marginBottom: '20px' }}>
            {activeTab.path}
          </p>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', marginBottom: '20px' }} />
          <div style={{ color: 'var(--text-main)', lineHeight: '1.8', fontSize: '15px' }}>
            <p>这是 <strong>{activeTab.title}</strong> 的内容编辑区域。</p>
            <p>UI 体验已优化：</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li>侧边栏现在支持平滑的过渡动画。</li>
              <li>侧边栏宽度可自由拖拽，且拖拽时保持极速响应。</li>
              <li>全局加入了自定义滚动条，风格更加统一。</li>
              <li>增加了标签页切换的淡入动效。</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-area">
      <div className="editor-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`editor-tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onTabSwitch(tab.id)}
          >
            {tab.title}
            <span className="tab-close" onClick={(e) => onTabClose(e, tab.id)}>
              ✕
            </span>
          </div>
        ))}
      </div>
      {renderContent()}
    </div>
  )
}

export default Editor
