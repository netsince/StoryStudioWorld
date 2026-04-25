import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export interface StoryNode {
  id: string
  parentId: string | null
  name: string
  type: 'folder' | 'file'
  kind: 'story' | 'setting'
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
  kind?: 'story' | 'setting'
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

export interface ProofreadResult {
  issues: {
    id: string
    type: 'spelling' | 'grammar' | 'style' | 'duplicate' | 'punctuation'
    message: string
    suggestion: string
    start: number
    end: number
    line: number
    column: number
    severity: 'error' | 'warning' | 'info'
  }[]
  stats: {
    totalIssues: number
    errorCount: number
    warningCount: number
    infoCount: number
  }
}

export interface Memo {
  id: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface Snapshot {
  id: string
  name: string
  description: string | null
  createdAt: string
  nodeCount: number
  storyCount: number
  settingCount: number
  nodes: StoryNode[]
}

export interface DiffNode {
  id: string
  name: string
  type: 'folder' | 'file'
  kind: 'story' | 'setting'
  before?: StoryNode
  after?: StoryNode
}

export interface DiffResult {
  story: {
    added: DiffNode[]
    modified: DiffNode[]
    deleted: DiffNode[]
  }
  setting: {
    added: DiffNode[]
    modified: DiffNode[]
    deleted: DiffNode[]
  }
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
  initSettingNodes: (projectSettingsPath: string): Promise<StoryNode[]> =>
    ipcRenderer.invoke('init-setting-nodes', projectSettingsPath),
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
  getArchivedNodes: (projectSettingsPath: string): Promise<StoryNode[]> =>
    ipcRenderer.invoke('get-archived-nodes', projectSettingsPath),
  restoreArchivedNode: (projectSettingsPath: string, nodeId: string, newParentId: string | null = null): Promise<StoryNode[]> =>
    ipcRenderer.invoke('restore-archived-node', projectSettingsPath, nodeId, newParentId),
  permanentlyDeleteNode: (input: DeleteNodeInput): Promise<StoryNode[]> =>
    ipcRenderer.invoke('permanently-delete-node', input),
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
  setFullScreen: (fullScreen: boolean): void =>
    ipcRenderer.send('window-set-fullscreen', fullScreen),
  isFullScreen: (): Promise<boolean> => ipcRenderer.invoke('window-is-fullscreen'),
  proofreadText: (text: string): Promise<ProofreadResult> =>
    ipcRenderer.invoke('proofread-text', text),
  // Memo APIs
  getAllMemos: (): Promise<Memo[]> => ipcRenderer.invoke('get-all-memos'),
  createMemo: (content?: string): Promise<Memo> => ipcRenderer.invoke('create-memo', content ?? ''),
  updateMemo: (id: string, content: string): Promise<Memo | null> =>
    ipcRenderer.invoke('update-memo', id, content),
  deleteMemo: (id: string): Promise<boolean> => ipcRenderer.invoke('delete-memo', id),
  // Snapshot APIs
  createSnapshot: (projectSettingsPath: string, name: string, description?: string): Promise<Snapshot> =>
    ipcRenderer.invoke('create-snapshot', projectSettingsPath, name, description),
  getAllSnapshots: (projectSettingsPath: string): Promise<Snapshot[]> =>
    ipcRenderer.invoke('get-all-snapshots', projectSettingsPath),
  deleteSnapshot: (projectSettingsPath: string, snapshotId: string): Promise<boolean> =>
    ipcRenderer.invoke('delete-snapshot', projectSettingsPath, snapshotId),
  restoreSnapshot: (projectSettingsPath: string, snapshotId: string): Promise<boolean> =>
    ipcRenderer.invoke('restore-snapshot', projectSettingsPath, snapshotId),
  compareWithCurrent: (projectSettingsPath: string, snapshotId: string): Promise<DiffResult | null> =>
    ipcRenderer.invoke('compare-with-current', projectSettingsPath, snapshotId)
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
