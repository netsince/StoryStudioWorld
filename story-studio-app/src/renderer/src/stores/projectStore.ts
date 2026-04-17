import { create } from 'zustand'
import type { ProjectData, RecentProject, StoryNode } from '../models'
import { LAST_PROJECT_SETTINGS_PATH_KEY } from '../constants/storage'
import { useEditorStore } from './editorStore'

export interface CreateProjectInput {
  projectName: string
  description: string
  projectPath: string
}

interface ProjectState {
  currentProject: ProjectData | null
  storyNodes: StoryNode[]
  recentProjects: RecentProject[]
  errorMessage: string | null
  isProjectBusy: boolean
  draftsByNodeId: Record<string, string>

  restoreLastProjectOrWelcome: () => Promise<void>
  loadProject: (projectSettingsPath: string, showAlert?: boolean) => Promise<boolean>
  openProject: () => Promise<void>
  openRecentProject: (projectSettingsPath: string) => Promise<void>
  createProject: (input: CreateProjectInput) => Promise<void>

  createStoryNode: (parentId: string | null, name: string, type: 'folder' | 'file') => Promise<void>
  renameStoryNode: (nodeId: string, newName: string) => Promise<void>
  deleteStoryNode: (nodeId: string) => Promise<void>
  moveStoryNode: (nodeId: string, newParentId: string | null) => Promise<void>
  reorderStoryNode: (nodeId: string, targetNodeId: string, position: 'before' | 'after') => Promise<void>
  refreshStoryNodes: () => Promise<void>

  saveNodeContent: (nodeId: string, content: string) => Promise<void>
  setDraft: (nodeId: string, content: string) => void
  clearDraft: (nodeId: string) => void

  lastProjectMarker: () => string | null
  clearLastProjectMarker: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => {
  const loadStoryNodes = async (projectSettingsPath: string): Promise<void> => {
    try {
      const nodes = await window.api.getProjectNodes(projectSettingsPath)
      set({ storyNodes: nodes })
    } catch (error) {
      console.error('Failed to load story nodes:', error)
    }
  }

  const updateRecentProjects = (project: ProjectData): void => {
    set((state) => {
      const next = [{ projectSettingsPath: project.projectSettingsPath, name: project.projectName }, ...state.recentProjects]
      const deduped = next.filter(
        (item, index) => next.findIndex((candidate) => candidate.projectSettingsPath === item.projectSettingsPath) === index
      )
      return { recentProjects: deduped.slice(0, 8) }
    })
  }

  const handleProjectLoaded = (project: ProjectData): void => {
    set({ currentProject: project, errorMessage: null, draftsByNodeId: {} })
    window.localStorage.setItem(LAST_PROJECT_SETTINGS_PATH_KEY, project.projectSettingsPath)
    updateRecentProjects(project)
    void loadStoryNodes(project.projectSettingsPath)
    useEditorStore.getState().removeCreateProjectTabs()
  }

  return {
    currentProject: null,
    storyNodes: [],
    recentProjects: [],
    errorMessage: null,
    isProjectBusy: false,
    draftsByNodeId: {},

    lastProjectMarker: () => window.localStorage.getItem(LAST_PROJECT_SETTINGS_PATH_KEY),
    clearLastProjectMarker: () => window.localStorage.removeItem(LAST_PROJECT_SETTINGS_PATH_KEY),

    restoreLastProjectOrWelcome: async () => {
      const lastProjectSettingsPath = get().lastProjectMarker()
      if (lastProjectSettingsPath) {
        const loaded = await get().loadProject(lastProjectSettingsPath, false)
        if (loaded) return
        get().clearLastProjectMarker()
      }
      useEditorStore.getState().openWelcomeTab()
    },

    loadProject: async (projectSettingsPath: string, showAlert = true) => {
      try {
        set({ isProjectBusy: true })
        const project = await window.api.loadProject(projectSettingsPath)
        handleProjectLoaded(project)
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : '打开项目失败。'
        set({ errorMessage: message })
        if (showAlert) {
          window.alert(message)
        }
        return false
      } finally {
        set({ isProjectBusy: false })
      }
    },

    openProject: async () => {
      const projectSettingsPath = await window.api.openProject()
      if (projectSettingsPath) {
        await get().loadProject(projectSettingsPath)
      }
    },

    openRecentProject: async (projectSettingsPath: string) => {
      await get().loadProject(projectSettingsPath)
    },

    createProject: async (input: CreateProjectInput) => {
      try {
        set({ isProjectBusy: true })
        const project = await window.api.createProject(input)
        handleProjectLoaded(project)
      } catch (error) {
        const message = error instanceof Error ? error.message : '创建项目失败。'
        set({ errorMessage: message })
        window.alert(message)
        throw error
      } finally {
        set({ isProjectBusy: false })
      }
    },

    createStoryNode: async (parentId, name, type) => {
      const currentProject = get().currentProject
      if (!currentProject) return

      try {
        set({ isProjectBusy: true })
        const nodes = await window.api.createStoryNode({
          projectSettingsPath: currentProject.projectSettingsPath,
          parentId,
          name,
          type
        })
        set({ storyNodes: nodes })
      } catch (error) {
        const message = error instanceof Error ? error.message : '创建失败。'
        set({ errorMessage: message })
        window.alert(message)
      } finally {
        set({ isProjectBusy: false })
      }
    },

    renameStoryNode: async (nodeId, newName) => {
      const currentProject = get().currentProject
      if (!currentProject) return

      try {
        set({ isProjectBusy: true })
        const nodes = await window.api.renameStoryNode({
          projectSettingsPath: currentProject.projectSettingsPath,
          nodeId,
          newName
        })
        set({ storyNodes: nodes })
      } catch (error) {
        const message = error instanceof Error ? error.message : '重命名失败。'
        set({ errorMessage: message })
        window.alert(message)
      } finally {
        set({ isProjectBusy: false })
      }
    },

    deleteStoryNode: async (nodeId) => {
      const currentProject = get().currentProject
      if (!currentProject) return

      try {
        set({ isProjectBusy: true })
        const nodes = await window.api.deleteStoryNode({
          projectSettingsPath: currentProject.projectSettingsPath,
          nodeId
        })
        set({ storyNodes: nodes })
      } catch (error) {
        const message = error instanceof Error ? error.message : '删除失败。'
        set({ errorMessage: message })
        window.alert(message)
      } finally {
        set({ isProjectBusy: false })
      }
    },

    moveStoryNode: async (nodeId, newParentId) => {
      const currentProject = get().currentProject
      if (!currentProject) return

      try {
        set({ isProjectBusy: true })
        const nodes = await window.api.moveStoryNode({
          projectSettingsPath: currentProject.projectSettingsPath,
          nodeId,
          newParentId
        })
        set({ storyNodes: nodes })
      } catch (error) {
        const message = error instanceof Error ? error.message : '移动失败。'
        set({ errorMessage: message })
        window.alert(message)
      } finally {
        set({ isProjectBusy: false })
      }
    },

    reorderStoryNode: async (nodeId, targetNodeId, position) => {
      const currentProject = get().currentProject
      if (!currentProject) return

      try {
        set({ isProjectBusy: true })
        const nodes = await window.api.reorderStoryNode({
          projectSettingsPath: currentProject.projectSettingsPath,
          nodeId,
          targetNodeId,
          position
        })
        set({ storyNodes: nodes })
      } catch (error) {
        const message = error instanceof Error ? error.message : '排序失败。'
        set({ errorMessage: message })
        window.alert(message)
      } finally {
        set({ isProjectBusy: false })
      }
    },

    refreshStoryNodes: async () => {
      const currentProject = get().currentProject
      if (!currentProject) return

      try {
        set({ isProjectBusy: true })
        await loadStoryNodes(currentProject.projectSettingsPath)
      } catch (error) {
        const message = error instanceof Error ? error.message : '刷新失败。'
        set({ errorMessage: message })
        window.alert(message)
      } finally {
        set({ isProjectBusy: false })
      }
    },

    saveNodeContent: async (nodeId, content) => {
      const currentProject = get().currentProject
      if (!currentProject) return

      try {
        await window.api.writeNodeContent(currentProject.projectSettingsPath, nodeId, content)
      } catch (error) {
        const message = error instanceof Error ? error.message : '保存失败。'
        window.alert(message)
      }
    },

    setDraft: (nodeId, content) =>
      set((state) => ({ draftsByNodeId: { ...state.draftsByNodeId, [nodeId]: content } })),
    clearDraft: (nodeId) =>
      set((state) => {
        if (!(nodeId in state.draftsByNodeId)) return state
        const next = { ...state.draftsByNodeId }
        delete next[nodeId]
        return { draftsByNodeId: next }
      })
  }
})
