import React from 'react'

const ssworldSvg = new URL('../assets/ssworld.svg', import.meta.url).href

interface TitleBarProps {
  onOpenWelcome: () => void
}

const TitleBar: React.FC<TitleBarProps> = ({ onOpenWelcome }) => {
  const handleMinimize = (): void => window.api.minimize()
  const handleMaximize = (): void => window.api.maximize()
  const handleClose = (): void => window.api.close()

  return (
    <div className="title-bar">
      <div className="title-bar-left">
        <div className="app-logo" onClick={onOpenWelcome} style={{ cursor: 'pointer' }}>
          <img className="brand-logo" src={ssworldSvg} alt="Story Studio World" />
          Story Studio World
        </div>
        <div className="title-bar-menu">
          <span>文件</span>
          <span>编辑</span>
          <span>选择</span>
          <span>查看</span>
          <span>转到</span>
          <span>帮助</span>
        </div>
      </div>
      <div className="title-bar-controls">
        <span onClick={handleMinimize}>—</span>
        <span onClick={handleMaximize}>□</span>
        <span className="close" onClick={handleClose}>
          ✕
        </span>
      </div>
    </div>
  )
}

export default TitleBar
