import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { getAppSettings } from './PreferencesPage'

interface SettingEditorProps {
  nodeId: string
  groupId: string
  tabId: string
}

interface SettingData {
  [key: string]: string
}

const FIELD_CONFIG = {
  character: {
    single: ['name', 'gender', 'age'],
    multi: ['background', 'motivation', 'arc', 'appearance', 'personality', 'speech', 'skills', 'notes']
  },
  location: {
    single: [],
    multi: ['locationDescription', 'visual', 'auditory', 'olfactory', 'atmosphere', 'danger', 'notes']
  },
  item: {
    single: ['type', 'quality'],
    multi: ['description', 'stats', 'symbolism']
  },
  default: {
    single: [],
    multi: ['description', 'notes']
  }
}

const CATEGORY_NAME_MAP: Record<string, string> = {
  '人物': 'character',
  '地点': 'location',
  '物品': 'item',
  'character': 'character',
  'location': 'location',
  'item': 'item'
}

const SettingEditor: React.FC<SettingEditorProps> = ({ nodeId, groupId, tabId }) => {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [data, setData] = useState<SettingData>({})
  const [loading, setLoading] = useState(true)
  const [appSettings, setAppSettings] = useState(getAppSettings())
  const [hasLoaded, setHasLoaded] = useState(false)
  
  const currentProject = useProjectStore((s) => s.currentProject)
  const storyNodes = useProjectStore((s) => s.storyNodes)
  const draftsByNodeId = useProjectStore((s) => s.draftsByNodeId)
  const saveNodeContent = useProjectStore((s) => s.saveNodeContent)
  const setDraft = useProjectStore((s) => s.setDraft)
  const clearDraft = useProjectStore((s) => s.clearDraft)
  const setDirtyTab = useEditorStore((s) => s.setDirtyTab)
  const openTabInSplit = useEditorStore((s) => s.openTabInSplit)

  const node = useMemo(() => storyNodes.find(n => n.id === nodeId), [storyNodes, nodeId])
  
  const category = useMemo(() => {
    if (!node) return 'default'
    let current = node
    while (current.parentId) {
      const parent = storyNodes.find(n => n.id === current.parentId)
      if (!parent) break
      current = parent
    }
    const mappedKey = CATEGORY_NAME_MAP[current.name]
    if (mappedKey && FIELD_CONFIG[mappedKey as keyof typeof FIELD_CONFIG]) {
      return mappedKey
    }
    return 'default'
  }, [node, storyNodes])

  const config = FIELD_CONFIG[category as keyof typeof FIELD_CONFIG] || FIELD_CONFIG.default

  const getFieldLabel = (fieldKey: string): string => {
    return t(`setting.field.${fieldKey}`, fieldKey)
  }

  useEffect(() => {
    if (hasLoaded || !currentProject || !nodeId) return
    
    const loadContent = async () => {
      try {
        const draft = draftsByNodeId[nodeId]
        if (typeof draft === 'string') {
          try {
            const draftData = JSON.parse(draft)
            setData(draftData)
            setLoading(false)
            setHasLoaded(true)
            return
          } catch (e) {
            console.error('Failed to parse draft', e)
          }
        }
        
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
        setHasLoaded(true)
      }
    }
    loadContent()
  }, [nodeId, currentProject, draftsByNodeId, hasLoaded])

  useEffect(() => {
    if (!hasLoaded || !currentProject || !nodeId) return
    
    const draft = draftsByNodeId[nodeId]
    if (typeof draft === 'string') {
      return
    }
    
    const reloadContent = async () => {
      try {
        const content = await window.api.readNodeContent(currentProject.projectSettingsPath, nodeId)
        if (content) {
          setData(JSON.parse(content))
        } else {
          setData({})
        }
      } catch (e) {
        console.error('Failed to reload setting content', e)
      }
    }
    reloadContent()
  }, [node?.updatedAt])

  useEffect(() => {
    if (!isEditing) {
      setAppSettings(getAppSettings())
    }
  }, [isEditing])

  const handleSave = async (newData: SettingData) => {
    if (!currentProject || !nodeId) return
    const content = JSON.stringify(newData)
    await saveNodeContent(nodeId, content)
    clearDraft(nodeId)
    setDirtyTab(groupId, tabId, false)
  }

  const handleChange = (field: string, value: string) => {
    const newData = { ...data, [field]: value }
    setData(newData)
    setDraft(nodeId, JSON.stringify(newData))
    setDirtyTab(groupId, tabId, true)
  }

  const openMultiLineEdit = (field: string) => {
    openTabInSplit({
      id: `${nodeId}-${field}`,
      title: `${node?.name} - ${getFieldLabel(field)}`,
      type: 'file',
      nodeId: nodeId,
      kind: 'setting',
      field: field
    }, groupId)
  }

  if (loading) return <div style={{ padding: '20px', color: '#ccc' }}>{t('common.loading')}</div>
  if (!node) return <div style={{ padding: '20px', color: '#ccc' }}>{t('errors.fileNotFound')}</div>

  return (
    <div className="setting-editor wiki-style" style={{ 
      height: '100%', 
      backgroundColor: 'var(--editor-bg, #1e1e1e)',
      color: 'var(--foreground, #ccc)',
      overflowY: 'auto',
      padding: '40px 60px'
    }}>
      <div style={{ margin: '0 auto', position: 'relative' }}>
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'baseline',
          marginBottom: '20px',
          borderBottom: '1px solid #54595d',
          paddingBottom: '5px'
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '32px', 
            fontWeight: 'normal', 
            fontFamily: '"Linux Libertine", "Georgia", "Times", serif',
            color: '#fff'
          }}>
            {node.name}
          </h1>
          <button 
            onClick={() => {
              if (isEditing) {
                handleSave(data)
              }
              setIsEditing(!isEditing)
            }}
            style={{
              padding: '2px 10px',
              backgroundColor: 'transparent',
              color: '#3498db',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
            onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            [ {isEditing ? t('common.save') : t('common.rename')} ]
          </button>
        </header>

        <div style={{ position: 'relative', display: 'block' }}>
           {config.single.length > 0 && (
             <aside className="wiki-infobox" style={{ 
               width: '280px', 
               backgroundColor: '#2a2a2e', 
               border: '1px solid #54595d', 
               padding: '8px',
               fontSize: '13px',
               float: 'right',
               marginLeft: '24px',
               marginBottom: '20px'
             }}>
               <div style={{ 
                 textAlign: 'center', 
                 fontWeight: 'bold', 
                 padding: '8px', 
                 backgroundColor: '#3a3a3e',
                 marginBottom: '8px',
                 border: '1px solid #54595d'
               }}>
                 {node.name}
               </div>
               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                 <tbody>
                   {config.single.map((field: string) => (
                     <tr key={field} style={{ borderBottom: '1px solid #444' }}>
                       <th style={{ 
                         textAlign: 'left', 
                         padding: '6px 4px', 
                         width: '35%', 
                         verticalAlign: 'top',
                         color: '#aaa',
                         fontWeight: 'bold'
                       }}>
                         {getFieldLabel(field)}
                       </th>
                       <td style={{ padding: '6px 4px' }}>
                         {isEditing ? (
                           <input 
                             type="text"
                             value={data[field] || ''}
                             onChange={(e) => handleChange(field, e.target.value)}
                             style={{
                               width: '100%',
                               backgroundColor: '#1e1e1e',
                               border: '1px solid #54595d',
                               color: '#fff',
                               padding: '2px 4px',
                               fontSize: '13px'
                             }}
                           />
                         ) : (
                           <span>{data[field] || <span style={{ color: '#666', fontStyle: 'italic' }}>{t('setting.notFilled')}</span>}</span>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </aside>
           )}
  
            <div className="wiki-content">
              {config.multi.length >= 3 && !isEditing && (
                <nav className="wiki-toc" style={{ 
                  backgroundColor: '#2a2a2e', 
                  border: '1px solid #54595d', 
                  padding: '12px 20px', 
                  marginBottom: '24px',
                  display: 'inline-block',
                  minWidth: '200px'
                }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    textAlign: 'center', 
                    marginBottom: '10px',
                    fontSize: '14px'
                  }}>
                    {t('setting.tableOfContents')}
                  </div>
                  <ul style={{ 
                    listStyle: 'none', 
                    padding: 0, 
                    margin: 0,
                    fontSize: '13px',
                    color: '#3498db'
                  }}>
                    {config.multi.map((field: string, index: number) => (
                      <li key={field} style={{ marginBottom: '4px' }}>
                        <a 
                          href={`#${field}`} 
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(field)?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                          onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          <span style={{ color: '#ccc', marginRight: '8px' }}>{index + 1}</span>
                          {getFieldLabel(field)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
  
              {config.multi.map((field: string) => (
                <section key={field} id={field} style={{ marginBottom: '24px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'baseline',
                    borderBottom: '1px solid #54595d',
                    marginBottom: '12px',
                    paddingBottom: '2px'
                  }}>
                    <h2 style={{ 
                      margin: 0, 
                      fontSize: '22px', 
                      fontWeight: 'normal',
                      fontFamily: '"Linux Libertine", "Georgia", "Times", serif',
                      color: '#fff'
                    }}>
                      {getFieldLabel(field)}
                    </h2>
                    <button 
                      onClick={() => openMultiLineEdit(field)}
                      style={{
                        fontSize: '12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#3498db',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      [ {t('setting.independentEdit')} ]
                    </button>
                  </div>
                  
                  <div style={{ 
                    fontSize: `${appSettings.editorFontSize}px`, 
                    lineHeight: appSettings.editorLineHeight,
                    whiteSpace: 'pre-wrap', 
                    color: data[field] ? '#d1d1d1' : '#666',
                    fontFamily: appSettings.editorFontFamily,
                    border: isEditing ? '1px dashed #444' : 'none',
                    padding: isEditing ? '8px' : '0',
                    backgroundColor: isEditing ? 'rgba(255,255,255,0.02)' : 'transparent'
                  }}>
                    {data[field] || <span style={{ fontStyle: 'italic' }}>{t('setting.noContent')}</span>}
                  </div>
                </section>
              ))}
            </div>
          </div>
      </div>
    </div>
  )
}

export default SettingEditor
