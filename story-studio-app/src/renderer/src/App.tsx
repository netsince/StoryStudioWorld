import React from 'react'
import TitleBar from './components/TitleBar'
import ActivityBar from './components/ActivityBar'
import Explorer from './components/Explorer'
import Editor from './components/Editor'
import RightSidebar from './components/RightSidebar'
import StatusBar from './components/StatusBar'

function App(): React.JSX.Element {
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
          <ActivityBar />
          <Explorer />
          <Editor />
          <RightSidebar />
        </div>
        <StatusBar />
      </div>
    </>
  )
}

export default App
