import React from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '../stores/uiStore'
import { useEditorStore } from '../stores/editorStore'
import { useUiSettings } from '../hooks/useUiSettings'

const ActivityBar: React.FC = () => {
  const { t } = useTranslation()
  const activeActivity = useUiStore((s) => s.activeActivity)
  const isOpen = useUiStore((s) => s.isExplorerOpen)
  const onActivityChange = useUiStore((s) => s.handleActivityChange)
  const openExportStoryTab = useEditorStore((s) => s.openExportStoryTab)
  const { hideActivityBarLabel: hideLabel } = useUiSettings()

  return (
    <div className="activity-bar">
      <div
        className={`activity-item ${isOpen && activeActivity === 'chapter' ? 'active' : ''}`}
        title={t('activity.write')}
        onClick={() => onActivityChange('chapter')}
      >
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        {!hideLabel && <span>{t('activity.write')}</span>}
      </div>
      <div
        className={`activity-item ${isOpen && activeActivity === 'setting' ? 'active' : ''}`}
        title={t('activity.setting')}
        onClick={() => onActivityChange('setting')}
      >
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </div>
        {!hideLabel && <span>{t('activity.setting')}</span>}
      </div>
      <div
        className={`activity-item ${isOpen && activeActivity === 'plugin' ? 'active' : ''}`}
        title={t('activity.plugin')}
        onClick={() => onActivityChange('plugin')}
      >
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        </div>
        {!hideLabel && <span>{t('activity.plugin')}</span>}
      </div>
      <div
        className="activity-item"
        title={t('activity.export')}
        onClick={openExportStoryTab}
      >
        <div className="activity-icon">
          <svg className="icon icon-lg" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </div>
        {!hideLabel && <span>{t('activity.export')}</span>}
      </div>
      <div
        className="activity-item"
        title={t('common.more')}
        style={{ marginTop: 'auto', marginBottom: '10px' }}
      >
        <span className="activity-icon">⋯</span>
      </div>
    </div>
  )
}

export default ActivityBar
