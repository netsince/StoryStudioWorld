import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  Memo,
  Snapshot,
  DiffResult,
  StoryNode,
  ProjectData,
  CreateProjectInput,
  CreateNodeInput,
  RenameNodeInput,
  DeleteNodeInput,
  MoveNodeInput,
  ReorderNodeInput,
  ProofreadResult,
  PluginInfo,
  PluginSettings,
  ReadingOrderConfig,
  ExportStoryInput,
  ExportStoryResult,
  ExportWikiInput,
  ExportWikiResult,
  GalleryImageItem
} from '../../../preload/index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      minimize: () => void
      maximize: () => void
      close: () => void
      onWindowFocus: (callback: () => void) => () => void
      onWindowBlur: (callback: () => void) => () => void
      onWindowRestore: (callback: () => void) => () => void
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
      restoreArchivedNode: (
        projectSettingsPath: string,
        nodeId: string,
        newParentId: string | null
      ) => Promise<StoryNode[]>
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
      focusWindow: () => void
      setFullScreen: (fullScreen: boolean) => void
      isFullScreen: () => Promise<boolean>
      proofreadText: (text: string) => Promise<ProofreadResult>
      getAllMemos: () => Promise<Memo[]>
      createMemo: (content?: string) => Promise<Memo>
      updateMemo: (id: string, content: string) => Promise<Memo | null>
      deleteMemo: (id: string) => Promise<boolean>
      createSnapshot: (
        projectSettingsPath: string,
        name: string,
        description?: string
      ) => Promise<Snapshot>
      getAllSnapshots: (projectSettingsPath: string) => Promise<Snapshot[]>
      deleteSnapshot: (projectSettingsPath: string, snapshotId: string) => Promise<boolean>
      restoreSnapshot: (projectSettingsPath: string, snapshotId: string) => Promise<boolean>
      compareWithCurrent: (
        projectSettingsPath: string,
        snapshotId: string
      ) => Promise<DiffResult | null>
      getPlugins: () => Promise<PluginInfo[]>
      getPluginSettings: () => Promise<PluginSettings>
      setPluginEnabled: (pluginId: string, enabled: boolean) => Promise<boolean>
      getPluginDir: () => Promise<string>
      openPluginsFolder: () => void
      readPluginFile: (
        filePath: string
      ) => Promise<{ success: boolean; content?: string; error?: string }>
      readReadingOrder: (projectSettingsPath: string) => Promise<ReadingOrderConfig | null>
      writeReadingOrder: (projectSettingsPath: string, config: ReadingOrderConfig) => Promise<void>
      exportStory: (input: ExportStoryInput) => Promise<ExportStoryResult>
      exportWiki: (input: ExportWikiInput) => Promise<ExportWikiResult>
      pickWikiExportPath: () => Promise<string | null>
      gallery: {
        getImages: (projectSettingsPath: string, nodeId: string) => Promise<GalleryImageItem[]>
        uploadImage: (
          projectSettingsPath: string,
          nodeId: string
        ) => Promise<GalleryImageItem | null>
        updateCaption: (
          projectSettingsPath: string,
          itemId: string,
          caption: string
        ) => Promise<void>
        reorder: (projectSettingsPath: string, itemIds: string[]) => Promise<void>
        setTheme: (projectSettingsPath: string, nodeId: string, itemId: string) => Promise<void>
        unsetTheme: (projectSettingsPath: string, nodeId: string) => Promise<void>
        remove: (projectSettingsPath: string, itemId: string) => Promise<void>
      }
      pluginNative: {
        fetch: (
          url: string,
          options?: {
            method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
            headers?: Record<string, string>
            body?: string
            timeout?: number
          }
        ) => Promise<{
          ok: boolean
          status: number
          statusText: string
          headers: Record<string, string>
          body: string
        }>
        fetchStream: (
          url: string,
          callbacks: {
            onStart?: (info: {
              ok: boolean
              status: number
              statusText: string
              headers: Record<string, string>
            }) => void
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
        readFile: (
          path: string,
          encoding?: BufferEncoding
        ) => Promise<{ success: boolean; content?: string; error?: string }>
        writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>
        exists: (path: string) => Promise<boolean>
        mkdir: (path: string) => Promise<{ success: boolean; error?: string }>
        readdir: (path: string) => Promise<{ success: boolean; entries?: string[]; error?: string }>
        unlink: (path: string) => Promise<{ success: boolean; error?: string }>
        exec: (
          command: string,
          cwd?: string
        ) => Promise<{ stdout: string; stderr: string; error?: string }>
        getAppPath: (
          name: 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents'
        ) => Promise<string>
      }
    }
  }
}

export {}
