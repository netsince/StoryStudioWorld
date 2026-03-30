import React, { useRef, useEffect, useState } from 'react'
import { Tab } from '../App'

interface EditorProps {
  openedFolderPath: string | null
  onOpenFolder: () => void
  tabs: Tab[]
  activeTabId: string
  onTabSwitch: (tabId: string) => void
  onTabClose: (e: React.MouseEvent, tabId: string) => void
  onCloseOthers: (tabId: string) => void
  onCloseAll: () => void
  onPinTab: (tabId: string) => void
  onDirtyTab: (tabId: string) => void
  onReorderTabs: (draggedId: string, targetId: string) => void
}

const Editor: React.FC<EditorProps> = ({
  openedFolderPath,
  onOpenFolder,
  tabs,
  activeTabId,
  onTabSwitch,
  onTabClose,
  onCloseOthers,
  onCloseAll,
  onPinTab,
  onDirtyTab,
  onReorderTabs
}) => {
  const tabsRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLDivElement>(null)
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null)
  const activeTab = tabs.find((t) => t.id === activeTabId)

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    tabId: string
  } | null>(null)

  // 确保激活的标签页在视口内
  useEffect(() => {
    if (activeTabRef.current && tabsRef.current) {
      const container = tabsRef.current
      const tab = activeTabRef.current

      const tabLeft = tab.offsetLeft
      const tabRight = tabLeft + tab.offsetWidth
      const containerLeft = container.scrollLeft
      const containerRight = containerLeft + container.offsetWidth

      if (tabLeft < containerLeft) {
        container.scrollTo({ left: tabLeft, behavior: 'smooth' })
      } else if (tabRight > containerRight) {
        container.scrollTo({ left: tabRight - container.offsetWidth, behavior: 'smooth' })
      }
    }
  }, [activeTabId])

  // 全局点击关闭菜单
  useEffect(() => {
    const handleClick = (): void => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  // 处理横向滚动 (鼠标滚轮)
  const handleWheel = (e: React.WheelEvent): void => {
    if (tabsRef.current) {
      tabsRef.current.scrollLeft += e.deltaY
    }
  }

  // 处理中键点击关闭
  const handleMouseDown = (e: React.MouseEvent, tabId: string): void => {
    if (e.button === 1) {
      // 鼠标中键
      onTabClose(e, tabId)
    }
  }

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, tabId: string): void => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, tabId })
  }

  // 拖拽排序逻辑
  const handleDragStart = (e: React.DragEvent, tabId: string): void => {
    setDraggedTabId(tabId)
    e.dataTransfer.effectAllowed = 'move'
    // 设置一个透明的预览图（可选）
    const img = new Image()
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer.setDragImage(img, 0, 0)
  }

  const handleDragOver = (e: React.DragEvent, targetId: string): void => {
    e.preventDefault()
    if (draggedTabId && draggedTabId !== targetId) {
      onReorderTabs(draggedTabId, targetId)
    }
  }

  const handleDragEnd = (): void => {
    setDraggedTabId(null)
  }

  const renderContent = (): React.ReactNode => {
    if (!activeTab) {
      return (
        <div
          className="editor-content"
          style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
        >
          <div className="project-title">无打开的标签页</div>
          <div className="project-subtitle">从左侧资源管理器中打开一个文件以开始。</div>
        </div>
      )
    }

    if (activeTab.type === 'welcome') {
      return (
        <div
          className="editor-content"
          style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
        >
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
      <div className="editor-content">
        <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
          <h2 className="project-title" style={{ fontSize: '24px', fontWeight: '600' }}>
            {activeTab.title} {activeTab.isPinned && <span style={{ fontSize: '12px' }}>📌</span>}
          </h2>
          <p className="project-subtitle" style={{ fontSize: '12px', marginBottom: '20px' }}>
            {activeTab.path}
          </p>
          <hr
            style={{
              border: 'none',
              borderTop: '1px solid var(--border-color)',
              marginBottom: '20px'
            }}
          />
          <div style={{ color: 'var(--text-main)', lineHeight: '1.8', fontSize: '15px' }}>
            <p>
              这是 <strong>{activeTab.title}</strong> 的内容编辑区域。
            </p>
            <p>标签页高级功能已实现：</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li><strong>拖拽排序</strong>：按住标签页即可左右拖动调整位置。</li>
              <li><strong>固定标签</strong>：右键菜单选择“固定”，固定后不可被“关闭所有”清理。</li>
              <li><strong>未保存状态</strong>：模拟修改后显示圆点，关闭时会提示。</li>
              <li><strong>快捷操作</strong>：双击标签页可切换固定状态。</li>
            </ul>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button className="action-button" style={{ width: 'auto' }} onClick={() => onDirtyTab(activeTab.id)}>
                {activeTab.isDirty ? '取消模拟修改' : '模拟修改内容'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-area">
      <div className="editor-tabs" ref={tabsRef} onWheel={handleWheel}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            ref={tab.id === activeTabId ? activeTabRef : null}
            className={`editor-tab ${tab.id === activeTabId ? 'active' : ''} ${tab.isPinned ? 'pinned' : ''} ${tab.isDirty ? 'dirty' : ''} ${draggedTabId === tab.id ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={(e) => handleDragOver(e, tab.id)}
            onDragEnd={handleDragEnd}
            onClick={() => onTabSwitch(tab.id)}
            onDoubleClick={() => onPinTab(tab.id)}
            onMouseDown={(e) => handleMouseDown(e, tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
          >
            {tab.isPinned && (
              <span className="tab-pin-icon">
                <svg className="icon icon-sm" viewBox="0 0 24 24" style={{ transform: 'rotate(45deg)' }}>
                  <path d="M21 10V8h-6.7c-1.1 0-2-.9-2-2V2h-2v4c0 1.1-.9 2-2 2H2v2h5.1c.9 0 1.7.6 1.9 1.5l1 5c.2.9 1 1.5 1.9 1.5h.2c1.1 0 2-.9 2-2v-3.1c0-1.1.9-2 2-2H21z" fill="currentColor"></path>
                </svg>
              </span>
            )}
            <span className="tab-title">{tab.title}</span>
            {tab.isDirty ? (
              <span className="tab-dirty-dot" />
            ) : (
              <span className="tab-close" onClick={(e) => onTabClose(e, tab.id)}>
                ✕
              </span>
            )}
          </div>
        ))}
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="menu-item"
            onClick={() => onTabClose({} as React.MouseEvent, contextMenu.tabId)}
          >
            关闭
          </div>
          <div className="menu-item" onClick={() => onPinTab(contextMenu.tabId)}>
            {tabs.find((t) => t.id === contextMenu.tabId)?.isPinned ? '取消固定' : '固定'}
          </div>
          <div className="menu-item" onClick={() => onCloseOthers(contextMenu.tabId)}>
            关闭其他
          </div>
          <div className="menu-item" onClick={() => onCloseAll()}>
            关闭所有
          </div>
        </div>
      )}

      {renderContent()}
    </div>
  )
}

export default Editor
