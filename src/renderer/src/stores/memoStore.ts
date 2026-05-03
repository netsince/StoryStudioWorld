import { create } from 'zustand'
import type { Memo } from '../../../main/memo'

interface MemoState {
  // 便签列表
  memos: Memo[]
  // 当前正在编辑的便签ID
  editingId: string | null
  // 是否正在加载
  isLoading: boolean

  // Actions
  loadMemos: () => Promise<void>
  createMemo: () => Promise<void>
  updateMemo: (id: string, content: string) => Promise<void>
  deleteMemo: (id: string) => Promise<void>
  startEditing: (id: string) => void
  stopEditing: () => void
}

export const useMemoStore = create<MemoState>((set, _get) => ({
  memos: [],
  editingId: null,
  isLoading: false,

  loadMemos: async () => {
    set({ isLoading: true })
    try {
      const memos = await window.api.getAllMemos()
      set({ memos, isLoading: false })
    } catch (error) {
      console.error('Failed to load memos:', error)
      set({ isLoading: false })
    }
  },

  createMemo: async () => {
    try {
      const newMemo = await window.api.createMemo('')
      set((state) => ({
        memos: [newMemo, ...state.memos],
        editingId: newMemo.id
      }))
    } catch (error) {
      console.error('Failed to create memo:', error)
    }
  },

  updateMemo: async (id: string, content: string) => {
    try {
      const updatedMemo = await window.api.updateMemo(id, content)
      if (updatedMemo) {
        set((state) => ({
          memos: state.memos.map((m) => (m.id === id ? updatedMemo : m)),
          editingId: null
        }))
      }
    } catch (error) {
      console.error('Failed to update memo:', error)
    }
  },

  deleteMemo: async (id: string) => {
    try {
      const success = await window.api.deleteMemo(id)
      if (success) {
        set((state) => ({
          memos: state.memos.filter((m) => m.id !== id),
          editingId: state.editingId === id ? null : state.editingId
        }))
      }
    } catch (error) {
      console.error('Failed to delete memo:', error)
    }
  },

  startEditing: (id: string) => {
    set({ editingId: id })
  },

  stopEditing: () => {
    set({ editingId: null })
  }
}))
