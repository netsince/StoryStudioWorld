import React from 'react'

interface SidebarProps {
  isOpen: boolean
  width: number
  side: 'left' | 'right'
  className?: string
  children: React.ReactNode
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, width, side, className = '', children }) => {
  return (
    <div
      className={`sidebar sidebar-${side} ${isOpen ? 'open' : ''} ${className}`}
      style={{
        width: `${isOpen ? width : 0}px`,
        minWidth: `${isOpen ? width : 0}px`,
        maxWidth: `${isOpen ? width : 0}px`,
        overflow: 'hidden'
      }}
    >
      <div className="sidebar-inner" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

export default Sidebar
