import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface ContextMenuItem {
  key: string
  label: string
  shortcut?: string
  onSelect: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose?: () => void
}

// 解析标签和快捷键
const parseLabel = (label: string): { text: string; shortcut?: string } => {
  const match = label.match(/^(.+?)\s*\((.+?)\)$/)
  if (match) {
    return { text: match[1], shortcut: match[2] }
  }
  return { text: label }
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  // 监听 Escape 键关闭菜单
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const menu = (
    <>
      {/* 透明遮罩层：点击空白处关闭菜单 */}
      <div
        className="context-menu-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          backgroundColor: 'transparent'
        }}
        onClick={() => onClose?.()}
        onContextMenu={(event) => {
          event.preventDefault()
          onClose?.()
        }}
      />
      {/* 菜单内容 */}
      <div
        className="context-menu"
        style={{
          position: 'fixed',
          top: y,
          left: x,
          zIndex: 100000,
          pointerEvents: 'auto',
          backgroundColor: 'var(--menu-bg, #252526)',
          border: '1px solid var(--menu-border, #454545)',
          borderRadius: '6px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          padding: '4px 0',
          minWidth: '160px',
          fontSize: '13px',
          lineHeight: '1.4'
        }}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        {items.map((item) => {
          // 分隔符处理
          if (item.label === '---') {
            return (
              <div
                key={item.key}
                className="menu-separator"
                style={{
                  height: '1px',
                  backgroundColor: 'var(--menu-border, #454545)',
                  margin: '4px 8px'
                }}
              />
            )
          }

          const { text, shortcut } = parseLabel(item.label)

          return (
            <div
              key={item.key}
              className="menu-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                cursor: 'pointer',
                color: 'var(--menu-fg, #cccccc)',
                transition: 'background-color 0.1s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--menu-hover-bg, #094771)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
              onMouseDown={(event) => {
                // Use mousedown instead of click to avoid losing the user gesture when the menu closes.
                if (event.button !== 0) return
                event.preventDefault()
                event.stopPropagation()
                item.onSelect()
                onClose?.()
              }}
            >
              <span>{text}</span>
              {shortcut && (
                <span
                  style={{
                    marginLeft: '24px',
                    fontSize: '12px',
                    color: 'var(--menu-shortcut-fg, #888888)',
                    opacity: 0.8
                  }}
                >
                  {shortcut}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </>
  )

  return createPortal(menu, document.body)
}

export default ContextMenu
