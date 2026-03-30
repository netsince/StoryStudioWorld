import React, { useState } from 'react'
import TitleBar from './components/TitleBar'
import ActivityBar from './components/ActivityBar'
import Explorer from './components/Explorer'
import Editor from './components/Editor'
import RightSidebar from './components/RightSidebar'
import StatusBar from './components/StatusBar'

export type ActivityType = 'chapter' | 'character' | 'setting' | 'plugin'

export interface Tab {
  id: string
  title: string
  type: 'welcome' | 'file'
  path?: string
}

function App(): React.JSX.Element {
  const [activeActivity, setActiveActivity] = useState<ActivityType>('chapter')
  const [openedFolderPath, setOpenedFolderPath] = useState<string | null>(null)

  // 标签页状态
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'welcome', title: '欢迎使用', type: 'welcome' }])
  const [activeTabId, setActiveTabId] = useState<string>('welcome')

  const handleOpenFolder = async (): Promise<void> => {
    const path = await window.api.openFolder()
    if (path) {
      setOpenedFolderPath(path)
    }
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
    const newTabs = tabs.filter((t) => t.id !== tabId)
    setTabs(newTabs)

    // 如果关闭的是当前激活的标签，则激活剩下的最后一个
    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id)
    } else if (newTabs.length === 0) {
      setActiveTabId('')
    }
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

      <div className="app-container">
        <TitleBar />
        <div className="main-area">
          <ActivityBar activeActivity={activeActivity} onActivityChange={setActiveActivity} />
          <Explorer
            activeActivity={activeActivity}
            openedFolderPath={openedFolderPath}
            onOpenFolder={handleOpenFolder}
            onOpenFile={(title, path) => openTab({ id: path, title, type: 'file', path })}
          />
          <Editor
            openedFolderPath={openedFolderPath}
            onOpenFolder={handleOpenFolder}
            tabs={tabs}
            activeTabId={activeTabId}
            onTabSwitch={switchTab}
            onTabClose={closeTab}
          />
          <RightSidebar />
        </div>
        <StatusBar />
      </div>
    </>
  )
}

export default App
