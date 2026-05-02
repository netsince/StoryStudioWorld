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
  summary: string | null
  outline: string | null
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

export interface PluginManifest {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  main: string
  contributes?: {
    commands?: Array<{ id: string; title: string }>
    activityBar?: Array<{ id: string; title: string; icon?: string }>
    rightActivityBar?: Array<{ id: string; title: string; icon?: string }>
  }
}

export interface PluginInfo {
  manifest: PluginManifest
  path: string
  mainPath: string
  enabled: boolean
}

export interface PluginSettings {
  enabledPlugins: string[]
  disabledPlugins: string[]
  /** 标记用户是否已经明确配置过插件（用于首次启动判断） */
  hasExplicitConsent: boolean
}

export interface ReadingOrderItem {
  id: string
  nodeId: string
  title: string
  order: number
}

export interface ReadingOrderConfig {
  items: ReadingOrderItem[]
  updatedAt: string
}

export interface ExportStoryInput {
  projectSettingsPath: string
  format: 'txt' | 'md' | 'pdf' | 'epub' | 'docx'
  mode: 'single' | 'readingOrder'
  nodeId: string | null
  fileName: string
}

export interface ExportStoryResult {
  success: boolean
  filePath?: string
  error?: string
}

export interface PluginFetchResponse {
  ok: boolean
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
}

export interface PluginFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: string
  timeout?: number
}

export interface PluginExecResult {
  stdout: string
  stderr: string
  error?: string
}

export interface PluginFetchStreamCallbacks {
  onStart?: (info: { ok: boolean; status: number; statusText: string; headers: Record<string, string> }) => void
  onChunk?: (chunk: string) => void
  onError?: (error: { message: string }) => void
  onEnd?: () => void
}

export interface PluginFetchStreamOptions extends PluginFetchOptions {
  streamId?: string
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
  getNodeSummaryAndOutline: (projectSettingsPath: string, nodeId: string): Promise<{ summary: string | null; outline: string | null }> =>
    ipcRenderer.invoke('get-node-summary-and-outline', projectSettingsPath, nodeId),
  updateNodeSummaryAndOutline: (projectSettingsPath: string, nodeId: string, summary: string, outline: string): Promise<void> =>
    ipcRenderer.invoke('update-node-summary-and-outline', projectSettingsPath, nodeId, summary, outline),
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
    ipcRenderer.invoke('compare-with-current', projectSettingsPath, snapshotId),
  // Plugin APIs
  getPlugins: (): Promise<PluginInfo[]> => ipcRenderer.invoke('get-plugins'),
  getPluginSettings: (): Promise<PluginSettings> => ipcRenderer.invoke('get-plugin-settings'),
  setPluginEnabled: (pluginId: string, enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke('set-plugin-enabled', pluginId, enabled),
  getPluginDir: (): Promise<string> => ipcRenderer.invoke('get-plugin-dir'),
  openPluginsFolder: (): void => ipcRenderer.send('open-plugins-folder'),
  readPluginFile: (filePath: string): Promise<{ success: boolean; content?: string; error?: string }> =>
    ipcRenderer.invoke('read-plugin-file', filePath),
  // Reading Order APIs
  readReadingOrder: (projectSettingsPath: string): Promise<ReadingOrderConfig | null> =>
    ipcRenderer.invoke('read-reading-order', projectSettingsPath),
  writeReadingOrder: (projectSettingsPath: string, config: ReadingOrderConfig): Promise<void> =>
    ipcRenderer.invoke('write-reading-order', projectSettingsPath, config),
  // Export Story API
  exportStory: (input: ExportStoryInput): Promise<ExportStoryResult> =>
    ipcRenderer.invoke('export-story', input),
  // Plugin Native APIs
  pluginNative: {
    fetch: (url: string, options?: PluginFetchOptions): Promise<PluginFetchResponse> =>
      ipcRenderer.invoke('plugin-native:fetch', url, options),
    fetchStream: (
      url: string,
      callbacks: PluginFetchStreamCallbacks,
      options?: PluginFetchStreamOptions
    ): { abort: () => void; streamId: string } => {
      const streamId = options?.streamId || `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      const startHandler = (_: unknown, info: { ok: boolean; status: number; statusText: string; headers: Record<string, string> }) => {
        callbacks.onStart?.(info)
      }
      const chunkHandler = (_: unknown, data: { chunk: string }) => {
        callbacks.onChunk?.(data.chunk)
      }
      const errorHandler = (_: unknown, error: { message: string }) => {
        callbacks.onError?.(error)
        cleanup()
      }
      const endHandler = () => {
        callbacks.onEnd?.()
        cleanup()
      }

      const cleanup = () => {
        ipcRenderer.removeListener(`plugin-native:fetchStream:${streamId}:start`, startHandler)
        ipcRenderer.removeListener(`plugin-native:fetchStream:${streamId}:chunk`, chunkHandler)
        ipcRenderer.removeListener(`plugin-native:fetchStream:${streamId}:error`, errorHandler)
        ipcRenderer.removeListener(`plugin-native:fetchStream:${streamId}:end`, endHandler)
      }

      ipcRenderer.on(`plugin-native:fetchStream:${streamId}:start`, startHandler)
      ipcRenderer.on(`plugin-native:fetchStream:${streamId}:chunk`, chunkHandler)
      ipcRenderer.on(`plugin-native:fetchStream:${streamId}:error`, errorHandler)
      ipcRenderer.on(`plugin-native:fetchStream:${streamId}:end`, endHandler)

      ipcRenderer.invoke('plugin-native:fetchStream', streamId, url, options).catch((err) => {
        callbacks.onError?.({ message: err.message || String(err) })
        cleanup()
      })

      return {
        abort: () => {
          ipcRenderer.invoke('plugin-native:fetchStreamAbort', streamId)
          cleanup()
        },
        streamId
      }
    },
    readFile: (path: string, encoding?: BufferEncoding): Promise<{ success: boolean; content?: string; error?: string }> =>
      ipcRenderer.invoke('plugin-native:readFile', path, encoding),
    writeFile: (path: string, content: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('plugin-native:writeFile', path, content),
    exists: (path: string): Promise<boolean> =>
      ipcRenderer.invoke('plugin-native:exists', path),
    mkdir: (path: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('plugin-native:mkdir', path),
    readdir: (path: string): Promise<{ success: boolean; entries?: string[]; error?: string }> =>
      ipcRenderer.invoke('plugin-native:readdir', path),
    unlink: (path: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('plugin-native:unlink', path),
    exec: (command: string, cwd?: string): Promise<PluginExecResult> =>
      ipcRenderer.invoke('plugin-native:exec', command, cwd),
    getAppPath: (name: 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents'): Promise<string> =>
      ipcRenderer.invoke('plugin-native:getAppPath', name)
  }
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
