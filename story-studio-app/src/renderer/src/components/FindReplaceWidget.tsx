import React, { useState, useEffect, useRef, useCallback } from 'react'

export interface MatchRange {
  start: number
  end: number
}

interface FindReplaceWidgetProps {
  isVisible: boolean
  onClose: () => void
  text: string
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onTextChange?: (newText: string) => void
  onMatchesChange?: (matches: MatchRange[], currentIndex: number) => void
}

type TabType = 'find' | 'replace'

const FindReplaceWidget: React.FC<FindReplaceWidgetProps> = ({
  isVisible,
  onClose,
  text,
  textareaRef,
  onTextChange,
  onMatchesChange
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('find')
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [matches, setMatches] = useState<{ start: number; end: number }[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1)
  const [matchCount, setMatchCount] = useState(0)

  const findInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  // 查找所有匹配
  const findAllMatches = useCallback((searchText: string): { start: number; end: number }[] => {
    if (!searchText) return []
    const result: { start: number; end: number }[] = []
    let index = text.toLowerCase().indexOf(searchText.toLowerCase())
    while (index !== -1) {
      result.push({ start: index, end: index + searchText.length })
      index = text.toLowerCase().indexOf(searchText.toLowerCase(), index + 1)
    }
    return result
  }, [text])

  // 更新匹配结果
  useEffect(() => {
    if (!isVisible) return

    const newMatches = findAllMatches(findText)
    setMatches(newMatches)
    setMatchCount(newMatches.length)

    if (newMatches.length > 0 && currentMatchIndex === -1) {
      setCurrentMatchIndex(0)
      highlightMatch(newMatches[0], false)
    } else if (newMatches.length === 0) {
      setCurrentMatchIndex(-1)
    } else if (currentMatchIndex >= newMatches.length) {
      setCurrentMatchIndex(newMatches.length - 1)
      highlightMatch(newMatches[newMatches.length - 1], false)
    }
  }, [findText, text, isVisible, findAllMatches, currentMatchIndex])

  // 通知父组件匹配变化
  useEffect(() => {
    onMatchesChange?.(matches, currentMatchIndex)
  }, [matches, currentMatchIndex, onMatchesChange])

  // 高亮匹配（shouldFocus 控制是否夺取焦点）
  const highlightMatch = useCallback((match: { start: number; end: number } | null, shouldFocus = false) => {
    const textarea = textareaRef.current
    if (!textarea || !match) return

    if (shouldFocus) {
      textarea.focus()
    }
    textarea.setSelectionRange(match.start, match.end)
  }, [textareaRef])

  // 上一个匹配
  const handlePrevMatch = useCallback(() => {
    if (matches.length === 0) return
    const newIndex = currentMatchIndex > 0 ? currentMatchIndex - 1 : matches.length - 1
    setCurrentMatchIndex(newIndex)
    highlightMatch(matches[newIndex], true)
  }, [matches, currentMatchIndex, highlightMatch])

  // 下一个匹配
  const handleNextMatch = useCallback(() => {
    if (matches.length === 0) return
    const newIndex = currentMatchIndex < matches.length - 1 ? currentMatchIndex + 1 : 0
    setCurrentMatchIndex(newIndex)
    highlightMatch(matches[newIndex], true)
  }, [matches, currentMatchIndex, highlightMatch])

  // 替换当前匹配
  const handleReplace = useCallback(() => {
    if (matches.length === 0 || currentMatchIndex === -1) return

    const textarea = textareaRef.current
    if (!textarea) return

    const match = matches[currentMatchIndex]
    const newText = text.substring(0, match.start) + replaceText + text.substring(match.end)

    if (onTextChange) {
      onTextChange(newText)
    }

    // 更新后重新查找
    setTimeout(() => {
      const newMatches = findAllMatches(findText)
      setMatches(newMatches)
      setMatchCount(newMatches.length)

      if (newMatches.length > 0) {
        const newIndex = Math.min(currentMatchIndex, newMatches.length - 1)
        setCurrentMatchIndex(newIndex)
        highlightMatch(newMatches[newIndex], true)
      }
    }, 0)
  }, [matches, currentMatchIndex, text, replaceText, findText, textareaRef, onTextChange, findAllMatches, highlightMatch])

  // 替换所有匹配
  const handleReplaceAll = useCallback(() => {
    if (matches.length === 0) return

    let newText = text
    // 从后向前替换，避免位置变化
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i]
      newText = newText.substring(0, match.start) + replaceText + newText.substring(match.end)
    }

    if (onTextChange) {
      onTextChange(newText)
    }

    setMatches([])
    setMatchCount(0)
    setCurrentMatchIndex(-1)
  }, [matches, text, replaceText, onTextChange])

  // 关闭时清除匹配
  useEffect(() => {
    if (!isVisible) {
      onMatchesChange?.([], -1)
    }
  }, [isVisible, onMatchesChange])

  // 键盘快捷键
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          handlePrevMatch()
        } else {
          handleNextMatch()
        }
        e.preventDefault()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, onClose, handlePrevMatch, handleNextMatch])

  // 显示时聚焦到输入框
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        if (activeTab === 'find') {
          findInputRef.current?.focus()
        } else {
          replaceInputRef.current?.focus()
        }
      }, 10)
    }
  }, [isVisible, activeTab])

  if (!isVisible) return null

  return (
    <div className="find-replace-widget">
      <div className="find-replace-tabs">
        <button
          className={`find-replace-tab ${activeTab === 'find' ? 'active' : ''}`}
          onClick={() => setActiveTab('find')}
        >
          查找
        </button>
        <button
          className={`find-replace-tab ${activeTab === 'replace' ? 'active' : ''}`}
          onClick={() => setActiveTab('replace')}
        >
          替换
        </button>
      </div>

      <div className="find-replace-content">
        <div className="find-replace-row">
          <input
            ref={findInputRef}
            type="text"
            className="find-replace-input"
            placeholder="查找"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
          />
          {matchCount > 0 && (
            <span className="find-replace-count">
              {currentMatchIndex + 1} / {matchCount}
            </span>
          )}
        </div>

        {activeTab === 'replace' && (
          <div className="find-replace-row">
            <input
              ref={replaceInputRef}
              type="text"
              className="find-replace-input"
              placeholder="替换为"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
            />
          </div>
        )}

        <div className="find-replace-actions">
          <button
            className="find-replace-btn"
            onClick={handlePrevMatch}
            disabled={matchCount === 0}
            title="上一个 (Shift+Enter)"
          >
            ← 上一个
          </button>
          <button
            className="find-replace-btn"
            onClick={handleNextMatch}
            disabled={matchCount === 0}
            title="下一个 (Enter)"
          >
            下一个 →
          </button>

          {activeTab === 'replace' && (
            <>
              <button
                className="find-replace-btn"
                onClick={handleReplace}
                disabled={matchCount === 0}
              >
                替换
              </button>
              <button
                className="find-replace-btn"
                onClick={handleReplaceAll}
                disabled={matchCount === 0}
              >
                全部替换
              </button>
            </>
          )}

          <button
            className="find-replace-btn close-btn"
            onClick={onClose}
            title="关闭 (Esc)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

export default FindReplaceWidget
