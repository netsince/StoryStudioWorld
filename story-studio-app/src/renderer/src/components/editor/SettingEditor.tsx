import React, { useState, useEffect, useMemo } from 'react'
import { StoryNode } from '../../models'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'

interface SettingEditorProps {
  nodeId: string
  groupId: string
  tabId: string
}

interface SettingData {
  [key: string]: string
}

const FIELD_CONFIG = {
  人物: {
    single: ['角色', '性别', '年龄'],
    multi: ['背景经历', '动机目标', '成长弧线', '外貌描写', '性格特征', '说话风格', '能力技能', '其他备注']
  },
  地点: {
    single: [],
    multi: ['地点描述', '视觉', '听觉', '嗅觉', '氛围', '危险程度', '其他备注']
  },
  物品: {
    single: ['类型', '品质'],
    multi: ['描述', '数值属性', '象征意义']
  },
  default: {
    single: [],
    multi: ['设定描述', '其他备注']
  }
}

const SettingEditor: React.FC<SettingEditorProps> = ({ nodeId, groupId, tabId }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [data, setData] = useState<SettingData>({})
  const [loading, setLoading] = useState(true)
  
  const currentProject = useProjectStore((s) => s.currentProject)
  const storyNodes = useProjectStore((s) => s.storyNodes)
  const saveNodeContent = useProjectStore((s) => s.saveNodeContent)
  const setDirtyTab = useEditorStore((s) => s.setDirtyTab)
  const openTab = useEditorStore((s) => s.openTab)

  const node = useMemo(() => storyNodes.find(n => n.id === nodeId), [storyNodes, nodeId])
  
  const category = useMemo(() => {
    if (!node) return 'default'
    // Find the root parent
    let current = node
    while (current.parentId) {
      const parent = storyNodes.find(n => n.id === current.parentId)
      if (!parent) break
      current = parent
    }
    return (FIELD_CONFIG as any)[current.name] ? current.name : 'default'
  }, [node, storyNodes])

  const config = (FIELD_CONFIG as any)[category] || FIELD_CONFIG.default

  useEffect(() => {
    const loadContent = async () => {
      if (!currentProject || !nodeId) return
      // We don't want to show loading every time it updates in background
      // but for the first load it's fine
      try {
        const content = await window.api.readNodeContent(currentProject.projectSettingsPath, nodeId)
        if (content) {
          setData(JSON.parse(content))
        } else {
          setData({})
        }
      } catch (e) {
        console.error('Failed to load setting content', e)
        setData({})
      } finally {
        setLoading(false)
      }
    }
    loadContent()
  }, [nodeId, currentProject, node?.updatedAt])

  const handleSave = async (newData: SettingData) => {
    if (!currentProject || !nodeId) return
    const content = JSON.stringify(newData)
    await saveNodeContent(nodeId, content)
    setDirtyTab(groupId, tabId, false)
  }

  const handleChange = (field: string, value: string) => {
    const newData = { ...data, [field]: value }
    setData(newData)
    setDirtyTab(groupId, tabId, true)
    // Real-time update for wiki part is handled by state
    // But we should also save it if we want it to be "real-time" across sessions
    // The requirement says "wiki must be real-time updated", which usually means 
    // when you edit in one place, the view updates. Since they are in the same component,
    // state is enough. If we want persistence, we can debounced save.
  }

  const openMultiLineEdit = (field: string) => {
    // Open a new tab for multi-line editing
    openTab({
      id: `${nodeId}-${field}`,
      title: `${node?.name} - ${field}`,
      type: 'file',
      nodeId: nodeId,
      kind: 'setting',
      field: field
    })
  }

  if (loading) return <div style={{ padding: '20px', color: '#ccc' }}>加载中...</div>
  if (!node) return <div style={{ padding: '20px', color: '#ccc' }}>找不到设定节点</div>

  return (
    <div className="setting-editor" style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'var(--editor-bg, #1e1e1e)',
      color: 'var(--foreground, #ccc)',
      overflowY: 'auto',
      padding: '20px'
    }}>
      <div className="setting-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-color, #333)',
        paddingBottom: '10px'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>{node.name}</h2>
        <button 
          onClick={() => {
            if (isEditing) {
              handleSave(data)
            }
            setIsEditing(!isEditing)
          }}
          style={{
            padding: '4px 12px',
            backgroundColor: isEditing ? 'var(--button-primary-bg, #0e639c)' : 'transparent',
            color: '#white',
            border: '1px solid var(--button-primary-bg, #0e639c)',
            borderRadius: '2px',
            cursor: 'pointer'
          }}
        >
          {isEditing ? '完成' : '编辑'}
        </button>
      </div>

      <div className="setting-fields" style={{ display: 'grid', gap: '20px' }}>
        {/* Single line fields */}
        {config.single.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
            {config.single.map((field: string) => (
              <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: '#888' }}>{field}</label>
                {isEditing ? (
                  <input 
                    type="text"
                    value={data[field] || ''}
                    onChange={(e) => handleChange(field, e.target.value)}
                    style={{
                      backgroundColor: '#252526',
                      border: '1px solid #454545',
                      color: '#ccc',
                      padding: '4px 8px',
                      borderRadius: '2px'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '14px', minHeight: '24px' }}>{data[field] || ' (未填写) '}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Multi line fields */}
        {config.multi.map((field: string) => (
          <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', color: '#888' }}>{field}</label>
              {isEditing && (
                <button 
                  onClick={() => openMultiLineEdit(field)}
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    backgroundColor: '#333',
                    border: 'none',
                    color: '#aaa',
                    cursor: 'pointer'
                  }}
                >
                  在新标签页编辑
                </button>
              )}
            </div>
            {isEditing ? (
              <textarea 
                value={data[field] || ''}
                onChange={(e) => handleChange(field, e.target.value)}
                style={{
                  backgroundColor: '#252526',
                  border: '1px solid #454545',
                  color: '#ccc',
                  padding: '8px',
                  borderRadius: '2px',
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            ) : (
              <div style={{ 
                fontSize: '14px', 
                whiteSpace: 'pre-wrap', 
                backgroundColor: '#252526',
                padding: '10px',
                borderRadius: '4px',
                minHeight: '40px',
                color: data[field] ? '#ccc' : '#666'
              }}>
                {data[field] || ' (未填写) '}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default SettingEditor
