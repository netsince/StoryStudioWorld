import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import type { StoryNode } from '../models'
import { useProjectStore } from '../stores/projectStore'
import { useEditorStore } from '../stores/editorStore'
import { buildNodeDisplayPath } from '../utils/nodeUtils'
import { commandService, Commands } from '../services/commandService'
import VseInputBox, { InputBoxRef } from './VseInputBox'

interface SearchResult {
  node: StoryNode
  path: string
  matchType: 'name' | 'content'
  contentPreview?: string
  matchIndex?: number
}

const QuickOpen: React.FC = () => {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<InputBoxRef>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const currentProject = useProjectStore((s) => s.currentProject)
  const storyNodes = useProjectStore((s) => s.storyNodes)
  const openTab = useEditorStore((s) => s.openTab)

  // 获取所有文件节点
  const fileNodes = useMemo(() => {
    return storyNodes.filter((n) => n.type === 'file')
  }, [storyNodes])

  // 搜索内容
  const searchContent = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      if (!currentProject || !query.trim()) return []

      const lowerQuery = query.toLowerCase()
      const searchResults: SearchResult[] = []

      // 搜索文件名
      for (const node of fileNodes) {
        if (node.name.toLowerCase().includes(lowerQuery)) {
          searchResults.push({
            node,
            path: buildNodeDisplayPath(node, storyNodes, t),
            matchType: 'name'
          })
        }
      }

      // 搜索内容
      for (const node of fileNodes) {
        if (searchResults.some((r) => r.node.id === node.id)) continue

        try {
          const content = await window.api.readNodeContent(
            currentProject.projectSettingsPath,
            node.id
          )
          if (content) {
            const lowerContent = content.toLowerCase()
            const index = lowerContent.indexOf(lowerQuery)
            if (index !== -1) {
              const start = Math.max(0, index - 25)
              const end = Math.min(content.length, index + query.length + 25)
              const preview = content.substring(start, end)

              searchResults.push({
                node,
                path: buildNodeDisplayPath(node, storyNodes, t),
                matchType: 'content',
                contentPreview:
                  (start > 0 ? '...' : '') + preview + (end < content.length ? '...' : ''),
                matchIndex: index
              })
            }
          }
        } catch (error) {
          console.error(`Failed to read content for node ${node.id}:`, error)
        }
      }

      return searchResults
    },
    [currentProject, fileNodes, storyNodes, t]
  )

  // 执行搜索
  useEffect(() => {
    if (!isVisible || !searchText.trim()) {
      setResults([])
      setSelectedIndex(0)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const searchResults = await searchContent(searchText)
        setResults(searchResults)
        setSelectedIndex(0)
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [searchText, isVisible, searchContent])

  // 监听 Ctrl+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        setIsVisible((prev) => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 注册快速打开命令
  useEffect(() => {
    const unregister = commandService.registerCommand(Commands.QUICK_OPEN, () => {
      setIsVisible(true)
    })
    return () => unregister()
  }, [])

  // 聚焦输入框
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 10)
    }
  }, [isVisible])

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      switch (e.key) {
        case 'Escape':
          setIsVisible(false)
          setSearchText('')
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : prev))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
          break
        case 'Enter':
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex])
          }
          break
      }
    },
    [results, selectedIndex]
  )

  // 选择结果
  const handleSelect = useCallback(
    (result: SearchResult): void => {
      openTab({
        id: result.node.id,
        title: result.node.name,
        type: 'file',
        nodeId: result.node.id,
        kind: result.node.kind
      })
      setIsVisible(false)
      setSearchText('')
      setResults([])
    },
    [openTab]
  )

  // 滚动选中项到视图
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex, results.length])

  if (!isVisible) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 999999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '80px'
      }}
      onClick={() => {
        setIsVisible(false)
        setSearchText('')
      }}
    >
      <div
        style={{
          width: '700px',
          maxWidth: '95vw',
          backgroundColor: 'var(--panel-bg, #252526)',
          borderRadius: '4px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索输入框 */}
        <div
          onKeyDown={handleKeyDown}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-color, #454545)',
            flexShrink: 0
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginRight: '8px', color: 'var(--foreground-muted, #858585)', flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <VseInputBox
            ref={inputRef}
            value={searchText}
            onChange={(value) => setSearchText(value)}
            placeholder={t('quickOpen.placeholder', '搜索文件、设定或内容... (Ctrl+P)')}
            autoFocus
            style={{
              flex: 1,
              minWidth: 0
            }}
          />
          {isSearching && (
            <div
              style={{
                width: '14px',
                height: '14px',
                border: '2px solid var(--border-color, #454545)',
                borderTopColor: 'var(--accent-color, #007acc)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                flexShrink: 0
              }}
            />
          )}
        </div>

        {/* 搜索结果 */}
        <div
          ref={resultsRef}
          style={{
            overflow: 'auto',
            flex: 1,
            minHeight: 0
          }}
        >
          {results.length === 0 && searchText.trim() && !isSearching && (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                color: 'var(--foreground-muted, #858585)',
                fontSize: '12px'
              }}
            >
              {t('quickOpen.noResults', '未找到匹配的结果')}
            </div>
          )}

          {results.length === 0 && !searchText.trim() && (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                color: 'var(--foreground-muted, #858585)',
                fontSize: '12px'
              }}
            >
              {t('quickOpen.typeToSearch', '输入关键词搜索文件、设定或内容')}
            </div>
          )}

          {results.map((result, index) => (
            <div
              key={`${result.node.id}-${result.matchType}`}
              onClick={() => handleSelect(result)}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                backgroundColor:
                  index === selectedIndex
                    ? 'var(--list-active-selection-bg, #04395e)'
                    : 'transparent',
                color:
                  index === selectedIndex
                    ? 'var(--list-active-selection-fg, #fff)'
                    : 'var(--foreground, #ccc)',
                borderBottom: '1px solid var(--border-subtle, #2a2a2a)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {/* 文件类型图标 */}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                {result.node.kind === 'setting' ? (
                  <path
                    d="M8 1l2.5 5 5.5 1-4 4 1 5.5L8 13l-5 3.5 1-5.5-4-4 5.5-1L8 1z"
                    fill="#DCAD5A"
                  />
                ) : (
                  <path
                    d="M3.5 1h5.79l3.21 3.21V14.5a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 3.5 1z"
                    fill="#75BEFF"
                    fillOpacity="0.6"
                  />
                )}
              </svg>

              {/* 主信息区 */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1px'
                }}
              >
                {/* 第一行：名称和标签 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {highlightMatch(result.node.name, searchText)}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 4px',
                      borderRadius: '2px',
                      backgroundColor:
                        result.matchType === 'name'
                          ? 'var(--badge-bg, #007acc)'
                          : 'var(--badge-secondary-bg, #4a4a4a)',
                      color: '#fff',
                      flexShrink: 0
                    }}
                  >
                    {result.matchType === 'name'
                      ? t('quickOpen.nameMatch', '文件名')
                      : t('quickOpen.contentMatch', '内容')}
                  </span>
                </div>

                {/* 第二行：路径 */}
                <div
                  style={{
                    fontSize: '11px',
                    color:
                      index === selectedIndex
                        ? 'var(--list-active-selection-fg-muted, #b0b0b0)'
                        : 'var(--foreground-muted, #858585)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {result.path}
                </div>

                {/* 第三行：内容预览（仅内容匹配时显示） */}
                {result.contentPreview && (
                  <div
                    style={{
                      fontSize: '11px',
                      color:
                        index === selectedIndex
                          ? 'var(--list-active-selection-fg-muted, #b0b0b0)'
                          : 'var(--foreground-muted, #858585)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontStyle: 'italic'
                    }}
                  >
                    {highlightMatch(result.contentPreview, searchText)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        <div
          style={{
            padding: '6px 12px',
            backgroundColor: 'var(--panel-bg-secondary, #1e1e1e)',
            borderTop: '1px solid var(--border-color, #454545)',
            display: 'flex',
            gap: '12px',
            fontSize: '11px',
            color: 'var(--foreground-muted, #858585)',
            flexShrink: 0
          }}
        >
          <span>↑↓ {t('quickOpen.navigate', '导航')}</span>
          <span>↵ {t('quickOpen.open', '打开')}</span>
          <span>Esc {t('quickOpen.close', '关闭')}</span>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>,
    document.body
  )
}

// 高亮匹配文本
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text

  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'))
  return parts.map((part, index) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return (
        <mark
          key={index}
          style={{
            backgroundColor: 'var(--highlight-bg, rgba(255, 215, 0, 0.3))',
            color: 'inherit',
            padding: 0,
            borderRadius: '1px'
          }}
        >
          {part}
        </mark>
      )
    }
    return part
  })
}

// 转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default QuickOpen
