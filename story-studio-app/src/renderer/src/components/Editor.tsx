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
        <div className="editor-content">
          <svg className="brand-logo brand-logo-xl" viewBox="0 0 1920 1920">
            <rect fill="url(#brandGradient)" x="38.97" y="53.96" width="1842.06" height="1812.08" />
            <path
              fill="#ffffff"
              d="m1069.48,1340.14l-288.83,134.7c-14.31,6.67-30.18-5.61-27.31-21.13l57.87-313.39L1570.56,158.89H158.89v1602.22h1602.22V446.24l-691.64,893.91Zm-339.41,259.1h-414.17c-16.56,0-29.99-13.43-29.99-29.99s13.43-29.99,29.99-29.99h414.17c16.56,0,29.99,13.43,29.99,29.99s-13.43,29.99-29.99,29.99Z"
            />
          </svg>
          <div className="project-title">Story Studio World</div>
          <div className="project-subtitle">
            {openedFolderPath ? `当前项目：${openedFolderPath}` : '选择项目以开始您的创作之旅。'}
          </div>

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
      <div className="editor-content" style={{ alignItems: 'flex-start', textAlign: 'left' }}>
        <h2 className="project-title">{activeTab.title}</h2>
        <p className="project-subtitle">文件路径: {activeTab.path}</p>
        <div style={{ color: 'var(--text-main)', lineHeight: '1.6' }}>
          这是文件 {activeTab.title} 的内容区域。
          <br />
          初步逻辑已实现，您现在可以在左侧资源管理器中点击“项目列表...”来模拟打开一个文件。
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
