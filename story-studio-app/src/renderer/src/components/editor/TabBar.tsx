import React, { useEffect, useRef } from 'react'
import type { Tab } from '../../models'

interface TabBarProps {
  groupId: string
  tabs: Tab[]
  activeTabId: string
  draggedTabId: string | null

  onTabClick: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onTabContextMenu: (event: React.MouseEvent, tabId: string) => void

  onTabDragStart: (event: React.DragEvent, tabId: string) => void
  onTabDragOver: (event: React.DragEvent, tabId: string) => void
  onTabDragEnd: () => void
}

const TabBar: React.FC<TabBarProps> = ({
  groupId,
  tabs,
  activeTabId,
  draggedTabId,
  onTabClick,
  onTabClose,
  onTabContextMenu,
  onTabDragStart,
  onTabDragOver,
  onTabDragEnd
}) => {
  const tabsRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeTabRef.current && tabsRef.current) {
      const container = tabsRef.current
      const tab = activeTabRef.current
      const tabLeft = tab.offsetLeft
      const tabRight = tabLeft + tab.offsetWidth
      const containerLeft = container.scrollLeft
      const containerRight = containerLeft + container.offsetWidth

      if (tabLeft < containerLeft) {
        container.scrollTo({ left: tabLeft, behavior: 'smooth' })
      } else if (tabRight > containerRight) {
        container.scrollTo({ left: tabRight - container.offsetWidth, behavior: 'smooth' })
      }
    }
  }, [activeTabId])

  const handleWheel = (event: React.WheelEvent): void => {
    if (tabsRef.current) {
      tabsRef.current.scrollLeft += event.deltaY
    }
  }

  if (tabs.length === 0) return null

  return (
    <div
      className="editor-tabs"
      ref={tabsRef}
      onWheel={handleWheel}
      onDragOver={(event) => event.preventDefault()}
      data-group={groupId}
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          ref={tab.id === activeTabId ? activeTabRef : null}
          className={`editor-tab ${tab.id === activeTabId ? 'active' : ''} ${tab.isPinned ? 'pinned' : ''} ${tab.isDirty ? 'dirty' : ''} ${draggedTabId === tab.id ? 'dragging' : ''}`}
          draggable
          onDragStart={(event) => onTabDragStart(event, tab.id)}
          onDragOver={(event) => onTabDragOver(event, tab.id)}
          onDragEnd={onTabDragEnd}
          onClick={() => onTabClick(tab.id)}
          onContextMenu={(event) => onTabContextMenu(event, tab.id)}
        >
          <span className="tab-title">{tab.title}</span>
          <div className="tab-actions">
            {tab.isDirty && <span className="tab-dirty-dot" />}
            <span
              className="tab-close"
              onClick={(event) => {
                event.stopPropagation()
                onTabClose(tab.id)
              }}
            >
              ✕
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default TabBar
