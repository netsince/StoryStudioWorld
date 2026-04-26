import React, { useMemo } from 'react'
import { useStatusbar, StatusbarAlignment } from '../contexts/StatusbarContext'
import { usePluginService } from '../services/pluginService'

const StatusBar: React.FC = () => {
  const { entries } = useStatusbar()
  const pluginStatusBarItems = usePluginService((s) => s.statusBarItems)

  const leftEntries = useMemo(() => {
    return (
      Array.from(entries.values())
        .filter((e) => e.alignment === StatusbarAlignment.LEFT)
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    )
  }, [entries])

  const rightEntries = useMemo(() => {
    return (
      Array.from(entries.values())
        .filter((e) => e.alignment === StatusbarAlignment.RIGHT)
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    )
  }, [entries])

  const pluginLeftItems = useMemo(() => {
    return pluginStatusBarItems
      .filter((item) => item.alignment === 'left')
      .sort((a, b) => b.priority - a.priority)
  }, [pluginStatusBarItems])

  const pluginRightItems = useMemo(() => {
    return pluginStatusBarItems
      .filter((item) => item.alignment === 'right')
      .sort((a, b) => b.priority - a.priority)
  }, [pluginStatusBarItems])

  const renderEntry = (entry: (typeof leftEntries)[0]): React.ReactNode => (
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

  const renderPluginItem = (item: (typeof pluginStatusBarItems)[0]): React.ReactNode => (
    <div
      key={`plugin-${item.pluginId}-${item.id}`}
      className="status-item"
      title={item.tooltip}
      onClick={item.onClick}
      style={{ cursor: item.onClick ? 'pointer' : 'default' }}
    >
      {item.render()}
    </div>
  )

  return (
    <div className="status-bar">
      <div className="status-left">
        {leftEntries.map(renderEntry)}
        {pluginLeftItems.map(renderPluginItem)}
      </div>
      <div className="status-right">
        {pluginRightItems.map(renderPluginItem)}
        {rightEntries.map(renderEntry)}
      </div>
    </div>
  )
}

export default StatusBar
