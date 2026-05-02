import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { Tab, ProjectData } from '../../models'
import { useProjectStore } from '../../stores/projectStore'
import { triggerContentChange, triggerTabChange } from '../../services/pluginService'
import ArchiveView from './ArchiveView'
import PlainTextEditor from '../PlainTextEditor'
import SettingEditor from './SettingEditor'
import SettingFieldEditor from './SettingFieldEditor'
import CreateProjectForm, { CreateProjectInput } from './CreateProjectForm'
import WelcomePage from './WelcomePage'
import AboutPage from './AboutPage'
import PreferencesPage from './PreferencesPage'
import ReadingOrderPanel from '../ReadingOrderPanel'
import ExportStoryPanel from '../ExportStoryPanel'

interface TabContentRendererProps {
  tab: Tab
  isActive: boolean
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
  isActive,
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
  const { t } = useTranslation()
  const [editorContent, setEditorContent] = useState<string>(() => {
    if (tab.type === 'file' && tab.nodeId) {
      const draft = useProjectStore.getState().draftsByNodeId[tab.nodeId]
      if (typeof draft === 'string') {
        return draft
      }
    }
    return ''
  })

  useEffect(() => {
    const loadContent = async (): Promise<void> => {
      if (tab.type === 'file' && tab.nodeId && currentProject) {
        const draft = useProjectStore.getState().draftsByNodeId[tab.nodeId]
        if (typeof draft === 'string') {
          setEditorContent(draft)
          triggerTabChange(tab)
          return
        }

        const content = await window.api.readNodeContent(
          currentProject.projectSettingsPath,
          tab.nodeId
        )
        setEditorContent(content || '')
        triggerTabChange(tab)
      }
    }
    void loadContent()
  }, [tab.id, tab.nodeId, tab.type, currentProject])

  const handleEditorChange = useCallback((content: string): void => {
    setEditorContent(content)
    triggerContentChange(content)
    if (tab.type === 'file') {
      setDirtyTab(groupId, tab.id, true)
      if (tab.nodeId) {
        setDraft(tab.nodeId, content)
      }
    }
  }, [tab.type, tab.id, tab.nodeId, groupId, setDirtyTab, setDraft])

  const handleSave = useCallback(async (): Promise<void> => {
    if (tab.type === 'file' && tab.nodeId && currentProject) {
      await saveNodeContent(tab.nodeId, editorContent)
      setDirtyTab(groupId, tab.id, false)
      clearDraft(tab.nodeId)
    }
  }, [tab.type, tab.nodeId, currentProject, editorContent, saveNodeContent, setDirtyTab, groupId, tab.id, clearDraft])

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

  if (tab.type === 'reading-order') {
    return <ReadingOrderPanel />
  }

  if (tab.type === 'export-story') {
    return <ExportStoryPanel />
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
          isActive={isActive}
          onChange={handleEditorChange}
          onSave={handleSave}
          placeholder={t('editor.startWriting', { title: tab.title })}
          tabId={tab.id}
          groupId={groupId}
        />
      </div>
    )
  }

  return null
}

export default TabContentRenderer
