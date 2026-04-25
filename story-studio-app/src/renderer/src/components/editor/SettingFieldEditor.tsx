import React, { useState, useEffect, useCallback } from 'react'
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
  const [content, setContent] = useState('')
  const [fullData, setFullData] = useState<any>({})
  const [loading, setLoading] = useState(true)

  const currentProject = useProjectStore((s) => s.currentProject)
  const saveNodeContent = useProjectStore((s) => s.saveNodeContent)
  const setDirtyTab = useEditorStore((s) => s.setDirtyTab)

  const node = useProjectStore(useCallback((s) => s.storyNodes.find(n => n.id === nodeId), [nodeId]))

  useEffect(() => {
    const loadData = async () => {
      if (!currentProject || !nodeId) return
      try {
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
      }
    }
    loadData()
  }, [nodeId, field, currentProject, node?.updatedAt])

  const handleSave = async () => {
    if (!currentProject || !nodeId) return
    // Always fetch latest data before saving to avoid overwriting other fields
    try {
      const jsonContent = await window.api.readNodeContent(currentProject.projectSettingsPath, nodeId)
      const latestData = jsonContent ? JSON.parse(jsonContent) : {}
      const newData = { ...latestData, [field]: content }
      const jsonString = JSON.stringify(newData)
      await saveNodeContent(nodeId, jsonString)
      setFullData(newData)
      setDirtyTab(groupId, tabId, false)
    } catch (e) {
      console.error('Failed to save field content', e)
    }
  }

  const handleChange = (newContent: string) => {
    setContent(newContent)
    setDirtyTab(groupId, tabId, true)
  }

  if (loading) return <div style={{ padding: '20px', color: '#ccc' }}>加载中...</div>

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
        placeholder={`请输入 ${field} 的内容...`}
        tabId={tabId}
        groupId={groupId}
      />
    </div>
  )
}

export default SettingFieldEditor
