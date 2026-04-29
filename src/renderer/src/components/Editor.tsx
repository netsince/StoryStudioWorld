import React, { useEffect, useRef, useState } from 'react'
import type { EditorNode } from '../models'
import EditorGroup from './editor/EditorGroup'
import { useEditorStore } from '../stores/editorStore'

const SplitDivider: React.FC<{
  direction: 'row' | 'column'
  splitId: string
  ratio: number
  onResize: (splitId: string, ratio: number) => void
}> = ({ direction, splitId, ratio, onResize }) => {
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startClient: number; startRatio: number; size: number } | null>(null)
  const cursor = direction === 'row' ? 'col-resize' : 'row-resize'

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent): void => {
      if (!isDragging || !dragRef.current) return
      const client = direction === 'row' ? event.clientX : event.clientY
      const delta = client - dragRef.current.startClient
      const next = dragRef.current.startRatio + delta / dragRef.current.size
      onResize(splitId, next)
    }

    const handleMouseUp = (): void => {
      setIsDragging(false)
      dragRef.current = null
      document.body.style.cursor = ''
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = cursor
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [cursor, direction, isDragging, onResize, splitId])

  return (
    <div
      className={`editor-split-divider editor-split-divider-${direction} ${isDragging ? 'active' : ''}`}
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const parent = (event.currentTarget.parentElement as HTMLElement | null) ?? undefined
        const rect = parent?.getBoundingClientRect()
        const size = rect ? (direction === 'row' ? rect.width : rect.height) : 0
        if (!size) return
        dragRef.current = {
          startClient: direction === 'row' ? event.clientX : event.clientY,
          startRatio: ratio,
          size
        }
        setIsDragging(true)
      }}
      style={{ cursor }}
    />
  )
}

const Editor: React.FC = () => {
  const editorTree = useEditorStore((s) => s.editorTree)
  const onResizeSplit = useEditorStore((s) => s.resizeSplit)

  const renderNode = (node: EditorNode): React.ReactNode => {
    if (node.kind === 'group') {
      return <EditorGroup groupId={node.id} />
    }

    return (
      <div className={`editor-split editor-split-${node.direction}`}>
        <div className="editor-split-child" style={{ flex: `${node.ratio} 1 0%` }}>
          {renderNode(node.first)}
        </div>
        <SplitDivider
          direction={node.direction}
          splitId={node.id}
          ratio={node.ratio}
          onResize={onResizeSplit}
        />
        <div className="editor-split-child" style={{ flex: `${1 - node.ratio} 1 0%` }}>
          {renderNode(node.second)}
        </div>
      </div>
    )
  }

  return <div className="editor-area editor-split-root">{renderNode(editorTree)}</div>
}

export default Editor
