import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      minimize: () => void
      maximize: () => void
      close: () => void
      openProject: () => Promise<string | null>
      pickProjectPath: () => Promise<string | null>
      loadProject: (projectSettingsPath: string) => Promise<ProjectData>
      createProject: (input: CreateProjectInput) => Promise<ProjectData>
      getProjectNodes: (projectSettingsPath: string) => Promise<StoryNode[]>
      createStoryNode: (input: CreateNodeInput) => Promise<StoryNode[]>
      renameStoryNode: (input: RenameNodeInput) => Promise<StoryNode[]>
      deleteStoryNode: (input: DeleteNodeInput) => Promise<StoryNode[]>
      moveStoryNode: (input: MoveNodeInput) => Promise<StoryNode[]>
      reorderStoryNode: (input: ReorderNodeInput) => Promise<StoryNode[]>
      readNodeContent: (projectSettingsPath: string, nodeId: string) => Promise<string | null>
      writeNodeContent: (projectSettingsPath: string, nodeId: string, content: string) => Promise<void>
    }
  }
}

export interface StoryNode {
  id: string
  parentId: string | null
  name: string
  type: 'folder' | 'file'
  fileName: string | null
  content: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface ProjectData {
  version: number
  projectName: string
  description: string
  projectPath: string
  projectSettingsPath: string
  storyDbPath: string
}

export interface CreateProjectInput {
  projectName: string
  description: string
  projectPath: string
}

export interface CreateNodeInput {
  projectSettingsPath: string
  parentId: string | null
  name: string
  type: 'folder' | 'file'
}

export interface RenameNodeInput {
  projectSettingsPath: string
  nodeId: string
  newName: string
}

export interface DeleteNodeInput {
  projectSettingsPath: string
  nodeId: string
}

export interface MoveNodeInput {
  projectSettingsPath: string
  nodeId: string
  newParentId: string | null
}

export interface ReorderNodeInput {
  projectSettingsPath: string
  nodeId: string
  targetNodeId: string
  position: 'before' | 'after'
}
