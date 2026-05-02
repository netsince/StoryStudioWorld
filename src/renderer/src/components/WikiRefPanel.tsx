import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { StoryNode } from '../models'
import { useEditorStore } from '../stores/editorStore'
import { buildNodeDisplayPath } from '../utils/nodeUtils'
import { useTranslation } from 'react-i18next'

export interface WikiRefItem {
  node: StoryNode
  path: string
}

interface WikiRefPanelProps {
  items: WikiRefItem[]
  title: string
  is404?: boolean
  onSelect: (item: WikiRefItem) => void
  onClose: () => void
}

const WikiRefPanel: React.FC<WikiRefPanelProps> = ({ items, title, is404, onSelect, onClose }) => {
  const { t } = useTranslation()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1 < items.length ? prev + 1 : prev))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
          break
        case 'Enter':
          if (items[selectedIndex]) {
            onSelect(items[selectedIndex])
          }
          break
      }
    },
    [items, selectedIndex, onSelect, onClose]
  )

  useEffect(() => {
    if (listRef.current && items.length > 0) {
      const el = listRef.current.children[selectedIndex] as HTMLElement
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex, items.length])

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 999999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '80px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '500px',
          maxWidth: '95vw',
          backgroundColor: 'var(--panel-bg, #252526)',
          borderRadius: '4px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '10px 12px',
            borderBottom: '1px solid var(--border-color, #454545)',
            fontSize: '13px',
            color: is404 ? '#e74c3c' : 'var(--foreground, #ccc)',
            fontWeight: 500
          }}
        >
          {title}
        </div>
        <div ref={listRef} style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
          {items.length === 0 && is404 && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#e74c3c', fontSize: '12px' }}>
              404 — {t('exportWiki.refNotFound')}
            </div>
          )}
          {items.map((item, index) => (
            <div
              key={item.node.id}
              onClick={() => onSelect(item)}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                backgroundColor:
                  index === selectedIndex
                    ? 'var(--list-active-selection-bg, #04395e)'
                    : 'transparent',
                color:
                  index === selectedIndex
                    ? 'var(--list-active-selection-fg, #fff)'
                    : 'var(--foreground, #ccc)',
                borderBottom: '1px solid var(--border-subtle, #2a2a2a)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                {item.node.kind === 'setting' ? (
                  <path
                    d="M8 1l2.5 5 5.5 1-4 4 1 5.5L8 13l-5 3.5 1-5.5-4-4 5.5-1L8 1z"
                    fill="#DCAD5A"
                  />
                ) : (
                  <path
                    d="M3.5 1h5.79l3.21 3.21V14.5a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 3.5 1z"
                    fill="#75BEFF"
                    fillOpacity="0.6"
                  />
                )}
              </svg>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500 }}>{item.node.name}</span>
                <span
                  style={{
                    fontSize: '11px',
                    color:
                      index === selectedIndex
                        ? 'var(--list-active-selection-fg-muted, #b0b0b0)'
                        : 'var(--foreground-muted, #858585)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {item.path}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            padding: '6px 12px',
            backgroundColor: 'var(--panel-bg-secondary, #1e1e1e)',
            borderTop: '1px solid var(--border-color, #454545)',
            display: 'flex',
            gap: '12px',
            fontSize: '11px',
            color: 'var(--foreground-muted, #858585)',
            flexShrink: 0
          }}
        >
          <span>↑↓ {t('quickOpen.navigate', '导航')}</span>
          <span>↵ {t('quickOpen.open', '打开')}</span>
          <span>Esc {t('quickOpen.close', '关闭')}</span>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default WikiRefPanel
