import React, { useState } from 'react'
import TitleBar from './components/TitleBar'
import ActivityBar from './components/ActivityBar'
import Explorer from './components/Explorer'
import Editor from './components/Editor'
import RightActivityBar from './components/RightActivityBar'
import RightPanel from './components/RightPanel'
import StatusBar from './components/StatusBar'
import Sash from './components/Sash'

export type ActivityType = 'chapter' | 'character' | 'setting' | 'plugin'
export type RightActivityType = 'proofread' | 'memo' | 'archive'

export interface Tab {
  id: string
  title: string
  type: 'welcome' | 'file'
  path?: string
  isDirty?: boolean
  isPinned?: boolean
}

function App(): React.JSX.Element {
  const [activeActivity, setActiveActivity] = useState<ActivityType>('chapter')
  const [activeRightActivity, setActiveRightActivity] = useState<RightActivityType>('proofread')
  const [isExplorerOpen, setIsExplorerOpen] = useState(true)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false)
  const [openedFolderPath, setOpenedFolderPath] = useState<string | null>(null)

  // 宽度状态
  const [explorerWidth, setExplorerWidth] = useState(250)
  const [rightPanelWidth, setRightPanelWidth] = useState(300)
  const [isDragging, setIsDragging] = useState(false)

  // 标签页状态
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'welcome', title: '欢迎使用', type: 'welcome' }])
  const [activeTabId, setActiveTabId] = useState<string>('welcome')

  const handleOpenFolder = async (): Promise<void> => {
    const path = await window.api.openFolder()
    if (path) {
      setOpenedFolderPath(path)
    }
  }

  // 侧边栏切换逻辑
  const handleActivityChange = (activity: ActivityType): void => {
    if (activeActivity === activity) {
      setIsExplorerOpen(!isExplorerOpen)
    } else {
      setActiveActivity(activity)
      setIsExplorerOpen(true)
    }
  }

  const handleRightActivityChange = (activity: RightActivityType): void => {
    if (activeRightActivity === activity) {
      setIsRightSidebarOpen(!isRightSidebarOpen)
    } else {
      setActiveRightActivity(activity)
      setIsRightSidebarOpen(true)
    }
  }

  // 调整宽度逻辑
  const handleExplorerResize = (deltaX: number): void => {
    setExplorerWidth((prev) => Math.max(150, Math.min(600, prev + deltaX)))
  }

  const handleRightPanelResize = (deltaX: number): void => {
    setRightPanelWidth((prev) => Math.max(150, Math.min(600, prev + deltaX)))
  }

  // 标签页操作逻辑
  const openTab = (tab: Tab): void => {
    if (!tabs.find((t) => t.id === tab.id)) {
      setTabs([...tabs, tab])
    }
    setActiveTabId(tab.id)
  }

  const closeTab = (e: React.MouseEvent, tabId: string): void => {
    e.stopPropagation()
    const tab = tabs.find((t) => t.id === tabId)
    // 如果是脏数据，模拟确认关闭 (此处简化)
    if (tab?.isDirty && !window.confirm(`${tab.title} 有未保存的更改，确定要关闭吗？`)) {
      return
    }

    const newTabs = tabs.filter((t) => t.id !== tabId)
    setTabs(newTabs)

    // 如果关闭的是当前激活的标签，则激活剩下的最后一个
    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id)
    } else if (newTabs.length === 0) {
      setActiveTabId('')
    }
  }

  const closeOtherTabs = (tabId: string): void => {
    const newTabs = tabs.filter((t) => t.id === tabId || t.isPinned)
    setTabs(newTabs)
    setActiveTabId(tabId)
  }

  const closeAllTabs = (): void => {
    const newTabs = tabs.filter((t) => t.isPinned)
    setTabs(newTabs)
    if (newTabs.length > 0) {
      setActiveTabId(newTabs[0].id)
    } else {
      setActiveTabId('')
    }
  }

  const togglePinTab = (tabId: string): void => {
    setTabs(tabs.map(t => t.id === tabId ? { ...t, isPinned: !t.isPinned } : t))
  }

  const toggleDirtyTab = (tabId: string): void => {
    setTabs(tabs.map(t => t.id === tabId ? { ...t, isDirty: !t.isDirty } : t))
  }

  const reorderTabs = (draggedId: string, targetId: string): void => {
    const draggedIndex = tabs.findIndex(t => t.id === draggedId)
    const targetIndex = tabs.findIndex(t => t.id === targetId)
    if (draggedIndex === -1 || targetIndex === -1) return

    const newTabs = [...tabs]
    const [draggedTab] = newTabs.splice(draggedIndex, 1)
    newTabs.splice(targetIndex, 0, draggedTab)
    setTabs(newTabs)
  }

  const switchTab = (tabId: string): void => {
    setActiveTabId(tabId)
  }

  return (
    <>
      {/* 全局 SVG 资源定义 */}
      <svg style={{ display: 'none' }}>
        <defs>
          <linearGradient
            id="brandGradient"
            x1="-344.92"
            y1="2136.1"
            x2="1972.3"
            y2="47.63"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#30cfd0" />
            <stop offset="1" stopColor="#330867" />
          </linearGradient>
        </defs>
      </svg>

      <div className={`app-container ${isDragging ? 'dragging' : ''}`}>
        <TitleBar />
        <div className="main-area">
          <ActivityBar activeActivity={activeActivity} onActivityChange={handleActivityChange} />
          <div style={{ position: 'relative', display: 'flex', height: '100%' }}>
            <Explorer
              activeActivity={activeActivity}
              openedFolderPath={openedFolderPath}
              onOpenFolder={handleOpenFolder}
              onOpenFile={(title, path) => openTab({ id: path, title, type: 'file', path })}
              isOpen={isExplorerOpen}
              width={isExplorerOpen ? explorerWidth : 0}
            />
            {isExplorerOpen && (
              <Sash
                side="left"
                onResize={handleExplorerResize}
                setIsDraggingGlobal={setIsDragging}
              />
            )}
          </div>

          <Editor
            openedFolderPath={openedFolderPath}
            onOpenFolder={handleOpenFolder}
            tabs={tabs}
            activeTabId={activeTabId}
            onTabSwitch={switchTab}
            onTabClose={closeTab}
            onCloseOthers={closeOtherTabs}
            onCloseAll={closeAllTabs}
            onPinTab={togglePinTab}
            onDirtyTab={toggleDirtyTab}
            onReorderTabs={reorderTabs}
          />

          <div style={{ position: 'relative', display: 'flex', height: '100%' }}>
            {isRightSidebarOpen && (
              <Sash
                side="right"
                onResize={handleRightPanelResize}
                setIsDraggingGlobal={setIsDragging}
              />
            )}
            <RightPanel
              activeActivity={activeRightActivity}
              isOpen={isRightSidebarOpen}
              width={isRightSidebarOpen ? rightPanelWidth : 0}
            />
            <RightActivityBar
              activeActivity={activeRightActivity}
              onActivityChange={handleRightActivityChange}
            />
          </div>
        </div>
        <StatusBar />
      </div>
    </>
  )
}

export default App
