import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      minimize: () => void
      maximize: () => void
      close: () => void
      // 窗口生命周期事件监听
      onWindowFocus: (callback: () => void) => (() => void)
      onWindowBlur: (callback: () => void) => (() => void)
      onWindowRestore: (callback: () => void) => (() => void)
      openProject: () => Promise<string | null>
      pickProjectPath: () => Promise<string | null>
      loadProject: (projectSettingsPath: string) => Promise<ProjectData>
      createProject: (input: CreateProjectInput) => Promise<ProjectData>
      getProjectNodes: (projectSettingsPath: string) => Promise<StoryNode[]>
      initSettingNodes: (projectSettingsPath: string) => Promise<StoryNode[]>
      createStoryNode: (input: CreateNodeInput) => Promise<StoryNode[]>
      renameStoryNode: (input: RenameNodeInput) => Promise<StoryNode[]>
      deleteStoryNode: (input: DeleteNodeInput) => Promise<StoryNode[]>
      moveStoryNode: (input: MoveNodeInput) => Promise<StoryNode[]>
      reorderStoryNode: (input: ReorderNodeInput) => Promise<StoryNode[]>
      getArchivedNodes: (projectSettingsPath: string) => Promise<StoryNode[]>
      restoreArchivedNode: (projectSettingsPath: string, nodeId: string, newParentId: string | null) => Promise<StoryNode[]>
      permanentlyDeleteNode: (input: DeleteNodeInput) => Promise<StoryNode[]>
      readNodeContent: (projectSettingsPath: string, nodeId: string) => Promise<string | null>
      writeNodeContent: (
        projectSettingsPath: string,
        nodeId: string,
        content: string
      ) => Promise<void>
      getNodeSummaryAndOutline: (
        projectSettingsPath: string,
        nodeId: string
      ) => Promise<{ summary: string | null; outline: string | null }>
      updateNodeSummaryAndOutline: (
        projectSettingsPath: string,
        nodeId: string,
        summary: string,
        outline: string
      ) => Promise<void>
      getAppVersion: () => Promise<{
        version: string
        electron: string
        chrome: string
        node: string
        v8: string
        platform: string
      }>
      toggleDevTools: () => void
      openNewWindow: () => void
      setFullScreen: (fullScreen: boolean) => void
      isFullScreen: () => Promise<boolean>
      proofreadText: (text: string) => Promise<ProofreadResult>
      // Memo APIs
      getAllMemos: () => Promise<Memo[]>
      createMemo: (content?: string) => Promise<Memo>
      updateMemo: (id: string, content: string) => Promise<Memo | null>
      deleteMemo: (id: string) => Promise<boolean>
      // Snapshot APIs
      createSnapshot: (projectSettingsPath: string, name: string, description?: string) => Promise<Snapshot>
      getAllSnapshots: (projectSettingsPath: string) => Promise<Snapshot[]>
      deleteSnapshot: (projectSettingsPath: string, snapshotId: string) => Promise<boolean>
      restoreSnapshot: (projectSettingsPath: string, snapshotId: string) => Promise<boolean>
      compareWithCurrent: (projectSettingsPath: string, snapshotId: string) => Promise<DiffResult | null>
      // Plugin APIs
      getPlugins: () => Promise<PluginInfo[]>
      getPluginSettings: () => Promise<PluginSettings>
      setPluginEnabled: (pluginId: string, enabled: boolean) => Promise<boolean>
      getPluginDir: () => Promise<string>
      openPluginsFolder: () => void
      readPluginFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
      // Reading Order APIs
      readReadingOrder: (projectSettingsPath: string) => Promise<ReadingOrderConfig | null>
      writeReadingOrder: (projectSettingsPath: string, config: ReadingOrderConfig) => Promise<void>
      // Export Story API
      exportStory: (input: ExportStoryInput) => Promise<ExportStoryResult>
      // Export Wiki API
      exportWiki: (input: ExportWikiInput) => Promise<ExportWikiResult>
      pickWikiExportPath: () => Promise<string | null>
      // Plugin Native APIs
      pluginNative: {
        fetch: (url: string, options?: {
          method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
          headers?: Record<string, string>
          body?: string
          timeout?: number
        }) => Promise<{
          ok: boolean
          status: number
          statusText: string
          headers: Record<string, string>
          body: string
        }>
        fetchStream: (
          url: string,
          callbacks: {
            onStart?: (info: { ok: boolean; status: number; statusText: string; headers: Record<string, string> }) => void
            onChunk?: (chunk: string) => void
            onError?: (error: { message: string }) => void
            onEnd?: () => void
          },
          options?: {
            method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
            headers?: Record<string, string>
            body?: string
            timeout?: number
            streamId?: string
          }
        ) => { abort: () => void; streamId: string }
        readFile: (path: string, encoding?: BufferEncoding) => Promise<{ success: boolean; content?: string; error?: string }>
        writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>
        exists: (path: string) => Promise<boolean>
        mkdir: (path: string) => Promise<{ success: boolean; error?: string }>
        readdir: (path: string) => Promise<{ success: boolean; entries?: string[]; error?: string }>
        unlink: (path: string) => Promise<{ success: boolean; error?: string }>
        exec: (command: string, cwd?: string) => Promise<{ stdout: string; stderr: string; error?: string }>
        getAppPath: (name: 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents') => Promise<string>
      }
    }
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
  defaultStoryName?: string
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
  nodeName: string
  fileName: string
}

export interface ExportStoryResult {
  success: boolean
  filePath?: string
  error?: string
}

export interface ExportWikiInput {
  projectSettingsPath: string
  exportPath: string
  language: string
  includeChapters: boolean
  i18nStrings: Record<string, string>
}

export interface ExportWikiResult {
  success: boolean
  exportPath?: string
  error?: string
}
