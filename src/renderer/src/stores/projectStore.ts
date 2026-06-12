import { create } from 'zustand'
import type { ProjectData, RecentProject, StoryNode } from '../models'
import { LAST_PROJECT_SETTINGS_PATH_KEY } from '../constants/storage'
import { useEditorStore } from './editorStore'
import { useReadingOrderStore } from './readingOrderStore'
import i18n from '../i18n'

export interface CreateProjectInput {
  projectName: string
  description: string
  projectPath: string
}

interface ProjectState {
  currentProject: ProjectData | null
  storyNodes: StoryNode[]
  archivedNodes: StoryNode[]
  recentProjects: RecentProject[]
  errorMessage: string | null
  isProjectBusy: boolean
  draftsByNodeId: Record<string, string>

  restoreLastProjectOrWelcome: () => Promise<void>
  loadProject: (projectSettingsPath: string, showAlert?: boolean) => Promise<boolean>
  openProject: () => Promise<void>
  openRecentProject: (projectSettingsPath: string) => Promise<void>
  createProject: (input: CreateProjectInput) => Promise<void>

  createStoryNode: (
    parentId: string | null,
    name: string,
    type: 'folder' | 'file',
    kind?: 'story' | 'setting'
  ) => Promise<void>
  initSettingNodes: () => Promise<void>
  renameStoryNode: (nodeId: string, newName: string) => Promise<void>
  deleteStoryNode: (nodeId: string) => Promise<void>
  moveStoryNode: (nodeId: string, newParentId: string | null) => Promise<void>
  reorderStoryNode: (
    nodeId: string,
    targetNodeId: string,
    position: 'before' | 'after'
  ) => Promise<void>
  refreshStoryNodes: () => Promise<void>
  refreshArchivedNodes: () => Promise<void>
  restoreArchivedNode: (nodeId: string, newParentId: string | null) => Promise<void>
  permanentlyDeleteNode: (nodeId: string) => Promise<void>

  saveNodeContent: (nodeId: string, content: string) => Promise<void>
  setDraft: (nodeId: string, content: string) => void
  clearDraft: (nodeId: string) => void

  lastProjectMarker: () => string | null
  clearLastProjectMarker: () => void
}

let isRestoring = false

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
      const next = [
        { projectSettingsPath: project.projectSettingsPath, name: project.projectName },
        ...state.recentProjects
      ]
      const deduped = next.filter(
        (item, index) =>
          next.findIndex(
            (candidate) => candidate.projectSettingsPath === item.projectSettingsPath
          ) === index
      )
      return { recentProjects: deduped.slice(0, 8) }
    })
  }

  const handleProjectLoaded = (project: ProjectData): void => {
    set({ currentProject: project, errorMessage: null, draftsByNodeId: {} })
    window.localStorage.setItem(LAST_PROJECT_SETTINGS_PATH_KEY, project.projectSettingsPath)
    updateRecentProjects(project)
    void loadStoryNodes(project.projectSettingsPath).then(() => {
      void get().initSettingNodes()
    })
    // 加载阅读编排数据
    void useReadingOrderStore.getState().loadReadingOrder(project.projectSettingsPath)
    useEditorStore.getState().removeCreateProjectTabs()
  }

  return {
    currentProject: null,
    storyNodes: [],
    archivedNodes: [],
    recentProjects: [],
    errorMessage: null,
    isProjectBusy: false,
    draftsByNodeId: {},

    lastProjectMarker: () => window.localStorage.getItem(LAST_PROJECT_SETTINGS_PATH_KEY),
    clearLastProjectMarker: () => window.localStorage.removeItem(LAST_PROJECT_SETTINGS_PATH_KEY),

    restoreLastProjectOrWelcome: async () => {
      if (isRestoring) return
      isRestoring = true
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
        const message = error instanceof Error ? error.message : i18n.t('errors.openProjectFailed')
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
        const project = await window.api.createProject({
          ...input,
          defaultStoryName: i18n.t('project.defaultStoryName')
        })
        handleProjectLoaded(project)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : i18n.t('errors.createProjectFailed')
        set({ errorMessage: message })
        window.alert(message)
        throw error
      } finally {
        set({ isProjectBusy: false })
      }
    },

    createStoryNode: async (parentId, name, type, kind = 'story') => {
      const currentProject = get().currentProject
      if (!currentProject) return

      try {
        set({ isProjectBusy: true })
        const nodes = await window.api.createStoryNode({
          projectSettingsPath: currentProject.projectSettingsPath,
          parentId,
          name,
          type,
          kind
        })
        set({ storyNodes: nodes })
      } catch (error) {
        const message = error instanceof Error ? error.message : i18n.t('errors.createFailed')
        set({ errorMessage: message })
        window.alert(message)
      } finally {
        set({ isProjectBusy: false })
      }
    },

    initSettingNodes: async () => {
      const currentProject = get().currentProject
      if (!currentProject) return

      try {
        set({ isProjectBusy: true })
        const nodes = await window.api.initSettingNodes(currentProject.projectSettingsPath)
        set({ storyNodes: nodes })
      } catch (error) {
        const message = error instanceof Error ? error.message : i18n.t('errors.initSettingFailed')
        set({ errorMessage: message })
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
        const message = error instanceof Error ? error.message : i18n.t('errors.renameFailed')
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
        const message = error instanceof Error ? error.message : i18n.t('errors.deleteFailed')
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
        const message = error instanceof Error ? error.message : i18n.t('errors.moveFailed')
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
        const message = error instanceof Error ? error.message : i18n.t('errors.reorderFailed')
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
        const message = error instanceof Error ? error.message : i18n.t('errors.refreshFailed')
        set({ errorMessage: message })
        window.alert(message)
      } finally {
        set({ isProjectBusy: false })
      }
    },

    refreshArchivedNodes: async () => {
      const currentProject = get().currentProject
      if (!currentProject) return

      try {
        set({ isProjectBusy: true })
        const nodes = await window.api.getArchivedNodes(currentProject.projectSettingsPath)
        set({ archivedNodes: nodes })
      } catch (error) {
        const message = error instanceof Error ? error.message : i18n.t('errors.archiveLoadFailed')
        set({ errorMessage: message })
        window.alert(message)
      } finally {
        set({ isProjectBusy: false })
      }
    },

    restoreArchivedNode: async (nodeId, newParentId) => {
      const currentProject = get().currentProject
      if (!currentProject) return

      try {
        set({ isProjectBusy: true })
        const nodes = await window.api.restoreArchivedNode(
          currentProject.projectSettingsPath,
          nodeId,
          newParentId
        )
        set({ storyNodes: nodes })
        await get().refreshArchivedNodes()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : i18n.t('errors.archiveRestoreFailed')
        set({ errorMessage: message })
        window.alert(message)
      } finally {
        set({ isProjectBusy: false })
      }
    },

    permanentlyDeleteNode: async (nodeId) => {
      const currentProject = get().currentProject
      if (!currentProject) return

      try {
        set({ isProjectBusy: true })
        const nodes = await window.api.permanentlyDeleteNode({
          projectSettingsPath: currentProject.projectSettingsPath,
          nodeId
        })
        set({ storyNodes: nodes })
        await get().refreshArchivedNodes()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : i18n.t('errors.permanentDeleteFailed')
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
        // 更新节点的时间戳，触发 UI 刷新
        set((state) => ({
          storyNodes: state.storyNodes.map((n) =>
            n.id === nodeId ? { ...n, updatedAt: new Date().toISOString() } : n
          )
        }))
      } catch (error) {
        const message = error instanceof Error ? error.message : i18n.t('errors.saveFailed')
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
