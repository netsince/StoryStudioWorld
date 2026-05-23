import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import PlainTextEditor from '../MonacoEditor'

interface SettingFieldEditorProps {
  nodeId: string
  field: string
  groupId: string
  tabId: string
}

interface SettingData {
  metadata: {
    [key: string]: string
  }
  content: string
}

const SettingFieldEditor: React.FC<SettingFieldEditorProps> = ({
  nodeId,
  field,
  groupId,
  tabId
}) => {
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const [fullData, setFullData] = useState<SettingData>({ metadata: {}, content: '' })
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)

  const currentProject = useProjectStore((s) => s.currentProject)
  const draftsByNodeId = useProjectStore((s) => s.draftsByNodeId)
  const saveNodeContent = useProjectStore((s) => s.saveNodeContent)
  const setDraft = useProjectStore((s) => s.setDraft)
  const clearDraft = useProjectStore((s) => s.clearDraft)
  const setDirtyTab = useEditorStore((s) => s.setDirtyTab)

  const node = useProjectStore(
    useCallback((s) => s.storyNodes.find((n) => n.id === nodeId), [nodeId])
  )

  useEffect(() => {
    if (hasLoaded || !currentProject || !nodeId) return

    const loadData = async () => {
      try {
        const draft = draftsByNodeId[nodeId]
        if (typeof draft === 'string') {
          try {
            const draftData = JSON.parse(draft)
            setFullData(draftData)
            if (field === 'content') {
              setContent(draftData.content || '')
            } else {
              setContent(draftData.metadata?.[field] || '')
            }
            setLoading(false)
            setHasLoaded(true)
            return
          } catch (e) {
            console.error('Failed to parse draft', e)
          }
        }

        const jsonContent = await window.api.readNodeContent(
          currentProject.projectSettingsPath,
          nodeId
        )
        if (jsonContent) {
          const parsed = JSON.parse(jsonContent)
          let data: SettingData

          if (parsed.metadata && parsed.content !== undefined) {
            data = parsed
          } else {
            data = {
              metadata: {},
              content: ''
            }
            for (const [key, value] of Object.entries(parsed)) {
              if (key === 'content') {
                data.content = value as string
              } else {
                data.metadata[key] = value as string
              }
            }
          }

          setFullData(data)
          if (field === 'content') {
            setContent(data.content || '')
          } else {
            setContent(data.metadata?.[field] || '')
          }
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
        const jsonContent = await window.api.readNodeContent(
          currentProject.projectSettingsPath,
          nodeId
        )
        if (jsonContent) {
          const parsed = JSON.parse(jsonContent)
          let data: SettingData

          if (parsed.metadata && parsed.content !== undefined) {
            data = parsed
          } else {
            data = {
              metadata: {},
              content: ''
            }
            for (const [key, value] of Object.entries(parsed)) {
              if (key === 'content') {
                data.content = value as string
              } else {
                data.metadata[key] = value as string
              }
            }
          }

          setFullData(data)
          if (field === 'content') {
            setContent(data.content || '')
          } else {
            setContent(data.metadata?.[field] || '')
          }
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
      const newData: SettingData = { ...fullData }
      if (field === 'content') {
        newData.content = content
      } else {
        newData.metadata = { ...fullData.metadata, [field]: content }
      }
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
    const newData: SettingData = { ...fullData }
    if (field === 'content') {
      newData.content = newContent
    } else {
      newData.metadata = { ...fullData.metadata, [field]: newContent }
    }
    setDraft(nodeId, JSON.stringify(newData))
    setDirtyTab(groupId, tabId, true)
  }

  if (loading) return <div style={{ padding: '20px', color: '#ccc' }}>{t('common.loading')}</div>

  return (
    <div
      className="setting-field-editor"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--editor-bg, #1e1e1e)'
      }}
    >
      <PlainTextEditor
        content={content}
        onChange={handleChange}
        onSave={handleSave}
        placeholder={t('setting.placeholder', {
          field: field === 'content' ? t('setting.content') : field
        })}
        tabId={tabId}
        groupId={groupId}
      />
    </div>
  )
}

export default SettingFieldEditor
