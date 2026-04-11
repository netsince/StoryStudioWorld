import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface RenameDialogProps {
  title: string
  initialValue: string
  onCancel: () => void
  onConfirm: (nextValue: string) => void
}

const RenameDialog: React.FC<RenameDialogProps> = ({
  title,
  initialValue,
  onCancel,
  onConfirm
}) => {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        onConfirm(value)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, onConfirm, value])

  const dialog = (
    <div className="ssw-modal-overlay" onMouseDown={onCancel}>
      <div className="ssw-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ssw-modal-title">{title}</div>
        <input
          ref={inputRef}
          className="ssw-modal-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="ssw-modal-actions">
          <button className="action-button secondary inline-button" onMouseDown={onCancel}>
            取消
          </button>
          <button className="action-button inline-button" onMouseDown={() => onConfirm(value)}>
            确定
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}

export default RenameDialog
