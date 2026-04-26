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
}
