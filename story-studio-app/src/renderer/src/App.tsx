import React, { useEffect } from 'react'
import TitleBar from './components/TitleBar'
import ActivityBar from './components/ActivityBar'
import Explorer from './components/Explorer'
import Editor from './components/Editor'
import RightActivityBar from './components/RightActivityBar'
import RightPanel from './components/RightPanel'
import StatusBar from './components/StatusBar'
import Sash from './components/Sash'
import { StatusbarProvider } from './contexts/StatusbarContext'
import { useLayoutStore } from './stores/layoutStore'
import { useProjectStore } from './stores/projectStore'
import { useUiStore } from './stores/uiStore'

function App(): React.JSX.Element {
  const isExplorerOpen = useUiStore((s) => s.isExplorerOpen)
  const isRightSidebarOpen = useUiStore((s) => s.isRightSidebarOpen)
  const isZenMode = useUiStore((s) => s.isZenMode)

  const layoutSize = useLayoutStore((s) => s.layoutSize)
  const isDragging = useLayoutStore((s) => s.isDragging)
  const setIsDragging = useLayoutStore((s) => s.setIsDragging)
  const handleExplorerResize = useLayoutStore((s) => s.handleExplorerResize)
  const handleRightPanelResize = useLayoutStore((s) => s.handleRightPanelResize)

  useEffect(() => {
    const cleanup = useLayoutStore.getState().startWindowResizeListener()
    return cleanup
  }, [])

  useEffect(() => {
    void useProjectStore.getState().restoreLastProjectOrWelcome()
  }, [])

  return (
    <>
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

      <StatusbarProvider>
        <div className={`app-container ${isDragging ? 'dragging' : ''} layout-${layoutSize}`}>
          {!isZenMode && <TitleBar />}
          <div className="main-area" style={isZenMode ? { marginLeft: 0 } : undefined}>
            {!isZenMode && <ActivityBar />}
            <div style={{ position: 'relative', display: 'flex', height: '100%' }}>
              {!isZenMode && <Explorer />}
              {isExplorerOpen && !isZenMode && (
                <Sash
                  side="left"
                  onResize={handleExplorerResize}
                  setIsDraggingGlobal={setIsDragging}
                />
              )}
            </div>

            <Editor />

            <div style={{ display: 'flex', height: '100%' }}>
              <div style={{ position: 'relative', display: 'flex', height: '100%' }}>
                {isRightSidebarOpen && !isZenMode && (
                  <Sash
                    side="right"
                    onResize={handleRightPanelResize}
                    setIsDraggingGlobal={setIsDragging}
                  />
                )}
                {!isZenMode && <RightPanel />}
              </div>
              {!isZenMode && <RightActivityBar />}
            </div>
          </div>
          {!isZenMode && <StatusBar />}
        </div>
      </StatusbarProvider>
    </>
  )
}

export default App
