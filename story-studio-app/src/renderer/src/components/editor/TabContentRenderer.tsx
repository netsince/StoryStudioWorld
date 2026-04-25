import React, { useEffect, useState } from 'react'
import type { Tab, ProjectData } from '../../models'
import { useProjectStore } from '../../stores/projectStore'
import ArchiveView from './ArchiveView'
import PlainTextEditor from '../PlainTextEditor'
import SettingEditor from './SettingEditor'
import SettingFieldEditor from './SettingFieldEditor'
import CreateProjectForm, { CreateProjectInput } from './CreateProjectForm'
import WelcomePage from './WelcomePage'
import AboutPage from './AboutPage'
import PreferencesPage from './PreferencesPage'

interface TabContentRendererProps {
  tab: Tab
  groupId: string
  currentProject: ProjectData | null
  onOpenCreateProject: () => void
  onOpenFolder: () => void
  onCreateProject: (input: CreateProjectInput) => Promise<void>
  saveNodeContent: (nodeId: string, content: string) => Promise<void>
  setDraft: (nodeId: string, content: string) => void
  clearDraft: (nodeId: string) => void
  setDirtyTab: (groupId: string, tabId: string, isDirty: boolean) => void
}

const TabContentRenderer: React.FC<TabContentRendererProps> = ({
  tab,
  groupId,
  currentProject,
  onOpenCreateProject,
  onOpenFolder,
  onCreateProject,
  saveNodeContent,
  setDraft,
  clearDraft,
  setDirtyTab
}) => {
  const [editorContent, setEditorContent] = useState<string>('')

  useEffect(() => {
    const loadContent = async (): Promise<void> => {
      if (tab.type === 'file' && tab.nodeId && currentProject) {
        const draft = useProjectStore.getState().draftsByNodeId[tab.nodeId]
        if (typeof draft === 'string') {
          setEditorContent(draft)
          return
        }

        const content = await window.api.readNodeContent(
          currentProject.projectSettingsPath,
          tab.nodeId
        )
        setEditorContent(content || '')
      }
    }
    void loadContent()
  }, [tab.id, tab.nodeId, tab.type, currentProject])

  const handleEditorChange = (content: string): void => {
    setEditorContent(content)
    if (tab.type === 'file') {
      setDirtyTab(groupId, tab.id, true)
      if (tab.nodeId) {
        setDraft(tab.nodeId, content)
      }
    }
  }

  const handleSave = async (): Promise<void> => {
    if (tab.type === 'file' && tab.nodeId && currentProject) {
      await saveNodeContent(tab.nodeId, editorContent)
      setDirtyTab(groupId, tab.id, false)
      clearDraft(tab.nodeId)
    }
  }

  if (tab.type === 'welcome') {
    return (
      <WelcomePage
        currentProject={currentProject}
        onOpenCreateProject={onOpenCreateProject}
        onOpenFolder={onOpenFolder}
      />
    )
  }

  if (tab.type === 'create-project') {
    return (
      <CreateProjectForm
        onCreateProject={onCreateProject}
        onPickProjectPath={() => window.api.pickProjectPath()}
      />
    )
  }

  if (tab.type === 'about') {
    return <AboutPage />
  }

  if (tab.type === 'preferences') {
    return <PreferencesPage />
  }

  if (tab.type === 'archive') {
    return <ArchiveView kind={tab.id === 'setting-archive' ? 'setting' : 'story'} />
  }

  if (tab.type === 'file') {
    if (tab.kind === 'setting') {
      if (tab.field) {
        return (
          <div className="editor-content">
            <SettingFieldEditor
              nodeId={tab.nodeId!}
              field={tab.field}
              groupId={groupId}
              tabId={tab.id}
            />
          </div>
        )
      }
      return (
        <div className="editor-content">
          <SettingEditor
            nodeId={tab.nodeId!}
            groupId={groupId}
            tabId={tab.id}
          />
        </div>
      )
    }
    return (
      <div className="editor-content">
        <PlainTextEditor
          content={editorContent}
          onChange={handleEditorChange}
          onSave={handleSave}
          placeholder={`开始写作「${tab.title}」...`}
          tabId={tab.id}
          groupId={groupId}
        />
      </div>
    )
  }

  return null
}

export default TabContentRenderer
