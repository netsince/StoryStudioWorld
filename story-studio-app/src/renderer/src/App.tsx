import React, { useState } from 'react'
import TitleBar from './components/TitleBar'
import ActivityBar from './components/ActivityBar'
import Explorer from './components/Explorer'
import Editor from './components/Editor'
import RightSidebar from './components/RightSidebar'
import StatusBar from './components/StatusBar'

export type ActivityType = 'chapter' | 'character' | 'setting' | 'plugin'

function App(): React.JSX.Element {
  const [activeActivity, setActiveActivity] = useState<ActivityType>('chapter')
  const [openedFolderPath, setOpenedFolderPath] = useState<string | null>(null)

  const handleOpenFolder = async (): Promise<void> => {
    const path = await window.api.openFolder()
    if (path) {
      setOpenedFolderPath(path)
    }
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
          />
          <Editor openedFolderPath={openedFolderPath} onOpenFolder={handleOpenFolder} />
          <RightSidebar />
        </div>
        <StatusBar />
      </div>
    </>
  )
}

export default App
