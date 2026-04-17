import React, { useMemo } from 'react'
import { useStatusbar, StatusbarAlignment } from '../contexts/StatusbarContext'

const StatusBar: React.FC = () => {
  const { entries } = useStatusbar()

  const leftEntries = useMemo(() => {
    return Array.from(entries.values())
      .filter(e => e.alignment === StatusbarAlignment.LEFT)
      // priority 数值越大优先级越高，排在前面（靠外侧）
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  }, [entries])

  const rightEntries = useMemo(() => {
    return Array.from(entries.values())
      .filter(e => e.alignment === StatusbarAlignment.RIGHT)
      // priority 数值越大优先级越高，排在前面（靠外侧）
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  }, [entries])

  const renderEntry = (entry: typeof leftEntries[0]) => (
    <div
      key={entry.id}
      className="status-item"
      title={entry.tooltip || entry.ariaLabel}
      onClick={entry.command}
      style={{ cursor: entry.command ? 'pointer' : 'default' }}
    >
      {entry.text}
    </div>
  )

  return (
    <div className="status-bar">
      <div className="status-left">
        {leftEntries.map(renderEntry)}
      </div>
      <div className="status-right">
        {rightEntries.map(renderEntry)}
      </div>
    </div>
  )
}

export default StatusBar
