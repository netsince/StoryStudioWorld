import React from 'react'
import type { ProjectData } from '../../models'

const ssworldNobgSvg = new URL('../../assets/ssw-nobg.svg', import.meta.url).href

export const EmptyState: React.FC<{ onOpenWelcome: () => void }> = ({ onOpenWelcome }) => (
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

const WelcomePage: React.FC<{
  currentProject: ProjectData | null
  onOpenCreateProject: () => void
  onOpenFolder: () => void
}> = ({ currentProject, onOpenCreateProject, onOpenFolder }) => (
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

export default WelcomePage

