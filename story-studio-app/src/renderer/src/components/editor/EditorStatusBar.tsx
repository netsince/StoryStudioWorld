import { useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useStatusbar, StatusbarAlignment } from '../../contexts/StatusbarContext'
import { useEditorStore, type EditorStats } from '../../stores/editorStore'
import type { IStatusbarEntryAccessor } from '../../contexts/StatusbarContext'

const defaultStats: EditorStats = {
  chars: 0,
  words: 0,
  charsWithoutSpaces: 0,
  paragraphs: 0,
  readingTime: 0
}

export const EditorStatusBar: React.FC = () => {
  const { t } = useTranslation()
  const { addEntry } = useStatusbar()
  const activeGroupId = useEditorStore((s) => s.activeGroupId)
  const getGroupEditorState = useEditorStore((s) => s.getGroupEditorState)

  const charCountAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const wordCountAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const charsWithoutSpacesAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const paragraphCountAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const readingTimeAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const lastSavedAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)

  const updateStatusBar = useCallback(
    (groupId: string | null) => {
      const state = groupId ? getGroupEditorState(groupId) : undefined
      const stats = state?.stats ?? defaultStats
      const lastSavedAt = state?.lastSavedAt

      charCountAccessorRef.current?.update({
        text: `${t('statusBar.chars')}: ${stats.chars.toLocaleString()}`
      })
      wordCountAccessorRef.current?.update({
        text: `${t('statusBar.words')}: ${stats.words.toLocaleString()}`
      })
      charsWithoutSpacesAccessorRef.current?.update({
        text: `${t('statusBar.charsWithoutSpaces')}: ${stats.charsWithoutSpaces.toLocaleString()}`
      })
      paragraphCountAccessorRef.current?.update({
        text: `${t('statusBar.paragraphs')}: ${stats.paragraphs.toLocaleString()}`
      })

      const timeText =
        stats.readingTime < 60 
          ? `${t('statusBar.reading')}: <1${t('statusBar.minutes')}` 
          : `${t('statusBar.reading')}: ${Math.ceil(stats.readingTime / 60)}${t('statusBar.minutes')}`
      readingTimeAccessorRef.current?.update({ text: timeText })

      if (lastSavedAt) {
        lastSavedAccessorRef.current?.update({
          text: `${lastSavedAt} ${t('statusBar.autoSaved')}`
        })
      } else {
        lastSavedAccessorRef.current?.update({ text: '' })
      }
    },
    [getGroupEditorState, t]
  )

  useEffect(() => {
    charCountAccessorRef.current = addEntry(
      'editor-char-count',
      { name: t('statusBar.charCount'), text: `${t('statusBar.chars')}: 0`, ariaLabel: t('statusBar.charCountLabel') },
      StatusbarAlignment.RIGHT,
      100
    )

    wordCountAccessorRef.current = addEntry(
      'editor-word-count',
      { name: t('statusBar.wordCount'), text: `${t('statusBar.words')}: 0`, ariaLabel: t('statusBar.wordCountLabel') },
      StatusbarAlignment.RIGHT,
      90
    )

    charsWithoutSpacesAccessorRef.current = addEntry(
      'editor-chars-without-spaces',
      { name: t('statusBar.charsWithoutSpacesCount'), text: `${t('statusBar.charsWithoutSpaces')}: 0`, ariaLabel: t('statusBar.charsWithoutSpacesLabel') },
      StatusbarAlignment.RIGHT,
      85
    )

    paragraphCountAccessorRef.current = addEntry(
      'editor-paragraph-count',
      { name: t('statusBar.paragraphCount'), text: `${t('statusBar.paragraphs')}: 0`, ariaLabel: t('statusBar.paragraphCountLabel') },
      StatusbarAlignment.RIGHT,
      75
    )

    readingTimeAccessorRef.current = addEntry(
      'editor-reading-time',
      { name: t('statusBar.readingTime'), text: `${t('statusBar.reading')}: <1${t('statusBar.minutes')}`, ariaLabel: t('statusBar.readingTimeLabel') },
      StatusbarAlignment.RIGHT,
      80
    )

    lastSavedAccessorRef.current = addEntry(
      'editor-last-saved',
      { name: t('statusBar.autoSave'), text: '', ariaLabel: t('statusBar.autoSaveLabel') },
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
  }, [addEntry, t])

  useEffect(() => {
    updateStatusBar(activeGroupId)

    const unsubscribe = useEditorStore.subscribe((state) => {
      updateStatusBar(state.activeGroupId)
    })

    return () => {
      unsubscribe()
    }
  }, [activeGroupId, updateStatusBar])

  return null
}
