import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import PlainTextEditor from '../PlainTextEditor'

interface SettingFieldEditorProps {
  nodeId: string
  field: string
  groupId: string
  tabId: string
}

const SettingFieldEditor: React.FC<SettingFieldEditorProps> = ({ nodeId, field, groupId, tabId }) => {
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const [fullData, setFullData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)

  const currentProject = useProjectStore((s) => s.currentProject)
  const draftsByNodeId = useProjectStore((s) => s.draftsByNodeId)
  const saveNodeContent = useProjectStore((s) => s.saveNodeContent)
  const setDraft = useProjectStore((s) => s.setDraft)
  const clearDraft = useProjectStore((s) => s.clearDraft)
  const setDirtyTab = useEditorStore((s) => s.setDirtyTab)

  const node = useProjectStore(useCallback((s) => s.storyNodes.find(n => n.id === nodeId), [nodeId]))

  const getFieldLabel = (fieldKey: string): string => {
    return t(`setting.field.${fieldKey}`, fieldKey)
  }

  useEffect(() => {
    if (hasLoaded || !currentProject || !nodeId) return
    
    const loadData = async () => {
      try {
        const draft = draftsByNodeId[nodeId]
        if (typeof draft === 'string') {
          try {
            const draftData = JSON.parse(draft)
            setFullData(draftData)
            setContent(draftData[field] || '')
            setLoading(false)
            setHasLoaded(true)
            return
          } catch (e) {
            console.error('Failed to parse draft', e)
          }
        }
        
        const jsonContent = await window.api.readNodeContent(currentProject.projectSettingsPath, nodeId)
        if (jsonContent) {
          const data = JSON.parse(jsonContent)
          setFullData(data)
          setContent(data[field] || '')
        }
      } catch (e) {
        console.error('Failed to load field content', e)
      } finally {
        setLoading(false)
        setHasLoaded(true)
      }
    }
    loadData()
  }, [nodeId, field, currentProject, draftsByNodeId, hasLoaded])

  useEffect(() => {
    if (!hasLoaded || !currentProject || !nodeId) return
    
    const draft = draftsByNodeId[nodeId]
    if (typeof draft === 'string') {
      return
    }
    
    const reloadContent = async () => {
      try {
        const jsonContent = await window.api.readNodeContent(currentProject.projectSettingsPath, nodeId)
        if (jsonContent) {
          const data = JSON.parse(jsonContent)
          setFullData(data)
          setContent(data[field] || '')
        }
      } catch (e) {
        console.error('Failed to reload field content', e)
      }
    }
    reloadContent()
  }, [node?.updatedAt, field, nodeId, currentProject, draftsByNodeId, hasLoaded])

  const handleSave = async () => {
    if (!currentProject || !nodeId) return
    try {
      const newData = { ...fullData, [field]: content }
      const jsonString = JSON.stringify(newData)
      await saveNodeContent(nodeId, jsonString)
      setFullData(newData)
      clearDraft(nodeId)
      setDirtyTab(groupId, tabId, false)
    } catch (e) {
      console.error('Failed to save field content', e)
    }
  }

  const handleChange = (newContent: string) => {
    setContent(newContent)
    const newData = { ...fullData, [field]: newContent }
    setDraft(nodeId, JSON.stringify(newData))
    setDirtyTab(groupId, tabId, true)
  }

  if (loading) return <div style={{ padding: '20px', color: '#ccc' }}>{t('common.loading')}</div>

  return (
    <div className="setting-field-editor" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--editor-bg, #1e1e1e)'
    }}>
      <PlainTextEditor
        content={content}
        onChange={handleChange}
        onSave={handleSave}
        placeholder={t('setting.placeholder', { field: getFieldLabel(field) })}
        tabId={tabId}
        groupId={groupId}
      />
    </div>
  )
}

export default SettingFieldEditor
