import { useEffect, useRef, useCallback } from 'react'
import { useStatusbar, StatusbarAlignment } from '../../contexts/StatusbarContext'
import { useEditorStore, type EditorStats } from '../../stores/editorStore'
import type { IStatusbarEntryAccessor } from '../../contexts/StatusbarContext'

// 默认空统计
const defaultStats: EditorStats = {
  chars: 0,
  words: 0,
  charsWithoutSpaces: 0,
  paragraphs: 0,
  readingTime: 0
}

export const EditorStatusBar: React.FC = () => {
  const { addEntry } = useStatusbar()
  const activeGroupId = useEditorStore((s) => s.activeGroupId)
  const getGroupEditorState = useEditorStore((s) => s.getGroupEditorState)

  const charCountAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const wordCountAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const charsWithoutSpacesAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const paragraphCountAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const readingTimeAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const lastSavedAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)

  // 更新状态栏显示
  const updateStatusBar = useCallback((groupId: string | null) => {
    const state = groupId ? getGroupEditorState(groupId) : undefined
    const stats = state?.stats ?? defaultStats
    const lastSavedAt = state?.lastSavedAt

    charCountAccessorRef.current?.update({
      text: `字符: ${stats.chars.toLocaleString()}`
    })
    wordCountAccessorRef.current?.update({
      text: `字数: ${stats.words.toLocaleString()}`
    })
    charsWithoutSpacesAccessorRef.current?.update({
      text: `净字数: ${stats.charsWithoutSpaces.toLocaleString()}`
    })
    paragraphCountAccessorRef.current?.update({
      text: `段落: ${stats.paragraphs.toLocaleString()}`
    })

    const timeText = stats.readingTime < 60
      ? `阅读: <1分钟`
      : `阅读: ${Math.ceil(stats.readingTime / 60)}分钟`
    readingTimeAccessorRef.current?.update({ text: timeText })

    if (lastSavedAt) {
      lastSavedAccessorRef.current?.update({
        text: `${lastSavedAt} 自动保存`
      })
    } else {
      lastSavedAccessorRef.current?.update({ text: '' })
    }
  }, [getGroupEditorState])

  // 注册状态栏条目
  useEffect(() => {
    charCountAccessorRef.current = addEntry(
      'editor-char-count',
      { name: '字符数', text: '字符: 0', ariaLabel: '字符统计' },
      StatusbarAlignment.RIGHT,
      100
    )

    wordCountAccessorRef.current = addEntry(
      'editor-word-count',
      { name: '字数', text: '字数: 0', ariaLabel: '字数统计' },
      StatusbarAlignment.RIGHT,
      90
    )

    charsWithoutSpacesAccessorRef.current = addEntry(
      'editor-chars-without-spaces',
      { name: '净字数', text: '净字数: 0', ariaLabel: '净字数统计' },
      StatusbarAlignment.RIGHT,
      85
    )

    paragraphCountAccessorRef.current = addEntry(
      'editor-paragraph-count',
      { name: '段落', text: '段落: 0', ariaLabel: '段落统计' },
      StatusbarAlignment.RIGHT,
      75
    )

    readingTimeAccessorRef.current = addEntry(
      'editor-reading-time',
      { name: '阅读时间', text: '阅读: <1分钟', ariaLabel: '预计阅读时间' },
      StatusbarAlignment.RIGHT,
      80
    )

    lastSavedAccessorRef.current = addEntry(
      'editor-last-saved',
      { name: '自动保存', text: '', ariaLabel: '自动保存状态' },
      StatusbarAlignment.RIGHT,
      70
    )

    return () => {
      charCountAccessorRef.current?.dispose()
      wordCountAccessorRef.current?.dispose()
      charsWithoutSpacesAccessorRef.current?.dispose()
      paragraphCountAccessorRef.current?.dispose()
      readingTimeAccessorRef.current?.dispose()
      lastSavedAccessorRef.current?.dispose()
    }
  }, [addEntry])

  // 监听活动组变化
  useEffect(() => {
    // 初始更新
    updateStatusBar(activeGroupId)

    // 订阅 store 变化
    const unsubscribe = useEditorStore.subscribe((state) => {
      updateStatusBar(state.activeGroupId)
    })

    return () => {
      unsubscribe()
    }
  }, [activeGroupId, updateStatusBar])

  return null
}
