import React from 'react'
import { ActivityType } from '../App'

interface ExplorerProps {
  activeActivity: ActivityType
  openedFolderPath: string | null
  onOpenFolder: () => void
  onOpenFile: (title: string, path: string) => void
  isOpen: boolean
  width: number
}

const Explorer: React.FC<ExplorerProps> = ({
  activeActivity,
  openedFolderPath,
  onOpenFolder,
  onOpenFile,
  isOpen,
  width
}) => {
  if (!isOpen) return null

  const getActivityTitle = (): string => {
    switch (activeActivity) {
      case 'chapter':
        return '资源管理器'
      case 'character':
        return '角色管理'
      case 'setting':
        return '世界设定'
      case 'plugin':
        return '插件中心'
      default:
        return '资源管理器'
    }
  }

  return (
    <div className={`explorer-panel ${isOpen ? 'open' : ''}`} style={{ width: `${width}px` }}>
      <div style={{ minWidth: `${width}px` }}>
        <div className="explorer-header">{getActivityTitle()}</div>

        {!openedFolderPath ? (
          <div className="explorer-content">
            <div className="explorer-text-group">您尚未打开任何项目。</div>
            <button
              className="action-button"
              onClick={() => onOpenFile('新项目.txt', 'root/new-project.txt')}
            >
              新建项目
            </button>
            <button className="action-button secondary" onClick={onOpenFolder}>
              打开文件夹
            </button>
          </div>
        ) : (
          <div className="explorer-content">
            <div
              className="explorer-text-group"
              style={{ wordBreak: 'break-all', fontSize: '12px' }}
            >
              已打开: {openedFolderPath}
            </div>
            <div
              className="explorer-list-item"
              onClick={() => onOpenFile('示例章节.md', `${openedFolderPath}/chapter1.md`)}
            >
              <svg className="icon icon-sm" viewBox="0 0 24 24">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              项目文件加载中... (点击模拟打开)
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <div className="explorer-header" style={{ padding: '0 15px 10px 15px' }}>
            最近的项目
          </div>
          <div
            className="explorer-list-item"
            onClick={() => onOpenFile('最近项目.log', 'history/recent.log')}
          >
            <svg className="icon icon-sm" style={{ marginRight: '8px' }} viewBox="0 0 24 24">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            项目列表... (点击模拟打开)
          </div>
        </div>
      </div>
    </div>
  )
}

export default Explorer
