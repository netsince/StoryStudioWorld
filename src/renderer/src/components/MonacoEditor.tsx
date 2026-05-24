import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import ContextMenu, { type ContextMenuItem } from './ContextMenu'
import ChinesePunctuationBar from './ChinesePunctuationBar'
import { useEditorStore } from '../stores/editorStore'
import { useUiStore } from '../stores/uiStore'
import { commandService, Commands } from '../services/commandService'
import {
  getAutoSaveSettings,
  getAppSettings,
  getTabBehavior,
  getAutoIndentSettings
} from './editor/PreferencesPage'
import { useEditorStatusBar } from '../hooks/useEditorStatusBar'
import { getPageLifecycleManager } from '../utils/pageLifecycle'
import { editorRegistry } from '../services/editorRegistry'

self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker()
  }
}

// Monaco dispose 时内部的 WordHighlighter Delayer 会抛出 Canceled，过滤掉避免控制台噪音
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', function handler(e) {
    if (e.reason?.message === 'Canceled' || String(e.reason) === 'Canceled') {
      e.preventDefault()
    }
  })
}

interface PlainTextEditorProps {
  content: string
  isActive?: boolean
  onChange: (content: string) => void
  onSave?: () => void
  placeholder?: string
  tabId?: string
  groupId?: string
}

function countTextStats(text: string): {
  chars: number
  words: number
  readingTime: number
  charsWithoutSpaces: number
  paragraphs: number
} {
  const trimmedText = text.trim()
  let chars = 0
  let words = 0

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const graphemeSegmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' })
    const wordSegmenter = new Intl.Segmenter('zh', { granularity: 'word' })
    const graphemes = Array.from(graphemeSegmenter.segment(trimmedText))
    chars = graphemes.length
    const wordSegments = Array.from(wordSegmenter.segment(trimmedText))
    words = wordSegments.filter((s) => s.isWordLike).length
  } else {
    chars = trimmedText.length
    const cjkPattern = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/
    const isMainlyCJK = cjkPattern.test(trimmedText)
    if (isMainlyCJK) {
      words = trimmedText
        .split(/\s+/)
        .filter((s) => s.length > 0)
        .reduce((acc, segment) => {
          const cjkChars = (segment.match(cjkPattern) || []).length
          const englishWords = segment
            .split(/[^\w\u4e00-\u9fa5]+/)
            .filter((s) => /^[a-zA-Z]+$/.test(s)).length
          return acc + cjkChars + englishWords
        }, 0)
    } else {
      words = trimmedText.split(/\s+/).filter((s) => s.length > 0).length
    }
  }
  const charsWithoutSpaces = trimmedText.replace(/\s+/g, '').length
  const paragraphs = trimmedText.split(/\n/).filter((line) => line.trim().length > 0).length
  const readingTime = Math.max(1, Math.ceil((words / 300) * 60))
  return { chars, words, readingTime, charsWithoutSpaces, paragraphs }
}

function buildMonacoOptions(
  overrides?: Partial<monaco.editor.IStandaloneEditorConstructionOptions>
): monaco.editor.IStandaloneEditorConstructionOptions {
  const root = document.documentElement
  const fs = getComputedStyle(root).getPropertyValue('--editor-font-size').trim()
  const lh = getComputedStyle(root).getPropertyValue('--editor-line-height').trim()
  const ff = getComputedStyle(root).getPropertyValue('--editor-font-family').trim()
  const fontSize = fs ? parseInt(fs) : 18
  const lineHeight = lh ? Math.round(parseFloat(lh) * fontSize) : 36

  const tabBehavior = getTabBehavior()
  const insertSpaces = tabBehavior !== 'tab'
  const tabSize = tabBehavior === '4spaces' ? 4 : tabBehavior === '2spaces' ? 2 : 4

  const autoIndentSettings = getAutoIndentSettings()

  return {
    theme: 'vs-dark',
    fontFamily: ff || "'Noto Serif SC', serif",
    fontSize,
    lineHeight,
    language: 'plaintext',
    minimap: { enabled: false },
    scrollbar: {
      vertical: 'visible',
      horizontal: 'hidden',
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      alwaysConsumeMouseWheel: false
    },
    scrollPredominantAxis: true,
    lineNumbers: 'off',
    folding: false,
    wordWrap: 'on',
    wrappingStrategy: 'advanced',
    wordBreak: 'normal',
    selectionHighlight: false,
    contextmenu: false,
    scrollBeyondLastLine: false,
    renderWhitespace: 'none',
    padding: { top: 24, bottom: 24 },
    autoClosingBrackets: 'never',
    autoClosingQuotes: 'never',
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    links: true,
    stickyScroll: { enabled: false },
    matchBrackets: 'never',
    formatOnType: false,
    formatOnPaste: false,
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    suggest: {
      preview: false,
      snippetsPreventQuickSuggestions: true
    },
    snippetSuggestions: 'none',
    acceptSuggestionOnCommitCharacter: false,
    lightbulb: { enabled: 'off' as unknown as Exclude<monaco.editor.IEditorLightbulbOptions['enabled'], undefined> },
    autoIndent: autoIndentSettings.enabled ? 'advanced' : 'none',
    tabSize,
    insertSpaces,
    unicodeHighlight: {
      nonBasicASCII: false,
      ambiguousCharacters: false,
      invisibleCharacters: false
    },
    guides: {
      bracketPairs: false,
      indentation: false
    },
    renderLineHighlight: 'none',
    occurrencesHighlight: 'off',
    copyWithSyntaxHighlighting: false,
    find: {
      seedSearchStringFromSelection: 'always'
    },
    mouseWheelZoom: true,
    multiCursorMergeOverlapping: false,
    multiCursorModifier: 'ctrlCmd',
    showDeprecated: false,
    unfoldOnClickAfterEndOfLine: false,
    wordBasedSuggestions: 'off',
    dragAndDrop: false,
    hideCursorInOverviewRuler: false,
    renderFinalNewline: 'on',
    wordWrapBreakBeforeCharacters: '([{《「『【〔｛〈［（',
    wordWrapBreakAfterCharacters: ' ,./–—…）〕］｝〉》」』】〙〗〛！？，。、：；’”）',
    ...overrides
  }
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
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const isExternalUpdateRef = useRef(false)
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const goBack = useEditorStore((s) => s.goBack)
  const goForward = useEditorStore((s) => s.goForward)
  const setTabScrollPosition = useEditorStore((s) => s.setTabScrollPosition)
  const getTabScrollPosition = useEditorStore((s) => s.getTabScrollPosition)
  const { updateStats, updateLastSaved } = useEditorStatusBar(isActive ?? false)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [punctuationBarVisible, setPunctuationBarVisible] = useState(false)
  const [punctuationBarPosition, setPunctuationBarPosition] = useState({ x: 0, y: 0 })

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressRef = useRef(false)
  const autoSaveTimerRef = useRef<number | null>(null)
  const lastSavedTextRef = useRef<string>('')
  const pageLifecycleRef = useRef(getPageLifecycleManager())
  const pendingAutoSaveRef = useRef(false)
  const onSaveRef = useRef(onSave)
  const onChangeRef = useRef(onChange)
  onSaveRef.current = onSave
  onChangeRef.current = onChange

  useEffect(() => {
    if (isActive && editorRef.current) {
      editorRef.current.focus()
    }
  }, [isActive])

  useEffect(() => {
    if (!containerRef.current) return

    const saved = tabId ? getTabScrollPosition(tabId) : undefined
    const options = buildMonacoOptions({
      value: content || '',
      placeholder: _placeholder
    })

    const editor = monaco.editor.create(containerRef.current, options)
    editorRef.current = editor
    if (tabId) {
      editorRegistry.register(tabId, editor)
    }

    if (saved?.monacoViewState) {
      try {
        editor.restoreViewState(saved.monacoViewState as monaco.editor.ICodeEditorViewState)
      } catch {
        // ignore restore errors when editor layout changed
      }
    }

    editor.focus()

    // 编辑器创建后立即推送统计数据（解决首次打开显示 0）
    const initialStats = countTextStats(editor.getValue())
    updateStats(initialStats)

    const contentDisposable = editor.onDidChangeModelContent(() => {
      const value = editor.getValue()
      // 统计始终推送（无论是否外部更新）
      const stats = countTextStats(value)
      updateStats(stats)
      if (isExternalUpdateRef.current) return
      onChangeRef.current(value)
      if (tabId) {
        document.dispatchEvent(new CustomEvent('ssw:editor-change', { detail: { tabId } }))
      }
    })

    // Fix 1: resize observer — 布局变化时保存并恢复 viewState（完整保留滚动+光标位置）
    const resizeObserver = new ResizeObserver(() => {
      const vs = editor.saveViewState()
      editor.layout()
      if (vs) {
        try {
          editor.restoreViewState(vs)
        } catch {
          /* ignore */
        }
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      if (tabId) {
        editorRegistry.unregister(tabId)
        try {
          const vs = editor.saveViewState()
          setTabScrollPosition(tabId, {
            scrollTop: editor.getScrollTop(),
            scrollLeft: editor.getScrollLeft(),
            monacoViewState: vs
          })
        } catch {
          // ignore
        }
      }
      contentDisposable.dispose()
      editor.dispose()
      editorRef.current = null
    }
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [isActive, tabId])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (!model) return
    const currentValue = model.getValue()
    if (currentValue !== content) {
      isExternalUpdateRef.current = true
      model.pushStackElement()
      model.setValue(content || '')
      model.pushStackElement()
      isExternalUpdateRef.current = false
    }
  }, [content])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const settings = getAppSettings()
    editor.updateOptions({
      fontFamily: settings.editorFontFamily,
      fontSize: settings.editorFontSize,
      lineHeight: Math.round(settings.editorLineHeight * settings.editorFontSize)
    })
  }, [])

  useEffect(() => {
    const handler = (): void => {
      const editor = editorRef.current
      if (!editor) return
      const settings = getAppSettings()
      editor.updateOptions({
        fontFamily: settings.editorFontFamily,
        fontSize: settings.editorFontSize,
        lineHeight: Math.round(settings.editorLineHeight * settings.editorFontSize)
      })
    }
    window.addEventListener('app-settings-changed', handler)
    return () => window.removeEventListener('app-settings-changed', handler)
  }, [])

  const editorValue = (): string => {
    const editor = editorRef.current
    if (editor) return editor.getValue()
    return content || ''
  }

  const executeAutoSave = useCallback(() => {
    if (onSaveRef.current) {
      const currentText = editorValue()
      if (currentText !== lastSavedTextRef.current) {
        lastSavedTextRef.current = currentText
        onSaveRef.current()
        const now = new Date()
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
        updateLastSaved(timeStr)
      }
    }
    pendingAutoSaveRef.current = false
  }, [updateLastSaved])

  const scheduleAutoSave = useCallback(() => {
    const autoSaveSettings = getAutoSaveSettings()
    if (!autoSaveSettings.enabled) return
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

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const disposable = editor.onDidChangeModelContent(() => {
      if (isExternalUpdateRef.current) return
      scheduleAutoSave()
    })
    return () => disposable.dispose()
  }, [scheduleAutoSave])

  useEffect(() => {
    const manager = pageLifecycleRef.current
    const onHide = (): void => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
        pendingAutoSaveRef.current = true
      }
    }
    const onShow = (): void => {
      if (pendingAutoSaveRef.current) {
        executeAutoSave()
      }
      if (isActive && editorRef.current) {
        editorRef.current.focus()
      }
    }
    manager.setCallbacks({ onHide, onShow })
    return () => {
      manager.setCallbacks({})
    }
  }, [executeAutoSave, isActive])

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // commandService 注册 — 所有编辑命令委托给 Monaco 内置动作或原生 DOM
  useEffect(() => {
    const exec = (action: string): void => {
      const editor = editorRef.current
      if (editor) {
        editor.focus()
        editor.trigger('commandService', action, null)
      }
    }

    const unregisterUndo = commandService.registerCommand(
      Commands.UNDO,
      () => exec('undo'),
      groupId
    )
    const unregisterRedo = commandService.registerCommand(
      Commands.REDO,
      () => exec('redo'),
      groupId
    )
    const unregisterCut = commandService.registerCommand(
      Commands.CUT,
      async () => {
        const editor = editorRef.current
        if (!editor) return
        const selection = editor.getSelection()
        if (!selection || selection.isEmpty()) return
        const model = editor.getModel()
        if (!model) return
        const selectedText = model.getValueInRange(selection)
        try {
          await navigator.clipboard.writeText(selectedText)
        } catch {
          // fallback
        }
        editor.executeEdits('cut', [
          {
            range: selection,
            text: '',
            forceMoveMarkers: true
          }
        ])
      },
      groupId
    )
    const unregisterCopy = commandService.registerCommand(
      Commands.COPY,
      async () => {
        const editor = editorRef.current
        if (!editor) return
        const selection = editor.getSelection()
        if (!selection || selection.isEmpty()) return
        const model = editor.getModel()
        if (!model) return
        const selectedText = model.getValueInRange(selection)
        try {
          await navigator.clipboard.writeText(selectedText)
        } catch {
          // fallback
        }
      },
      groupId
    )
    const unregisterPaste = commandService.registerCommand(
      Commands.PASTE,
      async () => {
        const editor = editorRef.current
        if (!editor) return
        try {
          const clipboardText = await navigator.clipboard.readText()
          editor.executeEdits('paste', [
            {
              range: editor.getSelection()!,
              text: clipboardText,
              forceMoveMarkers: true
            }
          ])
        } catch {
          // clipboard access denied
        }
      },
      groupId
    )
    const unregisterSelectAll = commandService.registerCommand(
      Commands.SELECT_ALL,
      () => exec('editor.action.selectAll'),
      groupId
    )
    const unregisterFind = commandService.registerCommand(
      Commands.FIND,
      () => exec('actions.find'),
      groupId
    )
    const unregisterSave = commandService.registerCommand(
      Commands.SAVE,
      () => {
        if (onSaveRef.current) {
          onSaveRef.current()
          lastSavedTextRef.current = editorValue()
          const now = new Date()
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
          updateLastSaved(timeStr)
        }
      },
      groupId
    )
    const unregisterExpandSelection = commandService.registerCommand(
      Commands.EXPAND_SELECTION,
      () => exec('editor.action.smartSelect.expand'),
      groupId
    )
    const unregisterShrinkSelection = commandService.registerCommand(
      Commands.SHRINK_SELECTION,
      () => exec('editor.action.smartSelect.shrink'),
      groupId
    )
    const unregisterSelectParagraph = commandService.registerCommand(
      Commands.SELECT_PARAGRAPH,
      () => exec('editor.action.selectAll'),
      groupId
    )
    const unregisterCursorUp = commandService.registerCommand(
      Commands.CURSOR_UP,
      () => exec('cursorUp'),
      groupId
    )
    const unregisterCursorDown = commandService.registerCommand(
      Commands.CURSOR_DOWN,
      () => exec('cursorDown'),
      groupId
    )
    const unregisterCursorLeft = commandService.registerCommand(
      Commands.CURSOR_LEFT,
      () => exec('cursorLeft'),
      groupId
    )
    const unregisterCursorRight = commandService.registerCommand(
      Commands.CURSOR_RIGHT,
      () => exec('cursorRight'),
      groupId
    )
    const unregisterNavBack = commandService.registerCommand(
      Commands.NAV_BACK,
      () => goBack(),
      groupId
    )
    const unregisterNavForward = commandService.registerCommand(
      Commands.NAV_FORWARD,
      () => goForward(),
      groupId
    )
    const unregisterZenMode = commandService.registerCommand(
      Commands.ZEN_MODE,
      () => useUiStore.getState().toggleZenMode(),
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
      unregisterSave()
      unregisterExpandSelection()
      unregisterShrinkSelection()
      unregisterSelectParagraph()
      unregisterCursorUp()
      unregisterCursorDown()
      unregisterCursorLeft()
      unregisterCursorRight()
      unregisterNavBack()
      unregisterNavForward()
      unregisterZenMode()
    }
  }, [goBack, goForward, groupId])

  const insertNewlineWithIndent = useCallback((fallbackIndent: string) => {
    const editor = editorRef.current
    if (!editor) return
    const selection = editor.getSelection()
    if (!selection) return
    const model = editor.getModel()
    if (!model) return

    const startLineNum = selection.startLineNumber
    const startLineContent = model.getLineContent(startLineNum)
    const indentMatch = startLineContent.match(/^[\t ]+/)
    const indent = (indentMatch?.[0] ?? '') || fallbackIndent

    editor.executeEdits('auto-indent', [
      {
        range: new monaco.Range(
          selection.startLineNumber,
          selection.startColumn,
          selection.endLineNumber,
          selection.endColumn
        ),
        text: `\n${indent}`,
        forceMoveMarkers: true
      }
    ])
    editor.focus()
  }, [])

  // Fix 3: handle Ctrl+S outside Monaco's command system for reliable capture
  const handleKeyDownOnContainer = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (onSaveRef.current) {
          onSaveRef.current()
          lastSavedTextRef.current = editorValue()
          const now = new Date()
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
          updateLastSaved(timeStr)
        }
        return
      }

      // Alt+. 中文标点工具栏
      if (e.altKey && e.key === '.') {
        e.preventDefault()
        const pos = mousePositionRef.current
        if (pos.x > 0 && pos.y > 0) {
          setPunctuationBarPosition(pos)
          setPunctuationBarVisible(true)
        }
        return
      }

      // Escape 退出禅模式
      if (e.key === 'Escape') {
        useUiStore.getState().setZenMode(false)
        return
      }

      // Enter 自动缩进
      if (e.key === 'Enter') {
        const autoIndentSettings = getAutoIndentSettings()
        if (autoIndentSettings.enabled) {
          e.preventDefault()
          insertNewlineWithIndent(autoIndentSettings.indent)
          return
        }
      }
    },
    [insertNewlineWithIndent, updateLastSaved]
  )

  // Fix 4 & 5: right-click → only context menu, never both
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    mousePositionRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = (_e: React.MouseEvent<HTMLDivElement>): void => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    isLongPressRef.current = false
    // Context menu is handled entirely by onContextMenu, not mouseUp
  }

  const handleMouseLeave = (): void => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const execEditorAction = useCallback((actionId: string): void => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const action = editor.getAction(actionId)
    if (action) {
      action.run().catch(() => {})
    }
  }, [])

  // Fix 5 + Fix 6: use direct native APIs for reliable clipboard, use getAction() for Monaco actions
  const contextMenuItems: ContextMenuItem[] = [
    {
      key: 'undo',
      label: `${t('menu.undo')} (Ctrl+Z)`,
      onSelect: () => execEditorAction('undo')
    },
    {
      key: 'redo',
      label: `${t('menu.redo')} (Ctrl+Y)`,
      onSelect: () => execEditorAction('redo')
    },
    { key: 'separator1', label: '---', onSelect: () => {} },
    {
      key: 'cut',
      label: `${t('menu.cut')} (Ctrl+X)`,
      onSelect: () => {
        const editor = editorRef.current
        if (!editor) return
        const selection = editor.getSelection()
        if (!selection || selection.isEmpty()) return
        const model = editor.getModel()
        if (!model) return
        const text = model.getValueInRange(selection)
        navigator.clipboard.writeText(text).catch(() => {})
        editor.executeEdits('cut', [{ range: selection, text: '', forceMoveMarkers: true }])
        editor.focus()
      }
    },
    {
      key: 'copy',
      label: `${t('menu.copy')} (Ctrl+C)`,
      onSelect: () => {
        const editor = editorRef.current
        if (!editor) return
        const selection = editor.getSelection()
        if (!selection || selection.isEmpty()) return
        const model = editor.getModel()
        if (!model) return
        const text = model.getValueInRange(selection)
        navigator.clipboard.writeText(text).catch(() => {})
        editor.focus()
      }
    },
    {
      key: 'paste',
      label: `${t('menu.paste')} (Ctrl+V)`,
      onSelect: () => {
        const editor = editorRef.current
        if (!editor) return
        navigator.clipboard
          .readText()
          .then((text) => {
            editor.executeEdits('paste', [
              { range: editor.getSelection()!, text, forceMoveMarkers: true }
            ])
            editor.focus()
          })
          .catch(() => {})
      }
    },
    {
      key: 'selectAll',
      label: `${t('menu.selectAll')} (Ctrl+A)`,
      onSelect: () => execEditorAction('editor.action.selectAll')
    },
    { key: 'separator2', label: '---', onSelect: () => {} },
    {
      key: 'find',
      label: `${t('menu.find')} (Ctrl+F)`,
      onSelect: () => execEditorAction('actions.find')
    },
    { key: 'separator3', label: '---', onSelect: () => {} },
    {
      key: 'zen-mode',
      label: t('menu.zenMode'),
      onSelect: () => useUiStore.getState().toggleZenMode()
    }
  ]

  const handleInsertPunctuation = useCallback((symbol: string) => {
    const editor = editorRef.current
    if (!editor) return
    const selection = editor.getSelection()
    if (!selection) return

    const isPair =
      symbol.length === 2 && ['「」', '『』', '""', '（）', '【】', '《》'].includes(symbol)
    editor.executeEdits('chinese-punctuation', [
      {
        range: new monaco.Range(
          selection.startLineNumber,
          selection.startColumn,
          selection.endLineNumber,
          selection.endColumn
        ),
        text: symbol,
        forceMoveMarkers: true
      }
    ])
    editor.focus()

    if (isPair) {
      const newPos = new monaco.Position(selection.startLineNumber, selection.startColumn + 1)
      editor.setPosition(newPos)
    }
  }, [])

  const handleClosePunctuationBar = useCallback(() => {
    setPunctuationBarVisible(false)
  }, [])

  const handleCloseContextMenu = (): void => {
    setContextMenu(null)
  }

  return (
    <div
      className="plain-text-editor"
      onKeyDown={handleKeyDownOnContainer}
      onMouseDown={() => editorRef.current?.focus()}
    >
      <div
        ref={containerRef}
        className="monaco-editor-container"
        style={{ flex: 1, minHeight: 0 }}
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
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
