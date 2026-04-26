import React, { useEffect, useRef, useState, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import { useLayoutStore } from '../stores/layoutStore'
import { useUiStore } from '../stores/uiStore'
import { usePluginService, createPluginAPI, type PluginAPI } from '../services/pluginService'
import ProofreadPanel from './ProofreadPanel'
import MemoPanel from './MemoPanel'
import SnapshotPanel from './SnapshotPanel'
import WebViewPanel from './WebViewPanel'

const isReactElement = (value: unknown): value is React.ReactElement => {
  return (
    value !== null &&
    typeof value === 'object' &&
    '$$typeof' in value &&
    typeof (value as { $$typeof: unknown }).$$typeof === 'symbol'
  )
}

const PluginPanelWrapper: React.FC<{
  panel: ((props: { api: PluginAPI }) => React.ReactNode | HTMLElement) | React.ComponentType<{ api: PluginAPI }>
  api: PluginAPI
}> = ({ panel, api }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null)
  const [reactElement, setReactElement] = useState<React.ReactElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (typeof panel !== 'function') {
      const element = React.createElement(panel as React.ComponentType<{ api: PluginAPI }>, { api })
      setReactElement(element)
      return
    }

    try {
      const result = (panel as (props: { api: PluginAPI }) => React.ReactNode | HTMLElement)({ api })

      if (result instanceof HTMLElement) {
        container.innerHTML = ''
        container.appendChild(result)
        setReactElement(null)
      } else if (isReactElement(result)) {
        setReactElement(result)
      } else if (result === null || result === undefined) {
        setReactElement(null)
      } else {
        setReactElement(result as React.ReactElement)
      }
    } catch {
      const element = React.createElement(panel as React.ComponentType<{ api: PluginAPI }>, { api })
      setReactElement(element)
    }

    return () => {
      container.innerHTML = ''
      if (rootRef.current) {
        rootRef.current.unmount()
        rootRef.current = null
      }
    }
  }, [panel, api])

  useEffect(() => {
    if (reactElement && containerRef.current) {
      if (!rootRef.current) {
        rootRef.current = createRoot(containerRef.current)
      }
      rootRef.current.render(reactElement)
    }
  }, [reactElement])

  return <div ref={containerRef} style={{ height: '100%', overflow: 'auto' }} />
}

const RightPanel: React.FC = () => {
  const { t } = useTranslation()
  const activeActivity = useUiStore((s) => s.activeRightActivity)
  const isOpen = useUiStore((s) => s.isRightSidebarOpen)
  const width = useLayoutStore((s) => s.rightPanelWidth)
  const pluginItems = usePluginService((s) => s.rightActivityItems)

  const getPluginPanel = (): React.ReactNode => {
    const item = pluginItems.find((p) => p.id === activeActivity)
    if (!item) return null

    if (item.webViewId) {
      return <WebViewPanel webViewId={item.webViewId} />
    }

    if (item.panel) {
      const api = createPluginAPI(item.pluginId)
      return <PluginPanelWrapper panel={item.panel} api={api} />
    }
    return null
  }

  const getTitle = (): string => {
    switch (activeActivity) {
      case 'proofread':
        return t('panel.proofread')
      case 'memo':
        return t('panel.memo')
      case 'snapshot':
        return t('panel.snapshot')
      default: {
        const item = pluginItems.find((p) => p.id === activeActivity)
        return item?.title || ''
      }
    }
  }

  return (
    <Sidebar isOpen={isOpen} width={width} side="right" className="right-panel">
      <div className="right-panel-header">{getTitle()}</div>
      <div className="right-panel-content">
        {activeActivity === 'proofread' && <ProofreadPanel />}
        {activeActivity === 'memo' && <MemoPanel />}
        {activeActivity === 'snapshot' && <SnapshotPanel />}
        {!['proofread', 'memo', 'snapshot'].includes(activeActivity) && getPluginPanel()}
      </div>
    </Sidebar>
  )
}

export default RightPanel
