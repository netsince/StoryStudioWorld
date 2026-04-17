import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useStatusbar, StatusbarAlignment, type IStatusbarEntryAccessor } from '../contexts/StatusbarContext'
import ContextMenu, { type ContextMenuItem } from './ContextMenu'

interface PlainTextEditorProps {
  content: string
  onChange: (content: string) => void
  onSave?: () => void
  placeholder?: string
}

// 全语言支持的字数统计
function countTextStats(text: string): { chars: number; words: number; readingTime: number } {
  const trimmedText = text.trim()

  // 字符数：使用 Intl.Segmenter 支持所有语言（包括中文、日文、韩文等）
  let chars = 0
  let words = 0

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    // 使用现代 Intl.Segmenter API
    const graphemeSegmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' })
    const wordSegmenter = new Intl.Segmenter('zh', { granularity: 'word' })

    // 统计字符数（包括标点、空格等）
    const graphemes = Array.from(graphemeSegmenter.segment(trimmedText))
    chars = graphemes.length

    // 统计词数（对于中文，每个字算一个词；对于英文，按空格分隔）
    const wordSegments = Array.from(wordSegmenter.segment(trimmedText))
    words = wordSegments.filter(s => s.isWordLike).length
  } else {
    // 降级方案
    chars = trimmedText.length

    // 检测是否主要是中文/日文/韩文
    const cjkPattern = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/
    const isMainlyCJK = cjkPattern.test(trimmedText)

    if (isMainlyCJK) {
      // CJK 语言：字符数约等于词数
      words = trimmedText.split(/\s+/).filter(s => s.length > 0).reduce((acc, segment) => {
        // 计算每个 segment 中的 CJK 字符数 + 英文单词数
        const cjkChars = (segment.match(cjkPattern) || []).length
        const englishWords = segment.split(/[^\w\u4e00-\u9fa5]+/).filter(s => /^[a-zA-Z]+$/.test(s)).length
        return acc + cjkChars + englishWords
      }, 0)
    } else {
      // 其他语言：按空格分隔
      words = trimmedText.split(/\s+/).filter(s => s.length > 0).length
    }
  }

  // 阅读时间估算（假设中文阅读速度 300字/分钟，英文 200词/分钟）
  const readingTime = Math.max(1, Math.ceil(words / 300 * 60))

  return { chars, words, readingTime }
}

const PlainTextEditor: React.FC<PlainTextEditorProps> = ({
  content,
  onChange,
  onSave,
  placeholder = '开始写作...'
}) => {
  const [text, setText] = useState(content || '')
  const { addEntry } = useStatusbar()
  const charCountAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const wordCountAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const readingTimeAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  // 历史记录用于撤销/重做
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef<number>(-1)
  const isUndoingRef = useRef(false)
  const isInitializedRef = useRef(false)

  // 从 props 同步 content（仅在非撤销操作时）
  useEffect(() => {
    if (content !== text && !isUndoingRef.current) {
      setText(content || '')
    }
  }, [content, text])

  // 保存历史记录
  const saveHistory = useCallback((newText: string) => {
    if (isUndoingRef.current) return
    
    // 如果新文本与当前历史记录相同，不保存
    if (historyRef.current[historyIndexRef.current] === newText) return
    
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push(newText)
    historyIndexRef.current = historyRef.current.length - 1
    
    // 限制历史记录数量
    if (historyRef.current.length > 50) {
      historyRef.current.shift()
      historyIndexRef.current--
    }
  }, [])

  // 初始化历史记录（仅执行一次）
  useEffect(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true
    
    const initialContent = content || ''
    historyRef.current = [initialContent]
    historyIndexRef.current = 0
    setText(initialContent)
  }, [content])

  // Register status bar entries on mount
  useEffect(() => {
    charCountAccessorRef.current = addEntry(
      'editor-char-count',
      {
        name: '字符数',
        text: '字符: 0',
        ariaLabel: '字符统计'
      },
      StatusbarAlignment.RIGHT,
      100
    )

    wordCountAccessorRef.current = addEntry(
      'editor-word-count',
      {
        name: '字数',
        text: '字数: 0',
        ariaLabel: '字数统计'
      },
      StatusbarAlignment.RIGHT,
      90
    )

    readingTimeAccessorRef.current = addEntry(
      'editor-reading-time',
      {
        name: '阅读时间',
        text: '阅读: <1分钟',
        ariaLabel: '预计阅读时间'
      },
      StatusbarAlignment.RIGHT,
      80
    )

    return () => {
      charCountAccessorRef.current?.dispose()
      wordCountAccessorRef.current?.dispose()
      readingTimeAccessorRef.current?.dispose()
    }
  }, [addEntry])

  // Update status bar when text changes
  useEffect(() => {
    const { chars, words, readingTime } = countTextStats(text)

    charCountAccessorRef.current?.update({ text: `字符: ${chars.toLocaleString()}` })
    wordCountAccessorRef.current?.update({ text: `字数: ${words.toLocaleString()}` })

    const timeText = readingTime < 60
      ? `阅读: <1分钟`
      : `阅读: ${Math.ceil(readingTime / 60)}分钟`
    readingTimeAccessorRef.current?.update({ text: timeText })
  }, [text])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const newText = e.target.value
    setText(newText)
    onChange(newText)
    saveHistory(newText)
  }

  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoingRef.current = true
      historyIndexRef.current--
      const prevText = historyRef.current[historyIndexRef.current]
      setText(prevText)
      onChange(prevText)
      
      // 恢复光标位置
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
        isUndoingRef.current = false
      })
    }
  }, [onChange])

  // 重做
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoingRef.current = true
      historyIndexRef.current++
      const nextText = historyRef.current[historyIndexRef.current]
      setText(nextText)
      onChange(nextText)
      
      // 恢复光标位置
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
        isUndoingRef.current = false
      })
    }
  }, [onChange])

  // 全选
  const handleSelectAll = useCallback(() => {
    textareaRef.current?.select()
  }, [])

  // 复制
  const handleCopy = useCallback(async () => {
    const textarea = textareaRef.current
    if (!textarea) return
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
    if (selectedText) {
      await navigator.clipboard.writeText(selectedText)
    }
  }, [])

  // 剪切
  const handleCut = useCallback(async () => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    if (selectedText) {
      await navigator.clipboard.writeText(selectedText)
      const newText = textarea.value.substring(0, start) + textarea.value.substring(end)
      setText(newText)
      onChange(newText)
      saveHistory(newText)
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start
      })
    }
  }, [onChange, saveHistory])

  // 粘贴
  const handlePaste = useCallback(async () => {
    const textarea = textareaRef.current
    if (!textarea) return
    try {
      const clipboardText = await navigator.clipboard.readText()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newText = textarea.value.substring(0, start) + clipboardText + textarea.value.substring(end)
      setText(newText)
      onChange(newText)
      saveHistory(newText)
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + clipboardText.length
      })
    } catch {
      // 剪贴板访问失败
    }
  }, [onChange, saveHistory])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    // Ctrl+S 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      if (onSave) {
        onSave()
      }
      return
    }

    // Ctrl+Z 撤销
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      handleUndo()
      return
    }

    // Ctrl+Y 或 Ctrl+Shift+Z 重做
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      handleRedo()
      return
    }

    // Ctrl+A 全选（浏览器默认支持，但阻止冒泡）
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.stopPropagation()
      return
    }

    // Tab 插入/删除制表符
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value

      // 找到选中的起始行和结束行
      const lines = value.split('\n')
      let currentPos = 0
      let startLine = 0
      let endLine = 0

      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + (i < lines.length - 1 ? 1 : 0) // +1 for \n except last line
        if (currentPos <= start && start < currentPos + lineLength) {
          startLine = i
        }
        if (currentPos <= end && end <= currentPos + lineLength) {
          endLine = i
          break
        }
        currentPos += lineLength
      }

      if (start === end) {
        // 单行模式：插入制表符
        const newText = value.substring(0, start) + '\t' + value.substring(end)
        setText(newText)
        onChange(newText)
        saveHistory(newText)
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1
        })
      } else {
        // 多行模式：增加或删除缩进
        const isUnindent = e.shiftKey
        let newSelectionStart = start
        let newSelectionEnd = end

        for (let i = startLine; i <= endLine; i++) {
          if (isUnindent) {
            // Shift+Tab: 删除行首的制表符或空格
            if (lines[i].startsWith('\t')) {
              lines[i] = lines[i].substring(1)
              if (i === startLine) newSelectionStart -= 1
              newSelectionEnd -= 1
            } else if (lines[i].startsWith('  ')) {
              lines[i] = lines[i].substring(2)
              if (i === startLine) newSelectionStart -= 2
              newSelectionEnd -= 2
            } else if (lines[i].startsWith(' ')) {
              lines[i] = lines[i].substring(1)
              if (i === startLine) newSelectionStart -= 1
              newSelectionEnd -= 1
            }
          } else {
            // Tab: 添加制表符
            lines[i] = '\t' + lines[i]
            if (i === startLine) newSelectionStart += 1
            newSelectionEnd += 1
          }
        }

        const newText = lines.join('\n')
        setText(newText)
        onChange(newText)
        saveHistory(newText)
        requestAnimationFrame(() => {
          textarea.selectionStart = newSelectionStart
          textarea.selectionEnd = newSelectionEnd
        })
      }
    }
  }

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleCloseContextMenu = () => {
    setContextMenu(null)
  }

  const contextMenuItems: ContextMenuItem[] = [
    {
      key: 'undo',
      label: '撤销 (Ctrl+Z)',
      onSelect: handleUndo
    },
    {
      key: 'redo',
      label: '重做 (Ctrl+Y)',
      onSelect: handleRedo
    },
    {
      key: 'separator1',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'cut',
      label: '剪切 (Ctrl+X)',
      onSelect: handleCut
    },
    {
      key: 'copy',
      label: '复制 (Ctrl+C)',
      onSelect: handleCopy
    },
    {
      key: 'paste',
      label: '粘贴 (Ctrl+V)',
      onSelect: handlePaste
    },
    {
      key: 'selectAll',
      label: '全选 (Ctrl+A)',
      onSelect: handleSelectAll
    }
  ]

  return (
    <div className="plain-text-editor">
      <textarea
        ref={textareaRef}
        className="plain-text-editor-textarea"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        placeholder={placeholder}
        spellCheck={false}
        autoFocus
      />
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  )
}

export default PlainTextEditor
