import React, { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '../stores/editorStore'
import ContextMenu, { type ContextMenuItem } from './ContextMenu'

const ssworldSvg = new URL('../assets/ssworld.svg', import.meta.url).href

const TitleBar: React.FC = () => {
  const onOpenWelcome = useEditorStore((s) => s.openWelcomeTab)
  const openAboutTab = useEditorStore((s) => s.openAboutTab)
  const handleMinimize = (): void => window.api.minimize()
  const handleMaximize = (): void => window.api.maximize()
  const handleClose = (): void => window.api.close()

  // 帮助菜单状态
  const [helpMenuOpen, setHelpMenuOpen] = useState(false)
  const [helpMenuPos, setHelpMenuPos] = useState({ x: 0, y: 0 })
  const helpMenuRef = useRef<HTMLSpanElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
        setHelpMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleHelpClick = () => {
    if (helpMenuRef.current) {
      const rect = helpMenuRef.current.getBoundingClientRect()
      setHelpMenuPos({ x: rect.left, y: rect.bottom + 4 })
    }
    setHelpMenuOpen(!helpMenuOpen)
  }

  const helpMenuItems: ContextMenuItem[] = [
    {
      key: 'about',
      label: '关于',
      onSelect: () => {
        openAboutTab()
        setHelpMenuOpen(false)
      }
    }
  ]

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
          <span
            ref={helpMenuRef}
            style={{ cursor: 'pointer' }}
            onClick={handleHelpClick}
          >
            帮助
          </span>
          {helpMenuOpen && (
            <ContextMenu
              x={helpMenuPos.x}
              y={helpMenuPos.y}
              items={helpMenuItems}
              onClose={() => setHelpMenuOpen(false)}
            />
          )}
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
