import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isDanger?: boolean
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDanger = false
}) => {
  const { t } = useTranslation()
  const _confirmText = confirmText || t('common.confirm')
  const _cancelText = cancelText || t('common.cancel')

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.isComposing) return
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel, onConfirm])

  if (!isOpen) return null

  return createPortal(
    <div className="ssw-modal-overlay" onClick={onCancel}>
      <div className="ssw-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ssw-modal-title">{title}</div>
        <div className="ssw-modal-body" style={{ color: 'var(--text-main)', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
          {message}
        </div>
        <div className="ssw-modal-actions">
          <button className="action-button secondary inline-button" onClick={onCancel}>
            {_cancelText}
          </button>
          <button
            className={`action-button inline-button ${isDanger ? 'danger' : ''}`}
            onClick={onConfirm}
            autoFocus
          >
            {_confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ConfirmModal
