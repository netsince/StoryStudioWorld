import React from 'react'
import { createPortal } from 'react-dom'

export interface ContextMenuItem {
  key: string
  label: string
  onSelect: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose?: () => void
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menu = (
    <div
      className="context-menu"
      style={{ position: 'fixed', top: y, left: x, zIndex: 100000, pointerEvents: 'auto' }}
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
                backgroundColor: 'var(--border-color, #454545)',
                margin: '4px 0'
              }}
            />
          )
        }
        return (
          <div
            key={item.key}
            className="menu-item"
            onMouseDown={(event) => {
              // Use mousedown instead of click to avoid losing the user gesture when the menu closes.
              if (event.button !== 0) return
              event.preventDefault()
              event.stopPropagation()
              item.onSelect()
              onClose?.()
            }}
          >
            {item.label}
          </div>
        )
      })}
    </div>
  )

  return createPortal(menu, document.body)
}

export default ContextMenu
