import { create } from 'zustand'

interface ChapterMetaState {
  // 当前章节ID
  currentNodeId: string | null
  // 当前章节的简概
  summary: string
  // 当前章节的章纲
  outline: string
  // 是否正在加载
  isLoading: boolean
  // 是否有未保存的更改
  hasUnsavedChanges: boolean

  // Actions
  loadChapterMeta: (projectSettingsPath: string, nodeId: string) => Promise<void>
  saveChapterMeta: (projectSettingsPath: string) => Promise<void>
  setSummary: (summary: string) => void
  setOutline: (outline: string) => void
  clearCurrentChapter: () => void
}

// 用于防抖保存的定时器
let saveTimer: number | null = null
// 用于处理竞态条件的请求ID
let requestId = 0

export const useChapterMetaStore = create<ChapterMetaState>((set, get) => ({
  currentNodeId: null,
  summary: '',
  outline: '',
  isLoading: false,
  hasUnsavedChanges: false,

  loadChapterMeta: async (projectSettingsPath: string, nodeId: string) => {
    const state = get()

    // 如果节点ID没有变化，不需要重新加载
    if (nodeId === state.currentNodeId) {
      return
    }

    // 如果有未保存的更改，先保存当前章节
    if (state.hasUnsavedChanges && state.currentNodeId) {
      if (saveTimer) {
        window.clearTimeout(saveTimer)
        saveTimer = null
      }
      try {
        await window.api.updateNodeSummaryAndOutline(
          projectSettingsPath,
          state.currentNodeId,
          state.summary,
          state.outline
        )
      } catch (error) {
        console.error('Failed to save previous chapter meta:', error)
      }
    }

    // 生成新的请求ID
    const currentRequestId = ++requestId

    set({ isLoading: true, currentNodeId: nodeId, hasUnsavedChanges: false })

    try {
      const result = await window.api.getNodeSummaryAndOutline(projectSettingsPath, nodeId)

      // 检查请求是否仍然有效（如果不是最新请求，忽略结果）
      if (currentRequestId !== requestId) {
        console.log('Ignoring stale chapter meta response')
        return
      }

      set({
        summary: result.summary || '',
        outline: result.outline || '',
        isLoading: false
      })
    } catch (error) {
      console.error('Failed to load chapter meta:', error)
      if (currentRequestId === requestId) {
        set({ summary: '', outline: '', isLoading: false })
      }
    }
  },

  saveChapterMeta: async (projectSettingsPath: string) => {
    const state = get()
    if (!state.currentNodeId) return

    if (saveTimer) {
      window.clearTimeout(saveTimer)
      saveTimer = null
    }

    try {
      await window.api.updateNodeSummaryAndOutline(
        projectSettingsPath,
        state.currentNodeId,
        state.summary,
        state.outline
      )
      set({ hasUnsavedChanges: false })
    } catch (error) {
      console.error('Failed to save chapter meta:', error)
    }
  },

  setSummary: (summary: string) => {
    set({ summary, hasUnsavedChanges: true })
  },

  setOutline: (outline: string) => {
    set({ outline, hasUnsavedChanges: true })
  },

  clearCurrentChapter: () => {
    if (saveTimer) {
      window.clearTimeout(saveTimer)
      saveTimer = null
    }
    set({
      currentNodeId: null,
      summary: '',
      outline: '',
      hasUnsavedChanges: false
    })
  }
}))

// 导出工具函数供组件使用
export const scheduleSave = (
  projectSettingsPath: string,
  nodeId: string,
  summary: string,
  outline: string
): void => {
  if (saveTimer) {
    window.clearTimeout(saveTimer)
  }

  saveTimer = window.setTimeout(() => {
    void window.api.updateNodeSummaryAndOutline(projectSettingsPath, nodeId, summary, outline)
    saveTimer = null
  }, 1000)
}

export const clearSaveTimer = (): void => {
  if (saveTimer) {
    window.clearTimeout(saveTimer)
    saveTimer = null
  }
}
