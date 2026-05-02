import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { getAppSettings } from './PreferencesPage'
import { buildNodeDisplayPath, getNodeDisplayName } from '../../utils/nodeUtils'
import WikiRefPanel, { type WikiRefItem } from '../WikiRefPanel'
import SettingGallery from './SettingGallery'
import type { StoryNode } from '../../models'
import type { GalleryImageItem } from '../../../../preload/index'

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

const SettingEditor: React.FC<SettingEditorProps> = ({ nodeId, groupId, tabId }) => {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'gallery'>('content')
  const [data, setData] = useState<SettingData>({})
  const [loading, setLoading] = useState(true)
  const [appSettings, setAppSettings] = useState(getAppSettings())
  const [hasLoaded, setHasLoaded] = useState(false)
  const [themeImage, setThemeImage] = useState<GalleryImageItem | null>(null)
  const [refPanelItems, setRefPanelItems] = useState<WikiRefItem[]>([])
  const [refPanelTitle, setRefPanelTitle] = useState('')
  const [refPanelIs404, setRefPanelIs404] = useState(false)
  const [refPanelOpen, setRefPanelOpen] = useState(false)

  const openTab = useEditorStore((s) => s.openTab)
  
  const currentProject = useProjectStore((s) => s.currentProject)
  const storyNodes = useProjectStore((s) => s.storyNodes)
  const draftsByNodeId = useProjectStore((s) => s.draftsByNodeId)
  const saveNodeContent = useProjectStore((s) => s.saveNodeContent)
  const setDraft = useProjectStore((s) => s.setDraft)
  const clearDraft = useProjectStore((s) => s.clearDraft)
  const setDirtyTab = useEditorStore((s) => s.setDirtyTab)
  const openTabInSplit = useEditorStore((s) => s.openTabInSplit)

  // 使用 Map 缓存节点查找，优化性能
  const nodeMap = useMemo(() => {
    const map = new Map<string, StoryNode>()
    storyNodes.forEach(n => map.set(n.id, n))
    return map
  }, [storyNodes])

  const node = useMemo(() => nodeMap.get(nodeId), [nodeMap, nodeId])

  const category = useMemo(() => {
    if (!node) return 'default'
    let current: StoryNode | undefined = node
    while (current?.parentId) {
      const parent = nodeMap.get(current.parentId)
      if (!parent) break
      current = parent
    }
    if (current && FIELD_CONFIG[current.name as keyof typeof FIELD_CONFIG]) {
      return current.name
    }
    return 'default'
  }, [node, nodeMap])

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
    if (!hasLoaded || !nodeId) return
    const draft = draftsByNodeId[nodeId]
    if (typeof draft === 'string') {
      try {
        setData(JSON.parse(draft))
      } catch {
        // ignore parse errors
      }
    }
  }, [nodeId, draftsByNodeId, hasLoaded])

  useEffect(() => {
    if (!isEditing) {
      setAppSettings(getAppSettings())
    }
  }, [isEditing])

  useEffect(() => {
    if (!currentProject || !nodeId) return
    const loadTheme = async () => {
      try {
        const imgs = await window.api.gallery.getImages(currentProject.projectSettingsPath, nodeId)
        const theme = imgs.find((img) => img.isTheme)
        setThemeImage(theme || null)
      } catch {
        setThemeImage(null)
      }
    }
    loadTheme()
  }, [currentProject, nodeId, activeTab])

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

  const resolveWikiRef = useCallback((ref: string): { matched: WikiRefItem[] } => {
    const fileNodes = storyNodes.filter((n) => n.type === 'file')
    const matched: WikiRefItem[] = []

    const buildBothPathParts = (node: StoryNode): string[] => {
      const parts: string[] = []
      let current: StoryNode | undefined = node
      while (current) {
        parts.unshift(current.name)
        current = nodeMap.get(current.parentId || '')
      }
      return parts
    }

    const buildDisplayPathParts = (node: StoryNode): string[] => {
      const parts: string[] = []
      let current: StoryNode | undefined = node
      while (current) {
        parts.unshift(getNodeDisplayName(current, t))
        current = nodeMap.get(current.parentId || '')
      }
      return parts
    }

    if (ref.includes('/')) {
      const parts = ref.split('/').filter(Boolean)
      const leafName = parts[parts.length - 1]
      const candidates = fileNodes.filter((n) => n.name === leafName)
      for (const candidate of candidates) {
        const rawParts = buildBothPathParts(candidate)
        const displayParts = buildDisplayPathParts(candidate)
        let match = true
        for (let i = 0; i < parts.length - 1; i++) {
          const refPart = parts[i]
          const pathIdx = rawParts.length - parts.length + i
          if (pathIdx < 0) { match = false; break }
          if (rawParts[pathIdx] !== refPart && displayParts[pathIdx] !== refPart) {
            match = false
            break
          }
        }
        if (match) {
          matched.push({ node: candidate, path: buildNodeDisplayPath(candidate, storyNodes, t) })
        }
      }
    } else {
      for (const n of fileNodes) {
        if (n.name === ref) {
          matched.push({ node: n, path: buildNodeDisplayPath(n, storyNodes, t) })
        }
      }
    }

    return { matched }
  }, [storyNodes, t, nodeMap])

  const handleRefClick = useCallback((ref: string) => {
    const { matched } = resolveWikiRef(ref)

    if (matched.length === 1) {
      const item = matched[0]
      openTab({
        id: item.node.id,
        title: item.node.name,
        type: 'file',
        nodeId: item.node.id,
        kind: item.node.kind
      })
    } else if (matched.length > 1) {
      setRefPanelItems(matched)
      setRefPanelTitle(t('exportWiki.refDisambiguation', { name: ref }))
      setRefPanelIs404(false)
      setRefPanelOpen(true)
    } else {
      setRefPanelItems([])
      setRefPanelTitle(t('exportWiki.refNotFoundTitle', { name: ref }))
      setRefPanelIs404(true)
      setRefPanelOpen(true)
    }
  }, [resolveWikiRef, openTab, t])

  const handleRefPanelSelect = useCallback((item: WikiRefItem) => {
    openTab({
      id: item.node.id,
      title: item.node.name,
      type: 'file',
      nodeId: item.node.id,
      kind: item.node.kind
    })
    setRefPanelOpen(false)
  }, [openTab])

  const renderContentWithRefs = useCallback((text: string): React.ReactNode => {
    if (!text) return null
    const parts: React.ReactNode[] = []
    const regex = /@\(([^)]+)\)/g
    let lastIndex = 0
    let match: RegExpExecArray | null
    let keyIndex = 0

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      const refName = match[1]
      const { matched } = resolveWikiRef(refName)
      const isRed = matched.length === 0
      parts.push(
        <a
          key={`ref-${keyIndex++}`}
          onClick={(e) => {
            e.preventDefault()
            handleRefClick(refName)
          }}
          style={{
            color: isRed ? '#e74c3c' : '#3498db',
            cursor: 'pointer',
            textDecoration: 'none',
            borderBottom: isRed ? '1px dashed #e74c3c' : 'none'
          }}
          onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseOut={(e) => (e.currentTarget.style.textDecoration = isRed ? 'none' : 'none')}
        >
          {refName}
        </a>
      )
      lastIndex = regex.lastIndex
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts
  }, [resolveWikiRef, handleRefClick])

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

        <div className="wiki-tabs">
          <button
            className={`wiki-tab ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            {t('gallery.tabContent')}
          </button>
          <button
            className={`wiki-tab ${activeTab === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            {t('gallery.tabGallery')}
          </button>
        </div>

        {activeTab === 'gallery' ? (
          <SettingGallery nodeId={nodeId} />
        ) : (
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
               {themeImage && themeImage.dataUrl && (
                 <div style={{ marginBottom: '8px' }}>
                   <img
                     src={themeImage.dataUrl}
                     alt={themeImage.caption || node.name}
                     style={{ width: '100%', display: 'block', borderRadius: '2px' }}
                   />
                   {themeImage.caption && (
                     <div style={{ fontSize: '11px', color: '#888', textAlign: 'center', padding: '4px 0' }}>
                       {themeImage.caption}
                     </div>
                   )}
                 </div>
               )}
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
                    {isEditing
                      ? (data[field] || <span style={{ fontStyle: 'italic' }}>{t('setting.noContent')}</span>)
                      : (data[field] ? renderContentWithRefs(data[field]) : <span style={{ fontStyle: 'italic' }}>{t('setting.noContent')}</span>)
                    }
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
      {refPanelOpen && (
        <WikiRefPanel
          items={refPanelItems}
          title={refPanelTitle}
          is404={refPanelIs404}
          onSelect={handleRefPanelSelect}
          onClose={() => setRefPanelOpen(false)}
        />
      )}
    </div>
  )
}

export default SettingEditor
