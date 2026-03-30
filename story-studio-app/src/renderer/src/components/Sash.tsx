import React, { useState, useEffect } from 'react'

interface SashProps {
  onResize: (deltaX: number) => void
  side: 'left' | 'right'
  setIsDraggingGlobal: (isDragging: boolean) => void
}

const Sash: React.FC<SashProps> = ({ onResize, side, setIsDraggingGlobal }) => {
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    setIsDragging(true)
    setIsDraggingGlobal(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging) return
      // 根据侧向决定 deltaX 的方向
      const deltaX = side === 'left' ? e.movementX : -e.movementX
      onResize(deltaX)
    }

    const handleMouseUp = (): void => {
      setIsDragging(false)
      setIsDraggingGlobal(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
    } else {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, onResize, side])

  return (
    <div
      className={`sash sash-${side} ${isDragging ? 'active' : ''}`}
      onMouseDown={handleMouseDown}
    />
  )
}

export default Sash
