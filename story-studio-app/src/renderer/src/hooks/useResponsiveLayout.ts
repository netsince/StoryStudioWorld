import { useEffect, useMemo, useState } from 'react'

export type LayoutSize = 'tiny' | 'narrow' | 'compact' | 'default'

export interface UseResponsiveLayoutValue {
  layoutSize: LayoutSize
  explorerWidth: number
  rightPanelWidth: number
  isDragging: boolean
  setIsDragging: (value: boolean) => void
  handleExplorerResize: (deltaX: number) => void
  handleRightPanelResize: (deltaX: number) => void
}

export const useResponsiveLayout = (
  isRightSidebarOpen: boolean,
  closeRightSidebar: () => void
): UseResponsiveLayoutValue => {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )
  const [explorerWidth, setExplorerWidth] = useState(280)
  const [rightPanelWidth, setRightPanelWidth] = useState(300)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const handleResize = (): void => {
      const newWidth = window.innerWidth
      setViewportWidth(newWidth)

      const maxAllowedWidth = Math.floor(newWidth * 0.35) // Max 35% of viewport each
      setExplorerWidth((prev) => Math.min(prev, Math.max(220, maxAllowedWidth)))
      setRightPanelWidth((prev) => Math.min(prev, Math.max(150, maxAllowedWidth)))

      if (newWidth < 900 && isRightSidebarOpen) {
        closeRightSidebar()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [isRightSidebarOpen, closeRightSidebar])

  const layoutSize = useMemo<LayoutSize>(() => {
    if (viewportWidth <= 720) return 'tiny'
    if (viewportWidth <= 900) return 'narrow'
    if (viewportWidth <= 1200) return 'compact'
    return 'default'
  }, [viewportWidth])

  const handleExplorerResize = (deltaX: number): void => {
    const currentViewportWidth = window.innerWidth
    const maxAllowedWidth = Math.floor(currentViewportWidth * 0.35)
    setExplorerWidth((prev) => Math.max(220, Math.min(maxAllowedWidth, prev + deltaX)))
  }

  const handleRightPanelResize = (deltaX: number): void => {
    const currentViewportWidth = window.innerWidth
    const maxAllowedWidth = Math.floor(currentViewportWidth * 0.35)
    setRightPanelWidth((prev) => Math.max(150, Math.min(maxAllowedWidth, prev + deltaX)))
  }

  return {
    layoutSize,
    explorerWidth,
    rightPanelWidth,
    isDragging,
    setIsDragging,
    handleExplorerResize,
    handleRightPanelResize
  }
}
