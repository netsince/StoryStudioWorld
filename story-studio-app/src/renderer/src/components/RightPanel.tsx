import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import { useLayoutStore } from '../stores/layoutStore'
import { useUiStore } from '../stores/uiStore'
import { usePluginService, createPluginAPI, type PluginAPI } from '../services/pluginService'
import ProofreadPanel from './ProofreadPanel'
import MemoPanel from './MemoPanel'
import SnapshotPanel from './SnapshotPanel'

const PluginPanelWrapper: React.FC<{
  panel: ((props: { api: PluginAPI }) => React.ReactNode | HTMLElement) | React.ComponentType<{ api: PluginAPI }>
  api: PluginAPI
}> = ({ panel, api }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''

    if (typeof panel === 'function') {
      try {
        const result = (panel as (props: { api: unknown }) => React.ReactNode | HTMLElement)({ api })

        if (result instanceof HTMLElement) {
          container.appendChild(result)
        }
      } catch {
        // If it throws, it's probably a React component
      }
    }

    return () => {
      container.innerHTML = ''
    }
  }, [panel, api])

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
    if (item?.panel) {
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
