import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
import ContextMenu, { type ContextMenuItem } from './ContextMenu'
import FindReplaceWidget, { type MatchRange } from './FindReplaceWidget'
import ChinesePunctuationBar from './ChinesePunctuationBar'
import { useEditorStore } from '../stores/editorStore'
import { useUiStore } from '../stores/uiStore'
import { commandService, Commands } from '../services/commandService'
import {
  getTabBehavior,
  getAutoSaveSettings,
  getAutoIndentSettings
} from './editor/PreferencesPage'
import { useEditorStatusBar } from '../hooks/useEditorStatusBar'
import { getPageLifecycleManager, throttleWhenVisible } from '../utils/pageLifecycle'

interface PlainTextEditorProps {
  content: string
  isActive?: boolean
  onChange: (content: string) => void
  onSave?: () => void
  placeholder?: string
  tabId?: string
  groupId?: string
}

// 全语言支持的字数统计
function countTextStats(text: string): {
  chars: number
  words: number
  readingTime: number
  charsWithoutSpaces: number
  paragraphs: number
} {
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
    words = wordSegments.filter((s) => s.isWordLike).length
  } else {
    // 降级方案
    chars = trimmedText.length

    // 检测是否主要是中文/日文/韩文
    const cjkPattern = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/
    const isMainlyCJK = cjkPattern.test(trimmedText)

    if (isMainlyCJK) {
      // CJK 语言：字符数约等于词数
      words = trimmedText
        .split(/\s+/)
        .filter((s) => s.length > 0)
        .reduce((acc, segment) => {
          // 计算每个 segment 中的 CJK 字符数 + 英文单词数
          const cjkChars = (segment.match(cjkPattern) || []).length
          const englishWords = segment
            .split(/[^\w\u4e00-\u9fa5]+/)
            .filter((s) => /^[a-zA-Z]+$/.test(s)).length
          return acc + cjkChars + englishWords
        }, 0)
    } else {
      // 其他语言：按空格分隔
      words = trimmedText.split(/\s+/).filter((s) => s.length > 0).length
    }
  }

  // 净字数（去除空格）
  const charsWithoutSpaces = trimmedText.replace(/\s+/g, '').length

  // 段落数（非空行）
  const paragraphs = trimmedText.split(/\n/).filter((line) => line.trim().length > 0).length

  // 阅读时间估算（假设中文阅读速度 300字/分钟，英文 200词/分钟）
  const readingTime = Math.max(1, Math.ceil((words / 300) * 60))

  return { chars, words, readingTime, charsWithoutSpaces, paragraphs }
}

const PlainTextEditor: React.FC<PlainTextEditorProps> = ({
  content,
  isActive,
  onChange,
  onSave,
  placeholder,
  tabId,
  groupId = 'default'
}) => {
  const { t } = useTranslation()
  const _placeholder = placeholder || t('editor.startWritingDefault')
  const [text, setText] = useState(content || '')
  const goBack = useEditorStore((s) => s.goBack)
  const goForward = useEditorStore((s) => s.goForward)
  const setTabScrollPosition = useEditorStore((s) => s.setTabScrollPosition)
  const getTabScrollPosition = useEditorStore((s) => s.getTabScrollPosition)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isComposingRef = useRef(false)
  const pendingEnterAfterCompositionRef = useRef(false)
  const compositionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { updateStats: updateStatusBarStats, updateLastSaved } = useEditorStatusBar(
    isActive ?? false
  )

  const pendingRestoreScrollRef = useRef(false)
  const lastRestoredTabIdRef = useRef<string | undefined>(undefined)
  const scrollDebugEnabledRef = useRef(false)
  const scrollEventSeqRef = useRef(0)

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  // 初始检查
  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isActive])

  useEffect(() => {
    try {
      scrollDebugEnabledRef.current =
        typeof localStorage !== 'undefined' && localStorage.getItem('ssw:debugScroll') === '1'
    } catch {
      scrollDebugEnabledRef.current = false
    }
  }, [])

  const debugScroll = useCallback(
    (message: string, extra?: Record<string, unknown>) => {
      if (!scrollDebugEnabledRef.current) return
      const textarea = textareaRef.current
      const overlay = highlightOverlayRef.current
      const payload = {
        tabId,
        textLength: text.length,
        textareaScrollTop: textarea?.scrollTop,
        textareaScrollLeft: textarea?.scrollLeft,
        overlayPresent: Boolean(overlay),
        overlayScrollTop: overlay?.scrollTop,
        overlayScrollLeft: overlay?.scrollLeft,
        pendingRestore: pendingRestoreScrollRef.current,
        lastRestoredTabId: lastRestoredTabIdRef.current,
        saved: tabId ? getTabScrollPosition(tabId) : undefined,
        ...extra
      }

      console.debug(`[PlainTextEditor][scroll] ${message}`, payload)
    },
    // eslint-disable-next-line @eslint-react/exhaustive-deps
    [tabId, text.length]
  )

  // 中文标点工具栏状态
  const [punctuationBarVisible, setPunctuationBarVisible] = useState(false)
  const [punctuationBarPosition, setPunctuationBarPosition] = useState({ x: 0, y: 0 })
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressRef = useRef(false)
  const mousePositionRef = useRef({ x: 0, y: 0 })

  // 查找/替换窗口状态
  const [isFindWidgetVisible, setIsFindWidgetVisible] = useState(false)

  // 查找匹配高亮状态
  const [highlightMatches, setHighlightMatches] = useState<MatchRange[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1)
  const highlightOverlayRef = useRef<HTMLDivElement>(null)

  // 自动保存状态
  const autoSaveTimerRef = useRef<number | null>(null)
  const lastSavedTextRef = useRef<string>('')
  const textRef = useRef(text)
  textRef.current = text

  // 页面生命周期管理
  const pageLifecycleRef = useRef(getPageLifecycleManager())
  const pendingAutoSaveRef = useRef(false)

  // 使用 useCallback 避免无限渲染循环
  const handleMatchesChange = useCallback((matches: MatchRange[], currentIdx: number) => {
    setHighlightMatches(matches)
    setCurrentMatchIndex(currentIdx)
  }, [])

  // 节流的滚动位置保存函数 - 必须在 handleScroll 之前定义
  const throttledSaveScrollPositionRef = useRef(
    throttleWhenVisible((id: string, position: { scrollTop: number; scrollLeft: number }) => {
      setTabScrollPosition(id, position)
      if (scrollDebugEnabledRef.current) {
        scrollEventSeqRef.current += 1
        debugScroll('save', { seq: scrollEventSeqRef.current })
      }
    }, 150)
  )

  // 同步滚动 - textarea 滚动时更新高亮层
  const handleScroll = useCallback(() => {
    const textarea = textareaRef.current
    const overlay = highlightOverlayRef.current
    if (!textarea) return

    // overlay 只有在有匹配高亮时才存在；不存在时也要正常保存滚动位置
    if (overlay) {
      overlay.scrollTop = textarea.scrollTop
      overlay.scrollLeft = textarea.scrollLeft
    }

    // 用 tabId 保存滚动位置 - 使用节流避免频繁更新
    if (tabId) {
      // content 同步触发的“被动滚动重置”不应覆盖原有的滚动记忆
      if (pendingRestoreScrollRef.current) return

      // 页面不可见时跳过保存，减少后台资源消耗
      if (!pageLifecycleRef.current.isPageVisible()) return

      throttledSaveScrollPositionRef.current(tabId, {
        scrollTop: textarea.scrollTop,
        scrollLeft: textarea.scrollLeft
      })
    }
  }, [tabId])

  // 历史记录用于撤销/重做
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef<number>(-1)
  const isUndoingRef = useRef(false)
  const isInitializedRef = useRef(false)

  // 保存选区状态（处理焦点丢失问题）
  const savedSelectionRef = useRef<{ start: number; end: number } | null>(null)

  // 保存当前选区
  const saveSelection = useCallback(() => {
    if (textareaRef.current) {
      savedSelectionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd
      }
    }
  }, [])

  // 恢复焦点和选区
  const restoreFocusAndSelection = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.focus()

    // 恢复选区
    if (savedSelectionRef.current) {
      const { start, end } = savedSelectionRef.current
      const safeStart = Math.min(start, textarea.value.length)
      const safeEnd = Math.min(end, textarea.value.length)
      textarea.setSelectionRange(safeStart, safeEnd)
    }
  }, [])

  useEffect(() => {
    if (content !== text && !isUndoingRef.current) {
      // value 更新会导致浏览器把 textarea 滚动重置到顶部；等下一次 commit 后再恢复滚动位置
      pendingRestoreScrollRef.current = true
      debugScroll('content->text sync (mark pending restore)', {
        contentLength: (content || '').length
      })
      setText(content || '')
    }
  }, [content, text, debugScroll])

  // 恢复滚动位置 - 使用 useLayoutEffect 在 DOM 更新后同步执行
  useLayoutEffect(() => {
    if (!tabId || !textareaRef.current) return

    const tabChanged = lastRestoredTabIdRef.current !== tabId
    const shouldRestore = pendingRestoreScrollRef.current || tabChanged
    if (!shouldRestore) return

    const saved = getTabScrollPosition(tabId)
    if (!saved) {
      pendingRestoreScrollRef.current = false
      lastRestoredTabIdRef.current = tabId
      debugScroll('restore skipped (no saved)')
      return
    }

    const textarea = textareaRef.current
    const overlay = highlightOverlayRef.current

    // 立即应用滚动位置
    debugScroll('restore start', {
      reason: pendingRestoreScrollRef.current ? 'pending' : 'tabChanged'
    })
    textarea.scrollTop = saved.scrollTop
    textarea.scrollLeft = saved.scrollLeft
    if (overlay) {
      overlay.scrollTop = saved.scrollTop
      overlay.scrollLeft = saved.scrollLeft
    }

    pendingRestoreScrollRef.current = false
    lastRestoredTabIdRef.current = tabId
    debugScroll('restore done')
  }, [tabId, text, debugScroll, getTabScrollPosition])

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
    requestAnimationFrame(() => setText(initialContent))
  }, [content])

  // 注册命令
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return undefined

    // 编辑命令
    const unregisterUndo = commandService.registerCommand(
      Commands.UNDO,
      () => {
        if (historyIndexRef.current > 0) {
          isUndoingRef.current = true
          historyIndexRef.current--
          const prevText = historyRef.current[historyIndexRef.current]
          setText(prevText)
          onChange(prevText)
          requestAnimationFrame(() => {
            textarea.focus()
            isUndoingRef.current = false
          })
        }
      },
      groupId
    )

    const unregisterRedo = commandService.registerCommand(
      Commands.REDO,
      () => {
        if (historyIndexRef.current < historyRef.current.length - 1) {
          isUndoingRef.current = true
          historyIndexRef.current++
          const nextText = historyRef.current[historyIndexRef.current]
          setText(nextText)
          onChange(nextText)
          requestAnimationFrame(() => {
            textarea.focus()
            isUndoingRef.current = false
          })
        }
      },
      groupId
    )

    const unregisterCut = commandService.registerCommand(
      Commands.CUT,
      async () => {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = textarea.value.substring(start, end)
        if (selectedText) {
          try {
            await navigator.clipboard.writeText(selectedText)
            const newText = textarea.value.substring(0, start) + textarea.value.substring(end)
            setText(newText)
            onChange(newText)
            saveHistory(newText)
            requestAnimationFrame(() => {
              textarea.selectionStart = textarea.selectionEnd = start
            })
          } catch (error) {
            console.error('Cut failed:', error)
            alert(t('errors.cutFailed'))
          }
        }
      },
      groupId
    )

    const unregisterCopy = commandService.registerCommand(
      Commands.COPY,
      async () => {
        const selectedText = textarea.value.substring(
          textarea.selectionStart,
          textarea.selectionEnd
        )
        if (selectedText) {
          try {
            await navigator.clipboard.writeText(selectedText)
          } catch (error) {
            console.error('复制失败:', error)
          }
        }
      },
      groupId
    )

    const unregisterPaste = commandService.registerCommand(
      Commands.PASTE,
      async () => {
        try {
          const clipboardText = await navigator.clipboard.readText()
          const start = textarea.selectionStart
          const end = textarea.selectionEnd
          const newText =
            textarea.value.substring(0, start) + clipboardText + textarea.value.substring(end)
          setText(newText)
          onChange(newText)
          saveHistory(newText)
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = start + clipboardText.length
          })
        } catch {
          // 剪贴板访问失败
        }
      },
      groupId
    )

    const unregisterSelectAll = commandService.registerCommand(
      Commands.SELECT_ALL,
      () => {
        restoreFocusAndSelection()
        textarea.select()
      },
      groupId
    )

    const unregisterFind = commandService.registerCommand(
      Commands.FIND,
      () => {
        setIsFindWidgetVisible(true)
      },
      groupId
    )

    // 选择命令
    const unregisterExpandSelection = commandService.registerCommand(
      Commands.EXPAND_SELECTION,
      () => {
        restoreFocusAndSelection()
        // 扩大选区：选中当前词或整行
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const value = textarea.value

        // 查找单词边界
        let newStart = start
        let newEnd = end

        // 向前找
        while (newStart > 0 && /\S/.test(value[newStart - 1])) {
          newStart--
        }

        // 向后找
        while (newEnd < value.length && /\S/.test(value[newEnd])) {
          newEnd++
        }

        if (newStart === start && newEnd === end && start !== end) {
          // 如果已经是单词，扩展到整行
          const lineStart = value.lastIndexOf('\n', start - 1) + 1
          const lineEnd = value.indexOf('\n', end)
          newStart = lineStart
          newEnd = lineEnd === -1 ? value.length : lineEnd
        }

        textarea.setSelectionRange(newStart, newEnd)
        // 保存新的选区
        savedSelectionRef.current = { start: newStart, end: newEnd }
      },
      groupId
    )

    const unregisterShrinkSelection = commandService.registerCommand(
      Commands.SHRINK_SELECTION,
      () => {
        restoreFocusAndSelection()
        // 缩小选区：从两端各收缩一个字符
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        if (end > start) {
          const newStart = start + 1
          const newEnd = end - 1
          textarea.setSelectionRange(newStart, newEnd)
          savedSelectionRef.current = { start: newStart, end: newEnd }
        }
      },
      groupId
    )

    const unregisterSelectParagraph = commandService.registerCommand(
      Commands.SELECT_PARAGRAPH,
      () => {
        restoreFocusAndSelection()
        const value = textarea.value
        const pos = textarea.selectionStart

        // 查找段落边界（空行或文档边界）
        let start = pos
        let end = pos

        // 向前找段落开始
        while (start > 0) {
          const char = value[start - 1]
          if (char === '\n' && (start === 1 || value[start - 2] === '\n')) break
          start--
        }

        // 向后找段落结束
        while (end < value.length) {
          const char = value[end]
          if (char === '\n' && (end === value.length - 1 || value[end + 1] === '\n')) {
            end++
            break
          }
          end++
        }

        textarea.setSelectionRange(start, end)
        savedSelectionRef.current = { start, end }
      },
      groupId
    )

    const unregisterCursorUp = commandService.registerCommand(
      Commands.CURSOR_UP,
      () => {
        restoreFocusAndSelection()
        const start = textarea.selectionStart
        const value = textarea.value
        const currentLineStart = value.lastIndexOf('\n', start - 1) + 1
        const currentLineOffset = start - currentLineStart

        // 找到上一行
        if (currentLineStart > 0) {
          const prevLineEnd = currentLineStart - 1
          const prevLineStart = value.lastIndexOf('\n', prevLineEnd - 1) + 1
          const prevLineLength = prevLineEnd - prevLineStart
          const newOffset = Math.min(currentLineOffset, prevLineLength)
          const newPos = prevLineStart + newOffset
          textarea.setSelectionRange(newPos, newPos)
          savedSelectionRef.current = { start: newPos, end: newPos }
        }
      },
      groupId
    )

    const unregisterCursorDown = commandService.registerCommand(
      Commands.CURSOR_DOWN,
      () => {
        restoreFocusAndSelection()
        const start = textarea.selectionStart
        const value = textarea.value
        const currentLineStart = value.lastIndexOf('\n', start - 1) + 1
        const currentLineOffset = start - currentLineStart
        const nextLineStart = value.indexOf('\n', start) + 1

        // 找到下一行
        if (nextLineStart > 0 && nextLineStart < value.length) {
          const nextLineEnd = value.indexOf('\n', nextLineStart)
          const nextLineLength =
            nextLineEnd === -1 ? value.length - nextLineStart : nextLineEnd - nextLineStart
          const newOffset = Math.min(currentLineOffset, nextLineLength)
          const newPos = nextLineStart + newOffset
          textarea.setSelectionRange(newPos, newPos)
          savedSelectionRef.current = { start: newPos, end: newPos }
        }
      },
      groupId
    )

    const unregisterCursorLeft = commandService.registerCommand(
      Commands.CURSOR_LEFT,
      () => {
        restoreFocusAndSelection()
        const start = textarea.selectionStart
        if (start > 0) {
          const newPos = start - 1
          textarea.setSelectionRange(newPos, newPos)
          savedSelectionRef.current = { start: newPos, end: newPos }
        }
      },
      groupId
    )

    const unregisterCursorRight = commandService.registerCommand(
      Commands.CURSOR_RIGHT,
      () => {
        restoreFocusAndSelection()
        const end = textarea.selectionEnd
        if (end < textarea.value.length) {
          const newPos = end + 1
          textarea.setSelectionRange(newPos, newPos)
          savedSelectionRef.current = { start: newPos, end: newPos }
        }
      },
      groupId
    )

    // 保存命令
    const unregisterSave = commandService.registerCommand(
      Commands.SAVE,
      async () => {
        if (onSave) {
          await onSave()
          lastSavedTextRef.current = textRef.current
          const now = new Date()
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
          updateLastSaved(timeStr)
        }
      },
      groupId
    )

    // 导航历史命令
    const unregisterNavBack = commandService.registerCommand(
      Commands.NAV_BACK,
      () => {
        goBack()
      },
      groupId
    )

    const unregisterNavForward = commandService.registerCommand(
      Commands.NAV_FORWARD,
      () => {
        goForward()
      },
      groupId
    )

    // 禅模式命令
    const unregisterZenMode = commandService.registerCommand(
      Commands.ZEN_MODE,
      () => {
        useUiStore.getState().toggleZenMode()
      },
      groupId
    )

    return () => {
      unregisterUndo()
      unregisterRedo()
      unregisterCut()
      unregisterCopy()
      unregisterPaste()
      unregisterSelectAll()
      unregisterFind()
      unregisterExpandSelection()
      unregisterShrinkSelection()
      unregisterSelectParagraph()
      unregisterCursorUp()
      unregisterCursorDown()
      unregisterCursorLeft()
      unregisterCursorRight()
      unregisterSave()
      unregisterNavBack()
      unregisterNavForward()
      unregisterZenMode()
    }
  }, [
    onChange,
    onSave,
    saveHistory,
    goBack,
    goForward,
    groupId,
    restoreFocusAndSelection,
    t,
    updateLastSaved
  ])

  // Update status bar when text changes
  useEffect(() => {
    const { chars, words, readingTime, charsWithoutSpaces, paragraphs } = countTextStats(text)

    updateStatusBarStats({ chars, words, readingTime, charsWithoutSpaces, paragraphs })
  }, [text, updateStatusBarStats])

  // 执行自动保存
  const executeAutoSave = useCallback(() => {
    if (onSave && textRef.current !== lastSavedTextRef.current) {
      lastSavedTextRef.current = textRef.current
      onSave()

      const now = new Date()
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      updateLastSaved(timeStr)
    }
    pendingAutoSaveRef.current = false
  }, [onSave, updateLastSaved])

  // 自动保存逻辑 - 优化后台性能
  const scheduleAutoSave = useCallback(() => {
    const autoSaveSettings = getAutoSaveSettings()
    if (!autoSaveSettings.enabled) return

    // 如果页面不可见，标记有待保存内容但不设置定时器
    if (!pageLifecycleRef.current.isPageVisible()) {
      pendingAutoSaveRef.current = true
      return
    }

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current)
    }
    autoSaveTimerRef.current = window.setTimeout(() => {
      executeAutoSave()
    }, autoSaveSettings.interval)
  }, [executeAutoSave])

  // 监听页面生命周期变化
  useEffect(() => {
    const manager = pageLifecycleRef.current

    // 页面隐藏时：清除自动保存定时器
    const onHide = (): void => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
        pendingAutoSaveRef.current = true
      }
    }

    // 页面显示时：执行待保存的内容
    const onShow = (): void => {
      if (pendingAutoSaveRef.current) {
        executeAutoSave()
      }
      // 恢复焦点到编辑器
      if (isActive && textareaRef.current) {
        textareaRef.current.focus()
      }
    }

    manager.setCallbacks({ onHide, onShow })

    return () => {
      manager.setCallbacks({})
    }
  }, [executeAutoSave, isActive])

  // 组件卸载时清理计时器
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // 常规输入/粘贴等由 onChange 处理；Enter 自动缩进在 onKeyDown 中处理（见下）。
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const newText = e.target.value
    setText(newText)
    onChange(newText)
    saveHistory(newText)
    scheduleAutoSave()
  }

  const insertNewlineWithIndent = useCallback(
    (textarea: HTMLTextAreaElement, fallbackIndent: string) => {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value

      // 获取缩进：优先继承“上一行/当前行”的行首缩进；没有则使用设置里的缩进策略。
      const currentLineStart = value.lastIndexOf('\n', start - 1) + 1
      let sourceLineStart = currentLineStart
      let sourceLineEnd = value.indexOf('\n', currentLineStart)
      if (sourceLineEnd === -1) sourceLineEnd = value.length

      // 若光标在行首，继承上一行缩进（更符合编辑器直觉）。
      if (start === currentLineStart && currentLineStart > 0) {
        const prevLineEnd = currentLineStart - 1 // '\n' 的位置
        sourceLineStart = value.lastIndexOf('\n', prevLineEnd - 1) + 1
        sourceLineEnd = prevLineEnd
      }

      const sourceLine = value.substring(sourceLineStart, sourceLineEnd)
      const indentMatch = sourceLine.match(/^[\t ]+/)
      const indent = (indentMatch?.[0] ?? '') || fallbackIndent

      const insertion = `\n${indent}`
      const newText = value.substring(0, start) + insertion + value.substring(end)

      setText(newText)
      onChange(newText)
      saveHistory(newText)
      scheduleAutoSave()

      requestAnimationFrame(() => {
        textarea.focus()
        const next = start + insertion.length
        textarea.setSelectionRange(next, next)
      })
    },
    [onChange, saveHistory, scheduleAutoSave]
  )

  const handleBlur = useCallback(() => {
    if (isComposingRef.current) {
      isComposingRef.current = false
      pendingEnterAfterCompositionRef.current = false
    }
    if (compositionTimerRef.current) {
      clearTimeout(compositionTimerRef.current)
      compositionTimerRef.current = null
    }
    saveSelection()
  }, [saveSelection])

  const handleCompositionStart = (): void => {
    isComposingRef.current = true
    if (compositionTimerRef.current) clearTimeout(compositionTimerRef.current)
    compositionTimerRef.current = setTimeout(() => {
      if (isComposingRef.current) {
        isComposingRef.current = false
        pendingEnterAfterCompositionRef.current = false
      }
    }, 5000)
  }

  const handleCompositionEnd = (): void => {
    isComposingRef.current = false
    if (compositionTimerRef.current) {
      clearTimeout(compositionTimerRef.current)
      compositionTimerRef.current = null
    }

    if (!pendingEnterAfterCompositionRef.current) return
    pendingEnterAfterCompositionRef.current = false

    const autoIndentSettings = getAutoIndentSettings()
    if (!autoIndentSettings.enabled) return

    const textarea = textareaRef.current
    if (!textarea) return

    // 等待本次上屏内容真正写入 textarea.value 后再插入换行
    requestAnimationFrame(() => insertNewlineWithIndent(textarea, autoIndentSettings.indent))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    // Ctrl+S 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      commandService.executeCommand(Commands.SAVE)
      return
    }

    // Ctrl+Z 撤销
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      commandService.executeCommand(Commands.UNDO)
      return
    }

    // Ctrl+Y 或 Ctrl+Shift+Z 重做
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      commandService.executeCommand(Commands.REDO)
      return
    }

    // Ctrl+A 全选
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault()
      commandService.executeCommand(Commands.SELECT_ALL)
      return
    }

    // Ctrl+F 查找
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault()
      commandService.executeCommand(Commands.FIND)
      return
    }

    // Ctrl+Shift+E 禅模式
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
      e.preventDefault()
      commandService.executeCommand(Commands.ZEN_MODE)
      return
    }

    // Enter 换行时自动缩进
    if (e.key === 'Enter') {
      const autoIndentSettings = getAutoIndentSettings()
      if (autoIndentSettings.enabled) {
        // 输入法组合态下的 Enter 常用于上屏/选词；这里延后到 compositionend 再补换行。
        if (isComposingRef.current || e.nativeEvent.isComposing) {
          pendingEnterAfterCompositionRef.current = true
          return
        }

        e.preventDefault()
        insertNewlineWithIndent(e.currentTarget, autoIndentSettings.indent)
        return
      }
    }

    // Tab 插入/删除缩进
    if (e.key === 'Tab') {
      e.preventDefault()
      const tabBehavior = getTabBehavior()
      const insertChars =
        tabBehavior === '4spaces' ? '    ' : tabBehavior === '2spaces' ? '  ' : '\t'
      const removeChars =
        tabBehavior === '4spaces' ? '    ' : tabBehavior === '2spaces' ? '  ' : '\t'

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
        // 单行模式：插入缩进
        const newText = value.substring(0, start) + insertChars + value.substring(end)
        setText(newText)
        onChange(newText)
        saveHistory(newText)
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + insertChars.length
        })
      } else {
        // 多行模式：增加或删除缩进
        const isUnindent = e.shiftKey
        let newSelectionStart = start
        let newSelectionEnd = end
        const removeLen = removeChars.length

        for (let i = startLine; i <= endLine; i++) {
          if (isUnindent) {
            // Shift+Tab: 删除行首的缩进
            if (lines[i].startsWith(removeChars)) {
              lines[i] = lines[i].substring(removeLen)
              if (i === startLine) newSelectionStart -= removeLen
              newSelectionEnd -= removeLen
            } else if (lines[i].startsWith('\t')) {
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
            // Tab: 添加缩进
            lines[i] = insertChars + lines[i]
            if (i === startLine) newSelectionStart += insertChars.length
            newSelectionEnd += insertChars.length
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

    // Alt+. 显示中文标点工具栏
    if (e.altKey && e.key === '.') {
      e.preventDefault()
      const pos = mousePositionRef.current
      if (pos.x > 0 && pos.y > 0) {
        setPunctuationBarPosition(pos)
        setPunctuationBarVisible(true)
      }
      return
    }

    // ESC 退出禅模式
    if (e.key === 'Escape') {
      useUiStore.getState().setZenMode(false)
      return
    }
  }

  const handleKeyDownCapture = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    handleKeyDown(e)

    // 如果我们已经接管了按键行为（如 Tab / Enter / 快捷键），阻止它继续冒泡到全局监听器（例如查找面板）。
    if (e.defaultPrevented) {
      e.stopPropagation()
    }
  }

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>): void => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  // 长按显示中文标点工具栏
  const handleMouseDown = (e: React.MouseEvent<HTMLTextAreaElement>): void => {
    mousePositionRef.current = { x: e.clientX, y: e.clientY }
    if (e.button === 2) {
      isLongPressRef.current = false
      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true
        setPunctuationBarPosition({ x: e.clientX, y: e.clientY })
        setPunctuationBarVisible(true)
      }, 400)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>): void => {
    mousePositionRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>): void => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    // 只有在非长按（显示标点工具栏）的情况下才显示右键菜单
    if (!isLongPressRef.current && e.button === 2) {
      setContextMenu({ x: e.clientX, y: e.clientY })
    }
    isLongPressRef.current = false
  }

  const handleMouseLeave = (): void => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  // 插入标点符号
  const handleInsertPunctuation = useCallback(
    (symbol: string) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value

      let newOffset: number
      if (symbol.length === 2 && ['「」', '『』', '""', '（）', '【】', '《》'].includes(symbol)) {
        newOffset = start + 1
      } else {
        newOffset = start + symbol.length
      }

      const newText = value.substring(0, start) + symbol + value.substring(end)
      setText(newText)
      onChange(newText)
      saveHistory(newText)

      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(newOffset, newOffset)
      })
    },
    [onChange, saveHistory]
  )

  // 关闭标点工具栏
  const handleClosePunctuationBar = useCallback(() => {
    setPunctuationBarVisible(false)
  }, [])

  const handleCloseContextMenu = (): void => {
    setContextMenu(null)
  }

  const handleCloseFindWidget = useCallback(() => {
    setIsFindWidgetVisible(false)
    textareaRef.current?.focus()
  }, [])

  const contextMenuItems: ContextMenuItem[] = [
    {
      key: 'undo',
      label: `${t('menu.undo')} (Ctrl+Z)`,
      onSelect: () => commandService.executeCommand(Commands.UNDO)
    },
    {
      key: 'redo',
      label: `${t('menu.redo')} (Ctrl+Y)`,
      onSelect: () => commandService.executeCommand(Commands.REDO)
    },
    {
      key: 'separator1',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'cut',
      label: `${t('menu.cut')} (Ctrl+X)`,
      onSelect: () => commandService.executeCommand(Commands.CUT)
    },
    {
      key: 'copy',
      label: `${t('menu.copy')} (Ctrl+C)`,
      onSelect: () => commandService.executeCommand(Commands.COPY)
    },
    {
      key: 'paste',
      label: `${t('menu.paste')} (Ctrl+V)`,
      onSelect: () => commandService.executeCommand(Commands.PASTE)
    },
    {
      key: 'selectAll',
      label: `${t('menu.selectAll')} (Ctrl+A)`,
      onSelect: () => commandService.executeCommand(Commands.SELECT_ALL)
    },
    {
      key: 'separator2',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'zen-mode',
      label: t('menu.zenMode'),
      onSelect: () => useUiStore.getState().toggleZenMode()
    }
  ]

  // 渲染带高亮的文本内容
  const renderHighlightedText = (): React.ReactNode => {
    if (highlightMatches.length === 0) return text

    const parts: React.ReactNode[] = []
    let lastIndex = 0

    highlightMatches.forEach((match, index) => {
      // 添加匹配前的文本
      if (match.start > lastIndex) {
        parts.push(
          <span key={`text-${match.start}`}>{text.substring(lastIndex, match.start)}</span>
        )
      }
      // 添加高亮的匹配文本
      parts.push(
        <span
          key={`match-${match.start}`}
          className={`highlight-match ${index === currentMatchIndex ? 'current' : ''}`}
        >
          {text.substring(match.start, match.end)}
        </span>
      )
      lastIndex = match.end
    })

    // 添加剩余文本
    if (lastIndex < text.length) {
      parts.push(<span key="text-end">{text.substring(lastIndex)}</span>)
    }

    return parts
  }

  return (
    <div
      className="plain-text-editor"
      onContextMenu={(e) => {
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY })
      }}
    >
      <FindReplaceWidget
        isVisible={isFindWidgetVisible}
        onClose={handleCloseFindWidget}
        text={text}
        textareaRef={textareaRef}
        onTextChange={(newText) => {
          setText(newText)
          onChange(newText)
          saveHistory(newText)
        }}
        onMatchesChange={handleMatchesChange}
      />
      <div className="plain-text-editor-container">
        {/* 高亮层 - 显示所有匹配 */}
        {highlightMatches.length > 0 && (
          <div ref={highlightOverlayRef} className="highlight-overlay" aria-hidden="true">
            {renderHighlightedText()}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="plain-text-editor-textarea"
          value={text}
          onChange={handleChange}
          onKeyDownCapture={handleKeyDownCapture}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onContextMenu={handleContextMenu}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onBlur={handleBlur}
          onScroll={handleScroll}
          placeholder={_placeholder}
          spellCheck={false}
          data-tab-id={tabId}
          data-group-id={groupId}
        />
      </div>
      <ChinesePunctuationBar
        isVisible={punctuationBarVisible}
        position={punctuationBarPosition}
        onClose={handleClosePunctuationBar}
        onInsert={handleInsertPunctuation}
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
