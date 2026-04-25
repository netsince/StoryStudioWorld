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
  const [hasLoaded, setHasLoaded] = useState(false)

  const currentProject = useProjectStore((s) => s.currentProject)
  const draftsByNodeId = useProjectStore((s) => s.draftsByNodeId)
  const saveNodeContent = useProjectStore((s) => s.saveNodeContent)
  const setDraft = useProjectStore((s) => s.setDraft)
  const clearDraft = useProjectStore((s) => s.clearDraft)
  const setDirtyTab = useEditorStore((s) => s.setDirtyTab)

  const node = useProjectStore(useCallback((s) => s.storyNodes.find(n => n.id === nodeId), [nodeId]))

  // 只加载一次内容，优先使用内存草稿
  useEffect(() => {
    if (hasLoaded || !currentProject || !nodeId) return
    
    const loadData = async () => {
      try {
        // 1. 优先检查草稿箱
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
        
        // 2. 没有草稿才从磁盘读取
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

  // 当 node.updatedAt 变化（即外部保存），且我们没有未保存的修改时，重新加载
  useEffect(() => {
    if (!hasLoaded || !currentProject || !nodeId) return
    
    const draft = draftsByNodeId[nodeId]
    if (typeof draft === 'string') {
      // 有草稿，不重新加载
      return
    }
    
    // 没有草稿，从磁盘重新加载
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
    // 不再读取磁盘，而是使用内存中的 fullData 和当前 content
    // 这样可以避免覆盖其他字段的并发修改
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
    // 保存草稿到内存，保持所有字段的完整性
    const newData = { ...fullData, [field]: newContent }
    setDraft(nodeId, JSON.stringify(newData))
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
