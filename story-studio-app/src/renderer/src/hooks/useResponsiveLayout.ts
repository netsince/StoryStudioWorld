// 仅保留类型定义，Hook 功能已迁移到 layoutStore
// 注意：此文件保留以避免破坏类型导入，但 Hook 本身已不再使用

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

// @deprecated 此 Hook 已废弃，请使用 useLayoutStore 替代
export const useResponsiveLayout = (): UseResponsiveLayoutValue => {
  throw new Error('useResponsiveLayout is deprecated. Please use useLayoutStore instead.')
}
