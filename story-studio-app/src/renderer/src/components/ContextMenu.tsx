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
      style={{ position: 'fixed', top: y, left: x, zIndex: 1000 }}
      onClick={(event) => event.stopPropagation()}
    >
      {items.map((item) => (
        <div
          key={item.key}
          className="menu-item"
          onClick={() => {
            item.onSelect()
            onClose?.()
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  )

  return createPortal(menu, document.body)
}

export default ContextMenu
