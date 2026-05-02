import { create } from 'zustand'
import type { ReadingOrderItem, ReadingOrderConfig } from '../models'

interface ReadingOrderState {
  // 当前项目的阅读编排列表
  items: ReadingOrderItem[]
  // 是否正在加载
  isLoading: boolean
  // 是否有未保存的更改
  hasUnsavedChanges: boolean

  // 操作
  loadReadingOrder: (projectSettingsPath: string) => Promise<void>
  saveReadingOrder: (projectSettingsPath: string) => Promise<void>
  addItem: (nodeId: string, title: string) => void
  removeItem: (id: string) => void
  moveItem: (fromIndex: number, toIndex: number) => void
  reorderItem: (id: string, direction: 'up' | 'down') => void
  clearItems: () => void
  setItems: (items: ReadingOrderItem[]) => void
}

// 生成唯一ID
const generateId = (): string => `ro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// 保存防抖定时器
let saveTimer: ReturnType<typeof setTimeout> | null = null

export const useReadingOrderStore = create<ReadingOrderState>((set, get) => ({
  items: [],
  isLoading: false,
  hasUnsavedChanges: false,

  loadReadingOrder: async (projectSettingsPath: string): Promise<void> => {
    set({ isLoading: true })
    try {
      const config = await window.api.readReadingOrder(projectSettingsPath)
      if (config && config.items) {
        set({ items: config.items, hasUnsavedChanges: false })
      } else {
        set({ items: [], hasUnsavedChanges: false })
      }
    } catch (error) {
      console.error('Failed to load reading order:', error)
      set({ items: [], hasUnsavedChanges: false })
    } finally {
      set({ isLoading: false })
    }
  },

  saveReadingOrder: async (projectSettingsPath: string): Promise<void> => {
    const { items } = get()
    try {
      const config: ReadingOrderConfig = {
        items,
        updatedAt: new Date().toISOString()
      }
      await window.api.writeReadingOrder(projectSettingsPath, config)
      set({ hasUnsavedChanges: false })
    } catch (error) {
      console.error('Failed to save reading order:', error)
      throw error
    }
  },

  addItem: (nodeId: string, title: string): void => {
    set((state) => {
      // 检查是否已存在
      if (state.items.some((item) => item.nodeId === nodeId)) {
        return state
      }
      const newItem: ReadingOrderItem = {
        id: generateId(),
        nodeId,
        title,
        order: state.items.length + 1
      }
      return {
        items: [...state.items, newItem],
        hasUnsavedChanges: true
      }
    })
  },

  removeItem: (id: string): void => {
    set((state) => {
      const newItems = state.items.filter((item) => item.id !== id)
      // 重新计算 order
      const reorderedItems = newItems.map((item, index) => ({
        ...item,
        order: index + 1
      }))
      return {
        items: reorderedItems,
        hasUnsavedChanges: true
      }
    })
  },

  moveItem: (fromIndex: number, toIndex: number): void => {
    set((state) => {
      if (
        fromIndex < 0 ||
        fromIndex >= state.items.length ||
        toIndex < 0 ||
        toIndex >= state.items.length
      ) {
        return state
      }
      const newItems = [...state.items]
      const [movedItem] = newItems.splice(fromIndex, 1)
      newItems.splice(toIndex, 0, movedItem)
      // 重新计算 order
      const reorderedItems = newItems.map((item, index) => ({
        ...item,
        order: index + 1
      }))
      return {
        items: reorderedItems,
        hasUnsavedChanges: true
      }
    })
  },

  reorderItem: (id: string, direction: 'up' | 'down'): void => {
    set((state) => {
      const index = state.items.findIndex((item) => item.id === id)
      if (index === -1) return state

      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= state.items.length) return state

      const newItems = [...state.items]
      const [movedItem] = newItems.splice(index, 1)
      newItems.splice(newIndex, 0, movedItem)

      // 重新计算 order
      const reorderedItems = newItems.map((item, idx) => ({
        ...item,
        order: idx + 1
      }))

      return {
        items: reorderedItems,
        hasUnsavedChanges: true
      }
    })
  },

  clearItems: (): void => {
    set({ items: [], hasUnsavedChanges: true })
  },

  setItems: (items: ReadingOrderItem[]): void => {
    set({ items, hasUnsavedChanges: true })
  }
}))

// 防抖保存
export const scheduleSave = (
  projectSettingsPath: string,
  delay: number = 1000
): void => {
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveTimer = setTimeout(() => {
    void useReadingOrderStore.getState().saveReadingOrder(projectSettingsPath)
  }, delay)
}

// 清除保存定时器
export const clearSaveTimer = (): void => {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
}
