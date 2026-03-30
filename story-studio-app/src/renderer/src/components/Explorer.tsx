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
      <div style={{ minWidth: '200px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="explorer-header">{getActivityTitle()}</div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
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
            <div className="explorer-tree">
              <div
                className="explorer-list-item"
                style={{ opacity: 0.7, fontSize: '11px', fontWeight: 'bold' }}
              >
                项目路径: {openedFolderPath.split(/[\\\/]/).pop()}
              </div>
              <div
                className="explorer-list-item"
                onClick={() => onOpenFile('第一章：启程.md', `${openedFolderPath}/chapter1.md`)}
              >
                <svg className="icon icon-sm" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                第一章：启程.md
              </div>
              <div
                className="explorer-list-item"
                onClick={() => onOpenFile('第二章：迷雾.md', `${openedFolderPath}/chapter2.md`)}
              >
                <svg className="icon icon-sm" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                第二章：迷雾.md
              </div>
              <div
                className="explorer-list-item"
                onClick={() => onOpenFile('角色设定.json', `${openedFolderPath}/characters.json`)}
              >
                <svg className="icon icon-sm" viewBox="0 0 24 24">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                角色设定.json
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <div className="explorer-header" style={{ padding: '0 15px 10px 15px' }}>
              最近的项目
            </div>
            <div
              className="explorer-list-item"
              onClick={() => onOpenFile('我的奇幻小说.story', 'D:/Stories/fantasy.story')}
            >
              <svg className="icon icon-sm" viewBox="0 0 24 24">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              我的奇幻小说
            </div>
            <div
              className="explorer-list-item"
              onClick={() => onOpenFile('废土世界.story', 'D:/Stories/wasteland.story')}
            >
              <svg className="icon icon-sm" viewBox="0 0 24 24">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              废土世界
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Explorer
