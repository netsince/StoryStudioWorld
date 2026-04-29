import { create } from 'zustand'
import type { LayoutSize } from '../hooks/useResponsiveLayout'
import { useUiStore } from './uiStore'

interface LayoutState {
  viewportWidth: number
  explorerWidth: number
  rightPanelWidth: number
  isDragging: boolean

  layoutSize: LayoutSize

  setIsDragging: (value: boolean) => void
  handleExplorerResize: (deltaX: number) => void
  handleRightPanelResize: (deltaX: number) => void
  startWindowResizeListener: () => () => void
}

const getLayoutSize = (viewportWidth: number): LayoutSize => {
  if (viewportWidth <= 720) return 'tiny'
  if (viewportWidth <= 900) return 'narrow'
  if (viewportWidth <= 1200) return 'compact'
  return 'default'
}

let windowResizeCleanup: (() => void) | null = null

export const useLayoutStore = create<LayoutState>((set) => ({
  viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
  explorerWidth: 280,
  rightPanelWidth: 300,
  isDragging: false,
  layoutSize: getLayoutSize(typeof window !== 'undefined' ? window.innerWidth : 1200),

  setIsDragging: (value) => set({ isDragging: value }),

  handleExplorerResize: (deltaX) => {
    const currentViewportWidth = window.innerWidth
    const maxAllowedWidth = Math.floor(currentViewportWidth * 0.35)
    set((state) => ({
      explorerWidth: Math.max(220, Math.min(maxAllowedWidth, state.explorerWidth + deltaX))
    }))
  },

  handleRightPanelResize: (deltaX) => {
    const currentViewportWidth = window.innerWidth
    const maxAllowedWidth = Math.floor(currentViewportWidth * 0.35)
    set((state) => ({
      rightPanelWidth: Math.max(150, Math.min(maxAllowedWidth, state.rightPanelWidth + deltaX))
    }))
  },

  startWindowResizeListener: () => {
    if (windowResizeCleanup) return windowResizeCleanup

    const onResize = (): void => {
      const newWidth = window.innerWidth
      const maxAllowedWidth = Math.floor(newWidth * 0.35)

      set((state) => ({
        viewportWidth: newWidth,
        layoutSize: getLayoutSize(newWidth),
        explorerWidth: Math.min(state.explorerWidth, Math.max(220, maxAllowedWidth)),
        rightPanelWidth: Math.min(state.rightPanelWidth, Math.max(150, maxAllowedWidth))
      }))

      const ui = useUiStore.getState()
      if (newWidth < 900 && ui.isRightSidebarOpen) {
        ui.setRightSidebarOpen(false)
      }
    }

    window.addEventListener('resize', onResize)
    windowResizeCleanup = () => {
      window.removeEventListener('resize', onResize)
      windowResizeCleanup = null
    }

    // Run once to normalize widths/layout size based on current viewport.
    onResize()
    return windowResizeCleanup
  }
}))
