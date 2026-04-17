import React, { useState, useEffect, useRef } from 'react'
import { useStatusbar, StatusbarAlignment, type IStatusbarEntryAccessor } from '../contexts/StatusbarContext'

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

  useEffect(() => {
    if (content !== text) {
      setText(content || '')
    }
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
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      if (onSave) {
        onSave()
      }
    }
  }

  return (
    <div className="plain-text-editor">
      <textarea
        className="plain-text-editor-textarea"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        autoFocus
      />
    </div>
  )
}

export default PlainTextEditor
