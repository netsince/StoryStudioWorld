import React from 'react'

const TitleBar: React.FC = () => {
  const handleMinimize = (): void => window.api.minimize()
  const handleMaximize = (): void => window.api.maximize()
  const handleClose = (): void => window.api.close()

  return (
    <div className="title-bar">
      <div className="title-bar-left">
        <div className="app-logo">
          <svg className="brand-logo" viewBox="0 0 1920 1920">
            <rect fill="url(#brandGradient)" x="38.97" y="53.96" width="1842.06" height="1812.08" />
            <path
              fill="#ffffff"
              d="m1069.48,1340.14l-288.83,134.7c-14.31,6.67-30.18-5.61-27.31-21.13l57.87-313.39L1570.56,158.89H158.89v1602.22h1602.22V446.24l-691.64,893.91Zm-339.41,259.1h-414.17c-16.56,0-29.99-13.43-29.99-29.99s13.43-29.99,29.99-29.99h414.17c16.56,0,29.99,13.43,29.99,29.99s-13.43,29.99-29.99,29.99Z"
            />
          </svg>
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
