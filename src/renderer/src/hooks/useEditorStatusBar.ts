import { useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useStatusbar, StatusbarAlignment } from '../contexts/StatusbarContext'
import type { IStatusbarEntryAccessor } from '../contexts/StatusbarContext'
import type { EditorStats } from '../stores/editorStore'

export interface EditorStatusBarController {
  updateStats: (stats: EditorStats) => void
  updateLastSaved: (lastSavedAt: string | null) => void
  clear: () => void
}

export const useEditorStatusBar = (isActive: boolean): EditorStatusBarController => {
  const { t } = useTranslation()
  const { addEntry } = useStatusbar()

  const charCountAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const wordCountAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const charsWithoutSpacesAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const paragraphCountAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const readingTimeAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)
  const lastSavedAccessorRef = useRef<IStatusbarEntryAccessor | null>(null)

  const isInitializedRef = useRef(false)

  const initEntries = useCallback(() => {
    if (isInitializedRef.current) return

    charCountAccessorRef.current = addEntry(
      'editor-char-count',
      { name: t('statusBar.charCount'), text: '', ariaLabel: t('statusBar.charCountLabel') },
      StatusbarAlignment.RIGHT,
      100
    )

    wordCountAccessorRef.current = addEntry(
      'editor-word-count',
      { name: t('statusBar.wordCount'), text: '', ariaLabel: t('statusBar.wordCountLabel') },
      StatusbarAlignment.RIGHT,
      90
    )

    charsWithoutSpacesAccessorRef.current = addEntry(
      'editor-chars-without-spaces',
      {
        name: t('statusBar.charsWithoutSpacesCount'),
        text: '',
        ariaLabel: t('statusBar.charsWithoutSpacesLabel')
      },
      StatusbarAlignment.RIGHT,
      85
    )

    paragraphCountAccessorRef.current = addEntry(
      'editor-paragraph-count',
      {
        name: t('statusBar.paragraphCount'),
        text: '',
        ariaLabel: t('statusBar.paragraphCountLabel')
      },
      StatusbarAlignment.RIGHT,
      75
    )

    readingTimeAccessorRef.current = addEntry(
      'editor-reading-time',
      { name: t('statusBar.readingTime'), text: '', ariaLabel: t('statusBar.readingTimeLabel') },
      StatusbarAlignment.RIGHT,
      80
    )

    lastSavedAccessorRef.current = addEntry(
      'editor-last-saved',
      { name: t('statusBar.autoSave'), text: '', ariaLabel: t('statusBar.autoSaveLabel') },
      StatusbarAlignment.RIGHT,
      70
    )

    isInitializedRef.current = true
  }, [addEntry, t])

  const clearEntries = useCallback(() => {
    charCountAccessorRef.current?.dispose()
    wordCountAccessorRef.current?.dispose()
    charsWithoutSpacesAccessorRef.current?.dispose()
    paragraphCountAccessorRef.current?.dispose()
    readingTimeAccessorRef.current?.dispose()
    lastSavedAccessorRef.current?.dispose()

    charCountAccessorRef.current = null
    wordCountAccessorRef.current = null
    charsWithoutSpacesAccessorRef.current = null
    paragraphCountAccessorRef.current = null
    readingTimeAccessorRef.current = null
    lastSavedAccessorRef.current = null

    isInitializedRef.current = false
  }, [])

  const updateStats = useCallback(
    (stats: EditorStats) => {
      if (!isInitializedRef.current) return

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
    },
    [t]
  )

  const updateLastSaved = useCallback(
    (lastSavedAt: string | null) => {
      if (!isInitializedRef.current) return

      if (lastSavedAt) {
        lastSavedAccessorRef.current?.update({
          text: `${lastSavedAt} ${t('statusBar.autoSaved')}`
        })
      } else {
        lastSavedAccessorRef.current?.update({ text: '' })
      }
    },
    [t]
  )

  useEffect(() => {
    if (isActive) {
      initEntries()
    }

    return () => {
      clearEntries()
    }
  }, [isActive, initEntries, clearEntries])

  return {
    updateStats,
    updateLastSaved,
    clear: clearEntries
  }
}
