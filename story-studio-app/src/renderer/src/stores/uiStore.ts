import { create } from 'zustand'
import type { ActivityType, RightActivityType } from '../models'

interface UiState {
  activeActivity: ActivityType
  activeRightActivity: RightActivityType
  isExplorerOpen: boolean
  isRightSidebarOpen: boolean
  isZenMode: boolean

  setExplorerOpen: (isOpen: boolean) => void
  setRightSidebarOpen: (isOpen: boolean) => void
  toggleZenMode: () => void
  setZenMode: (isZen: boolean) => void

  handleActivityChange: (activity: ActivityType) => void
  handleRightActivityChange: (activity: RightActivityType) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  activeActivity: 'chapter',
  activeRightActivity: 'proofread',
  isExplorerOpen: true,
  isRightSidebarOpen: false,
  isZenMode: false,

  setExplorerOpen: (isOpen) => set({ isExplorerOpen: isOpen }),
  setRightSidebarOpen: (isOpen) => set({ isRightSidebarOpen: isOpen }),

  toggleZenMode: () => {
    const newZenMode = !get().isZenMode
    window.api?.setFullScreen?.(newZenMode)
    set({ isZenMode: newZenMode })
  },
  setZenMode: (isZen) => {
    window.api?.setFullScreen?.(isZen)
    set({ isZenMode: isZen })
  },

  handleActivityChange: (activity) => {
    const { activeActivity, isExplorerOpen } = get()
    if (activeActivity === activity) {
      set({ isExplorerOpen: !isExplorerOpen })
    } else {
      set({ activeActivity: activity, isExplorerOpen: true })
    }
  },

  handleRightActivityChange: (activity) => {
    const { activeRightActivity, isRightSidebarOpen } = get()
    if (activeRightActivity === activity) {
      set({ isRightSidebarOpen: !isRightSidebarOpen })
    } else {
      set({ activeRightActivity: activity, isRightSidebarOpen: true })
    }
  }
}))
