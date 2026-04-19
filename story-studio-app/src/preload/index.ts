import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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

const api = {
  minimize: (): void => ipcRenderer.send('window-minimize'),
  maximize: (): void => ipcRenderer.send('window-maximize'),
  close: (): void => ipcRenderer.send('window-close'),
  openProject: (): Promise<string | null> => ipcRenderer.invoke('open-project-dialog'),
  pickProjectPath: (): Promise<string | null> => ipcRenderer.invoke('pick-project-path-dialog'),
  loadProject: (projectSettingsPath: string): Promise<ProjectData> =>
    ipcRenderer.invoke('load-project', projectSettingsPath),
  createProject: (input: CreateProjectInput): Promise<ProjectData> =>
    ipcRenderer.invoke('create-project', input),
  getProjectNodes: (projectSettingsPath: string): Promise<StoryNode[]> =>
    ipcRenderer.invoke('get-project-nodes', projectSettingsPath),
  createStoryNode: (input: CreateNodeInput): Promise<StoryNode[]> =>
    ipcRenderer.invoke('create-story-node', input),
  renameStoryNode: (input: RenameNodeInput): Promise<StoryNode[]> =>
    ipcRenderer.invoke('rename-story-node', input),
  deleteStoryNode: (input: DeleteNodeInput): Promise<StoryNode[]> =>
    ipcRenderer.invoke('delete-story-node', input),
  moveStoryNode: (input: MoveNodeInput): Promise<StoryNode[]> =>
    ipcRenderer.invoke('move-story-node', input),
  reorderStoryNode: (input: ReorderNodeInput): Promise<StoryNode[]> =>
    ipcRenderer.invoke('reorder-story-node', input),
  readNodeContent: (projectSettingsPath: string, nodeId: string): Promise<string | null> =>
    ipcRenderer.invoke('read-node-content', projectSettingsPath, nodeId),
  writeNodeContent: (projectSettingsPath: string, nodeId: string, content: string): Promise<void> =>
    ipcRenderer.invoke('write-node-content', projectSettingsPath, nodeId, content),
  getAppVersion: (): Promise<{
    version: string
    electron: string
    chrome: string
    node: string
    v8: string
    platform: string
  }> => ipcRenderer.invoke('get-app-version'),
  toggleDevTools: (): void => ipcRenderer.send('toggle-devtools'),
  openNewWindow: (): void => ipcRenderer.send('open-new-window'),
  setFullScreen: (fullScreen: boolean): void => ipcRenderer.send('window-set-fullscreen', fullScreen),
  isFullScreen: (): Promise<boolean> => ipcRenderer.invoke('window-is-fullscreen')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
