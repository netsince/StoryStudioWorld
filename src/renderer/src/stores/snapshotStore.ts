import { create } from 'zustand'
import type { Snapshot, DiffResult } from '../../../main/snapshot'

interface SnapshotState {
  // 快照列表
  snapshots: Snapshot[]
  // 是否正在加载
  isLoading: boolean
  // 当前选中的快照ID（用于对比）
  selectedSnapshotId: string | null
  // 当前显示的diff结果
  currentDiff: DiffResult | null
  // 当前对比的快照ID
  diffSnapshotId: string | null
  // 是否显示创建快照弹窗
  isCreateModalOpen: boolean

  // Actions
  loadSnapshots: (projectSettingsPath: string) => Promise<void>
  createSnapshot: (projectSettingsPath: string, name: string, description?: string) => Promise<void>
  deleteSnapshot: (projectSettingsPath: string, snapshotId: string) => Promise<void>
  restoreSnapshot: (projectSettingsPath: string, snapshotId: string) => Promise<boolean>
  compareWithCurrent: (projectSettingsPath: string, snapshotId: string) => Promise<void>
  clearDiff: () => void
  openCreateModal: () => void
  closeCreateModal: () => void
  selectSnapshot: (id: string | null) => void
}

export const useSnapshotStore = create<SnapshotState>((set, get) => ({
  snapshots: [],
  isLoading: false,
  selectedSnapshotId: null,
  currentDiff: null,
  diffSnapshotId: null,
  isCreateModalOpen: false,

  loadSnapshots: async (projectSettingsPath: string) => {
    set({ isLoading: true })
    try {
      const snapshots = await window.api.getAllSnapshots(projectSettingsPath)
      set({ snapshots, isLoading: false })
    } catch (error) {
      console.error('Failed to load snapshots:', error)
      set({ isLoading: false })
    }
  },

  createSnapshot: async (projectSettingsPath: string, name: string, description?: string) => {
    try {
      const newSnapshot = await window.api.createSnapshot(projectSettingsPath, name, description)
      set((state) => ({
        snapshots: [newSnapshot, ...state.snapshots],
        isCreateModalOpen: false
      }))
    } catch (error) {
      console.error('Failed to create snapshot:', error)
    }
  },

  deleteSnapshot: async (projectSettingsPath: string, snapshotId: string) => {
    try {
      const success = await window.api.deleteSnapshot(projectSettingsPath, snapshotId)
      if (success) {
        set((state) => ({
          snapshots: state.snapshots.filter((s) => s.id !== snapshotId),
          selectedSnapshotId: state.selectedSnapshotId === snapshotId ? null : state.selectedSnapshotId
        }))
      }
    } catch (error) {
      console.error('Failed to delete snapshot:', error)
    }
  },

  restoreSnapshot: async (projectSettingsPath: string, snapshotId: string): Promise<boolean> => {
    try {
      const success = await window.api.restoreSnapshot(projectSettingsPath, snapshotId)
      if (success) {
        // 恢复后清除diff，因为当前状态已经改变
        set({ currentDiff: null, diffSnapshotId: null })
      }
      return success
    } catch (error) {
      console.error('Failed to restore snapshot:', error)
      return false
    }
  },

  compareWithCurrent: async (projectSettingsPath: string, snapshotId: string) => {
    set({ isLoading: true })
    try {
      const diff = await window.api.compareWithCurrent(projectSettingsPath, snapshotId)
      if (diff) {
        set({
          currentDiff: diff,
          diffSnapshotId: snapshotId,
          isLoading: false
        })
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      console.error('Failed to compare snapshots:', error)
      set({ isLoading: false })
    }
  },

  clearDiff: () => {
    set({ currentDiff: null, diffSnapshotId: null })
  },

  openCreateModal: () => {
    set({ isCreateModalOpen: true })
  },

  closeCreateModal: () => {
    set({ isCreateModalOpen: false })
  },

  selectSnapshot: (id: string | null) => {
    set({ selectedSnapshotId: id })
  }
}))
