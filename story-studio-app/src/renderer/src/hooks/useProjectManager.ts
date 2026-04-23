import { useCallback, useState } from 'react'
import type { ProjectData, RecentProject, StoryNode } from '../models'
import { LAST_PROJECT_SETTINGS_PATH_KEY } from '../constants/storage'

export interface CreateProjectInput {
  projectName: string
  description: string
  projectPath: string
}

export interface UseProjectManagerOptions {
  onError?: (message: string) => void
}

export interface UseProjectManagerValue {
  currentProject: ProjectData | null
  storyNodes: StoryNode[]
  recentProjects: RecentProject[]
  errorMessage: string | null
  isProjectBusy: boolean

  openProject: () => Promise<void>
  openRecentProject: (projectSettingsPath: string) => Promise<void>
  loadProject: (projectSettingsPath: string, showAlert?: boolean) => Promise<boolean>
  createProject: (input: CreateProjectInput) => Promise<void>

  createStoryNode: (parentId: string | null, name: string, type: 'folder' | 'file') => Promise<void>
  renameStoryNode: (nodeId: string, newName: string) => Promise<void>
  deleteStoryNode: (nodeId: string) => Promise<void>
  moveStoryNode: (nodeId: string, newParentId: string | null) => Promise<void>
  reorderStoryNode: (
    nodeId: string,
    targetNodeId: string,
    position: 'before' | 'after'
  ) => Promise<void>

  saveNodeContent: (nodeId: string, content: string) => Promise<void>
  clearLastProjectMarker: () => void
  lastProjectMarker: () => string | null
  markLastProject: (projectSettingsPath: string) => void
}

export const useProjectManager = (
  onProjectLoaded?: (project: ProjectData) => void,
  options?: UseProjectManagerOptions
): UseProjectManagerValue => {
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null)
  const [storyNodes, setStoryNodes] = useState<StoryNode[]>([])
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isProjectBusy, setIsProjectBusy] = useState(false)

  const loadStoryNodes = useCallback(async (projectSettingsPath: string): Promise<void> => {
    try {
      const nodes = await window.api.getProjectNodes(projectSettingsPath)
      setStoryNodes(nodes)
    } catch (error) {
      console.error('Failed to load story nodes:', error)
    }
  }, [])

  const updateRecentProjects = useCallback((project: ProjectData): void => {
    setRecentProjects((prev) => {
      const next = [
        { projectSettingsPath: project.projectSettingsPath, name: project.projectName },
        ...prev
      ]
      const deduped = next.filter(
        (item, index) =>
          next.findIndex(
            (candidate) => candidate.projectSettingsPath === item.projectSettingsPath
          ) === index
      )
      return deduped.slice(0, 8)
    })
  }, [])

  const handleProjectLoaded = useCallback(
    (project: ProjectData): void => {
      setCurrentProject(project)
      setErrorMessage(null)
      window.localStorage.setItem(LAST_PROJECT_SETTINGS_PATH_KEY, project.projectSettingsPath)
      updateRecentProjects(project)
      void loadStoryNodes(project.projectSettingsPath)
      onProjectLoaded?.(project)
    },
    [loadStoryNodes, updateRecentProjects, onProjectLoaded]
  )

  const loadProject = useCallback(
    async (projectSettingsPath: string): Promise<boolean> => {
      try {
        setIsProjectBusy(true)
        const project = await window.api.loadProject(projectSettingsPath)
        handleProjectLoaded(project)
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : '打开项目失败。'
        setErrorMessage(message)
        options?.onError?.(message)
        return false
      } finally {
        setIsProjectBusy(false)
      }
    },
    [handleProjectLoaded, options]
  )

  const openProject = useCallback(async (): Promise<void> => {
    const projectSettingsPath = await window.api.openProject()
    if (projectSettingsPath) {
      await loadProject(projectSettingsPath)
    }
  }, [loadProject])

  const openRecentProject = useCallback(
    async (projectSettingsPath: string): Promise<void> => {
      await loadProject(projectSettingsPath)
    },
    [loadProject]
  )

  const createProject = useCallback(
    async (input: CreateProjectInput): Promise<void> => {
      try {
        setIsProjectBusy(true)
        const project = await window.api.createProject(input)
        handleProjectLoaded(project)
      } catch (error) {
        const message = error instanceof Error ? error.message : '创建项目失败。'
        setErrorMessage(message)
        options?.onError?.(message)
        throw error
      } finally {
        setIsProjectBusy(false)
      }
    },
    [handleProjectLoaded, options]
  )

  const createStoryNode = useCallback(
    async (parentId: string | null, name: string, type: 'folder' | 'file'): Promise<void> => {
      if (!currentProject) return

      try {
        setIsProjectBusy(true)
        const nodes = await window.api.createStoryNode({
          projectSettingsPath: currentProject.projectSettingsPath,
          parentId,
          name,
          type
        })
        setStoryNodes(nodes)
      } catch (error) {
        const message = error instanceof Error ? error.message : '创建失败。'
        setErrorMessage(message)
        options?.onError?.(message)
      } finally {
        setIsProjectBusy(false)
      }
    },
    [currentProject, options]
  )

  const renameStoryNode = useCallback(
    async (nodeId: string, newName: string): Promise<void> => {
      if (!currentProject) return

      try {
        setIsProjectBusy(true)
        const nodes = await window.api.renameStoryNode({
          projectSettingsPath: currentProject.projectSettingsPath,
          nodeId,
          newName
        })
        setStoryNodes(nodes)
      } catch (error) {
        const message = error instanceof Error ? error.message : '重命名失败。'
        setErrorMessage(message)
        options?.onError?.(message)
      } finally {
        setIsProjectBusy(false)
      }
    },
    [currentProject, options]
  )

  const deleteStoryNode = useCallback(
    async (nodeId: string): Promise<void> => {
      if (!currentProject) return

      try {
        setIsProjectBusy(true)
        const nodes = await window.api.deleteStoryNode({
          projectSettingsPath: currentProject.projectSettingsPath,
          nodeId
        })
        setStoryNodes(nodes)
      } catch (error) {
        const message = error instanceof Error ? error.message : '删除失败。'
        setErrorMessage(message)
        options?.onError?.(message)
      } finally {
        setIsProjectBusy(false)
      }
    },
    [currentProject, options]
  )

  const moveStoryNode = useCallback(
    async (nodeId: string, newParentId: string | null): Promise<void> => {
      if (!currentProject) return

      try {
        setIsProjectBusy(true)
        const nodes = await window.api.moveStoryNode({
          projectSettingsPath: currentProject.projectSettingsPath,
          nodeId,
          newParentId
        })
        setStoryNodes(nodes)
      } catch (error) {
        const message = error instanceof Error ? error.message : '移动失败。'
        setErrorMessage(message)
        options?.onError?.(message)
      } finally {
        setIsProjectBusy(false)
      }
    },
    [currentProject, options]
  )

  const reorderStoryNode = useCallback(
    async (nodeId: string, targetNodeId: string, position: 'before' | 'after'): Promise<void> => {
      if (!currentProject) return

      try {
        setIsProjectBusy(true)
        const nodes = await window.api.reorderStoryNode({
          projectSettingsPath: currentProject.projectSettingsPath,
          nodeId,
          targetNodeId,
          position
        })
        setStoryNodes(nodes)
      } catch (error) {
        const message = error instanceof Error ? error.message : '排序失败。'
        setErrorMessage(message)
        options?.onError?.(message)
      } finally {
        setIsProjectBusy(false)
      }
    },
    [currentProject, options]
  )

  const saveNodeContent = useCallback(
    async (nodeId: string, content: string): Promise<void> => {
      if (!currentProject) return

      try {
        await window.api.writeNodeContent(currentProject.projectSettingsPath, nodeId, content)
      } catch (error) {
        const message = error instanceof Error ? error.message : '保存失败。'
        setErrorMessage(message)
        options?.onError?.(message)
      }
    },
    [currentProject, options]
  )

  const lastProjectMarker = useCallback(
    (): string | null => window.localStorage.getItem(LAST_PROJECT_SETTINGS_PATH_KEY),
    []
  )

  const markLastProject = useCallback((projectSettingsPath: string): void => {
    window.localStorage.setItem(LAST_PROJECT_SETTINGS_PATH_KEY, projectSettingsPath)
  }, [])

  const clearLastProjectMarker = useCallback((): void => {
    window.localStorage.removeItem(LAST_PROJECT_SETTINGS_PATH_KEY)
  }, [])

  return {
    currentProject,
    storyNodes,
    recentProjects,
    errorMessage,
    isProjectBusy,
    openProject,
    openRecentProject,
    loadProject,
    createProject,
    createStoryNode,
    renameStoryNode,
    deleteStoryNode,
    moveStoryNode,
    reorderStoryNode,
    saveNodeContent,
    clearLastProjectMarker,
    lastProjectMarker,
    markLastProject
  }
}
