import React, { useEffect, useRef, useState } from 'react'
import { ProjectData, Tab } from '../App'
import ContextMenu from './ContextMenu'

const ssworldNobgSvg = new URL('../assets/ssw-nobg.svg', import.meta.url).href

interface EditorProps {
  currentProject: ProjectData | null
  onOpenFolder: () => void
  onOpenWelcome: () => void
  onOpenCreateProject: () => void
  onCreateProject: (input: {
    projectName: string
    description: string
    projectPath: string
  }) => Promise<void>
  onPickProjectPath: () => Promise<string | null>
  tabs: Tab[]
  activeTabId: string
  onTabSwitch: (tabId: string) => void
  onTabClose: (e: React.MouseEvent, tabId: string) => void
  onCloseOthers: (tabId: string) => void
  onCloseAll: () => void
  onPinTab: (tabId: string) => void
  onDirtyTab: (tabId: string) => void
  onReorderTabs: (draggedId: string, targetId: string) => void
}

const Editor: React.FC<EditorProps> = ({
  currentProject,
  onOpenFolder,
  onOpenWelcome,
  onOpenCreateProject,
  onCreateProject,
  onPickProjectPath,
  tabs,
  activeTabId,
  onTabSwitch,
  onTabClose,
  onCloseOthers,
  onCloseAll,
  onPinTab,
  onDirtyTab,
  onReorderTabs
}) => {
  const tabsRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLDivElement>(null)
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null)
  const [isSubmittingProject, setIsSubmittingProject] = useState(false)
  const [createProjectForm, setCreateProjectForm] = useState({
    projectName: '',
    description: '',
    projectPath: ''
  })

  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    tabId: string
  } | null>(null)

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

  useEffect(() => {
    const handleClick = (): void => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const handleWheel = (event: React.WheelEvent): void => {
    if (tabsRef.current) {
      tabsRef.current.scrollLeft += event.deltaY
    }
  }

  const handleMouseDown = (event: React.MouseEvent, tabId: string): void => {
    if (event.button === 1) {
      onTabClose(event, tabId)
    }
  }

  const handleContextMenu = (event: React.MouseEvent, tabId: string): void => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, tabId })
  }

  const handleDragStart = (event: React.DragEvent, tabId: string): void => {
    setDraggedTabId(tabId)
    event.dataTransfer.effectAllowed = 'move'
    const img = new Image()
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    event.dataTransfer.setDragImage(img, 0, 0)
  }

  const handleDragOver = (event: React.DragEvent, targetId: string): void => {
    event.preventDefault()
    if (draggedTabId && draggedTabId !== targetId) {
      onReorderTabs(draggedTabId, targetId)
    }
  }

  const handleCreateProjectSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (isSubmittingProject) return

    setIsSubmittingProject(true)
    try {
      await onCreateProject(createProjectForm)
      setCreateProjectForm({ projectName: '', description: '', projectPath: '' })
    } finally {
      setIsSubmittingProject(false)
    }
  }

  const renderWelcome = (): React.ReactNode => (
    <div
      key="welcome"
      className="editor-content"
      style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
    >
      <img className="brand-logo brand-logo-xl" src={ssworldNobgSvg} alt="Story Studio World" />
      <div className="project-title">Story Studio World</div>
      <div className="project-subtitle" style={{ marginBottom: '40px' }}>
        {currentProject ? `当前项目：${currentProject.projectPath}` : '选择项目以开始或继续。'}
      </div>

      <div className="start-group" style={{ maxWidth: '320px' }}>
        <div className="start-item" onClick={onOpenCreateProject}>
          <span className="start-item-icon">
            <svg className="icon" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </span>
          <span>新建项目</span>
        </div>
        <div className="start-item" onClick={onOpenFolder}>
          <span className="start-item-icon">
            <svg className="icon" viewBox="0 0 24 24">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </span>
          <span>打开项目...</span>
        </div>
      </div>
    </div>
  )

  const renderEmptyState = (): React.ReactNode => (
    <div
      key="empty"
      className="editor-content"
      style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
    >
      <img
        className="brand-logo brand-logo-xl"
        src={ssworldNobgSvg}
        alt="Story Studio World"
        style={{ cursor: 'pointer' }}
        onClick={onOpenWelcome}
      />
    </div>
  )

  const renderCreateProject = (): React.ReactNode => (
    <div key="create-project" className="editor-content create-project-page">
      <div className="create-project-shell">
        <div className="create-project-title">新建项目</div>
        <div className="create-project-subtitle">
          填写项目名、简介和项目路径。创建后会自动生成{' '}
          <code>storystudioworld.sswprojectsetting</code> 项目文件。
        </div>

        <form
          className="create-project-form"
          onSubmit={(event) => void handleCreateProjectSubmit(event)}
        >
          <label className="form-field">
            <span>项目名</span>
            <input
              value={createProjectForm.projectName}
              onChange={(event) =>
                setCreateProjectForm((prev) => ({ ...prev, projectName: event.target.value }))
              }
              placeholder="例如：长夜群星"
            />
          </label>

          <label className="form-field">
            <span>项目简介</span>
            <textarea
              value={createProjectForm.description}
              onChange={(event) =>
                setCreateProjectForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="简单描述这个故事项目。"
              rows={5}
            />
          </label>

          <label className="form-field">
            <span>路径</span>
            <div className="path-picker-row">
              <input
                value={createProjectForm.projectPath}
                onChange={(event) =>
                  setCreateProjectForm((prev) => ({ ...prev, projectPath: event.target.value }))
                }
                placeholder="选择一个空文件夹路径"
              />
              <button
                type="button"
                className="action-button secondary inline-button"
                onClick={async () => {
                  const path = await onPickProjectPath()
                  if (path) {
                    setCreateProjectForm((prev) => ({ ...prev, projectPath: path }))
                  }
                }}
              >
                选择
              </button>
            </div>
          </label>

          <div className="create-project-actions">
            <button type="submit" className="action-button" disabled={isSubmittingProject}>
              {isSubmittingProject ? '创建中...' : '创建项目'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  const renderFile = (): React.ReactNode => (
    <div key={activeTab?.id} className="editor-content">
      <div style={{ maxWidth: '840px', width: '100%', margin: '0 auto' }}>
        <h2 className="project-title" style={{ fontSize: '24px', fontWeight: '600' }}>
          {activeTab?.title} {activeTab?.isPinned && <span style={{ fontSize: '12px' }}>📌</span>}
        </h2>
        <p className="project-subtitle" style={{ fontSize: '12px', marginBottom: '20px' }}>
          {activeTab?.path}
        </p>
        <hr
          style={{
            border: 'none',
            borderTop: '1px solid var(--border-color)',
            marginBottom: '20px'
          }}
        />
        <div style={{ color: 'var(--text-main)', lineHeight: '1.8', fontSize: '15px' }}>
          <p>
            当前已经打开 <strong>{activeTab?.title}</strong>。
          </p>
          <p>卷章树、项目创建和文件结构已经接入，正文编辑逻辑后续再继续扩展。</p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button
              className="action-button"
              style={{ width: 'auto' }}
              onClick={() => activeTab && onDirtyTab(activeTab.id)}
            >
              {activeTab?.isDirty ? '取消模拟修改' : '模拟修改内容'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderContent = (): React.ReactNode => {
    if (!activeTab) {
      return renderEmptyState()
    }

    if (activeTab.type === 'welcome') {
      return renderWelcome()
    }

    if (activeTab.type === 'create-project') {
      return renderCreateProject()
    }

    return renderFile()
  }

  return (
    <div className="editor-area">
      {tabs.length > 0 && (
        <div className="editor-tabs" ref={tabsRef} onWheel={handleWheel}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              ref={tab.id === activeTabId ? activeTabRef : null}
              className={`editor-tab ${tab.id === activeTabId ? 'active' : ''} ${tab.isPinned ? 'pinned' : ''} ${tab.isDirty ? 'dirty' : ''} ${draggedTabId === tab.id ? 'dragging' : ''}`}
              draggable
              onDragStart={(event) => handleDragStart(event, tab.id)}
              onDragOver={(event) => handleDragOver(event, tab.id)}
              onDragEnd={() => setDraggedTabId(null)}
              onClick={() => onTabSwitch(tab.id)}
              onMouseDown={(event) => handleMouseDown(event, tab.id)}
              onContextMenu={(event) => handleContextMenu(event, tab.id)}
            >
              <span className="tab-title">{tab.title}</span>
              <div className="tab-actions">
                {tab.isDirty && <span className="tab-dirty-dot" />}
                <span className="tab-close" onClick={(event) => onTabClose(event, tab.id)}>
                  ✕
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              key: 'close',
              label: '关闭',
              onSelect: () => onTabClose({} as React.MouseEvent, contextMenu.tabId)
            },
            {
              key: 'pin',
              label: tabs.find((tab) => tab.id === contextMenu.tabId)?.isPinned
                ? '取消固定'
                : '固定',
              onSelect: () => onPinTab(contextMenu.tabId)
            },
            {
              key: 'close-others',
              label: '关闭其他',
              onSelect: () => onCloseOthers(contextMenu.tabId)
            },
            {
              key: 'close-all',
              label: '关闭所有',
              onSelect: () => onCloseAll()
            }
          ]}
        />
      )}

      {renderContent()}
    </div>
  )
}

export default Editor
