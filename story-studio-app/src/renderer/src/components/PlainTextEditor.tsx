import React, { useState, useEffect } from 'react'

interface PlainTextEditorProps {
  content: string
  onChange: (content: string) => void
  onSave?: () => void
  placeholder?: string
}

const PlainTextEditor: React.FC<PlainTextEditorProps> = ({
  content,
  onChange,
  onSave,
  placeholder = '开始写作...'
}) => {
  const [text, setText] = useState(content || '')

  useEffect(() => {
    if (content !== text) {
      setText(content || '')
    }
  }, [content])

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

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  const charCount = text.length

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
      <div className="plain-text-editor-stats">
        <span>字数: {charCount}</span>
        <span>词数: {wordCount}</span>
      </div>
    </div>
  )
}

export default PlainTextEditor
