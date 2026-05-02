import { create } from 'zustand'
import React from 'react'
import type { Tab, StoryNode as RendererStoryNode } from '../models'
import { hookSystem } from './hookService'
import { commandService } from './commandService'
import { useEditorStore } from '../stores/editorStore'
import { useProjectStore } from '../stores/projectStore'
import i18n, { addLanguage, getAvailableLanguages, getCurrentLanguage, setLanguage, type LanguageFile, type LanguageMetadata } from '../i18n'
import type {
  ProofreadResult,
  CreateNodeInput,
  StoryNode as PreloadStoryNode,
  PluginFetchResponse,
  PluginFetchOptions,
  PluginExecResult,
  PluginFetchStreamCallbacks,
  PluginFetchStreamOptions
} from '../../../preload/index'

type StoryNode = RendererStoryNode

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
  enabled: boolean
  loaded: boolean
  error?: string
}

export interface ActivityItem {
  id: string
  icon: React.ReactNode | string
  title: string
  panel?: React.ComponentType
  onClick?: () => void
  order?: number
  pluginId: string
}

export interface RightActivityItem {
  id: string
  icon: React.ReactNode | string
  title: string
  panel?: ((props: { api: PluginAPI }) => React.ReactNode | HTMLElement) | React.ComponentType<{ api: PluginAPI }>
  webViewId?: string
  order?: number
  pluginId: string
}

export interface StatusBarItem {
  id: string
  alignment: 'left' | 'right'
  priority: number
  render: () => React.ReactNode
  tooltip?: string
  onClick?: () => void
  pluginId: string
}

export interface NotificationOptions {
  message: string
  type?: 'info' | 'warning' | 'error'
  duration?: number
}

export interface InputBoxOptions {
  title?: string
  prompt?: string
  value?: string
  placeholder?: string
  password?: boolean
  validateInput?: (value: string) => string | undefined
}

export interface QuickPickOptions {
  title?: string
  placeholder?: string
  canPickMany?: boolean
}

export interface OpenTabOptions {
  id: string
  title: string
  type: string
  nodeId?: string
  kind?: 'story' | 'setting'
}

export interface WebViewOptions {
  id: string
  html: string
  scripts?: string[]
  styles?: string[]
  onMessage?: (message: unknown) => void
}

export interface WebViewInfo {
  id: string
  html: string
  scripts: string[]
  styles: string[]
  pluginId: string
  onMessage?: (message: unknown) => void
}

export interface PluginAPI {
  commands: {
    register: (id: string, handler: (...args: unknown[]) => void) => () => void
    execute: (id: string, ...args: unknown[]) => Promise<void>
    getCommands: () => string[]
  }
  ui: {
    addActivityItem: (item: Omit<ActivityItem, 'pluginId'>) => () => void
    addRightActivityItem: (item: Omit<RightActivityItem, 'pluginId'>) => () => void
    addStatusBarItem: (item: Omit<StatusBarItem, 'pluginId'>) => () => void
    showNotification: (message: string, type?: 'info' | 'warning' | 'error') => void
    createWebView: (options: WebViewOptions) => { postMessage: (message: unknown) => void; dispose: () => void }
    addWebViewPanel: (options: {
      id: string
      title: string
      icon: React.ReactNode | string
      html: string
      scripts?: string[]
      styles?: string[]
      onMessage?: (message: unknown) => void
    }) => { postMessage: (message: unknown) => void; dispose: () => void }
  }
  editor: {
    getActiveContent: () => Promise<string | null>
    getActiveTab: () => Tab | null
    openTab: (options: OpenTabOptions) => void
    closeTab: (tabId: string) => void
    onContentChange: (callback: (content: string) => void) => () => void
    onTabChange: (callback: (tab: Tab | null) => void) => () => void
  }
  project: {
    getCurrent: () => ReturnType<typeof useProjectStore.getState>['currentProject']
    getNodes: () => StoryNode[]
    getNodeById: (nodeId: string) => StoryNode | undefined
    createNode: (input: CreateNodeInput) => Promise<PreloadStoryNode[]>
    deleteNode: (nodeId: string) => Promise<void>
    renameNode: (nodeId: string, newName: string) => Promise<void>
    moveNode: (nodeId: string, newParentId: string | null) => Promise<void>
    readNodeContent: (nodeId: string) => Promise<string | null>
    writeNodeContent: (nodeId: string, content: string) => Promise<void>
    getNodeSummaryAndOutline: (nodeId: string) => Promise<{ summary: string | null; outline: string | null }>
    updateNodeSummaryAndOutline: (nodeId: string, summary: string, outline: string) => Promise<void>
  }
  story: {
    getContent: (path: string) => Promise<string | null>
    setContent: (path: string, content: string) => Promise<void>
    list: (path: string) => Array<{ name: string; type: 'file' | 'folder'; path: string }>
    rename: (path: string, newPath: string) => Promise<void>
    delete: (path: string) => Promise<void>
    create: (path: string, type: 'file' | 'folder') => Promise<void>
    archive: (path: string) => Promise<void>
  }
  worldsetting: {
    // Content is JSON format, not plain text
    getContent: (path: string) => Promise<Record<string, string> | null>
    setContent: (path: string, content: Record<string, string>) => Promise<void>
    list: (path: string) => Array<{ name: string; type: 'file' | 'folder'; path: string }>
    // Get all categories (first-level folders)
    getCategories: () => string[]
    // Get field configuration for a file based on its category
    getFieldConfig: (path: string) => { single: string[]; multi: string[] }
    rename: (path: string, newPath: string) => Promise<void>
    delete: (path: string) => Promise<void>
    // Returns error message if creation is not allowed, null if successful
    create: (path: string, type: 'file' | 'folder') => Promise<string | null>
    archive: (path: string) => Promise<void>
  }
  hooks: {
    beforeSave: (
      callback: (content: string, node: StoryNode) => string | false | void
    ) => () => void
    afterLoad: (
      callback: (content: string, node: StoryNode) => string | void
    ) => () => void
    onProofread: (
      callback: (text: string) => ProofreadResult | Promise<ProofreadResult>
    ) => () => void
    onFileOpen: (
      callback: (node: StoryNode, content: string) => void | string
    ) => () => void
    onNodeCreate: (
      callback: (input: CreateNodeInput) => CreateNodeInput | false | void
    ) => () => void
    onNodeDelete: (
      callback: (nodeId: string, node: StoryNode) => boolean | void
    ) => () => void
  }
  storage: {
    get: <T>(key: string) => T | undefined
    set: <T>(key: string, value: T) => void
    delete: (key: string) => void
    clear: () => void
  }
  utils: {
    log: (message: string, level?: 'info' | 'warn' | 'error') => void
  }
  native: {
    fetch: (url: string, options?: PluginFetchOptions) => Promise<PluginFetchResponse>
    fetchStream: (
      url: string,
      callbacks: PluginFetchStreamCallbacks,
      options?: PluginFetchStreamOptions
    ) => { abort: () => void; streamId: string }
    readFile: (path: string, encoding?: BufferEncoding) => Promise<{ success: boolean; content?: string; error?: string }>
    writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>
    exists: (path: string) => Promise<boolean>
    mkdir: (path: string) => Promise<{ success: boolean; error?: string }>
    readdir: (path: string) => Promise<{ success: boolean; entries?: string[]; error?: string }>
    unlink: (path: string) => Promise<{ success: boolean; error?: string }>
    exec: (command: string, cwd?: string) => Promise<PluginExecResult>
    getAppPath: (name: 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents') => Promise<string>
  }
  i18n: {
    addLanguage: (languageFile: LanguageFile) => boolean
    getAvailableLanguages: () => LanguageMetadata[]
    getCurrentLanguage: () => string
    setLanguage: (langCode: string) => void
    t: (key: string, options?: Record<string, unknown>) => string
  }
}

interface PluginState {
  plugins: PluginInfo[]
  activityItems: ActivityItem[]
  rightActivityItems: RightActivityItem[]
  statusBarItems: StatusBarItem[]
  notifications: NotificationOptions[]
  webViews: WebViewInfo[]
  isLoading: boolean

  loadPlugins: () => Promise<void>
  reloadPlugins: () => Promise<void>
  loadPlugin: (pluginInfo: { manifest: PluginManifest; path: string; mainPath: string }) => Promise<void>
  unloadPlugin: (pluginId: string) => void
  setPluginEnabled: (pluginId: string, enabled: boolean) => void

  addNotification: (notification: NotificationOptions) => void
  removeNotification: (index: number) => void

  addWebView: (webView: WebViewInfo) => void
  removeWebView: (id: string) => void
  getWebView: (id: string) => WebViewInfo | undefined

  getHooks: () => typeof hookSystem
}

class PluginStorage {
  private prefix: string

  constructor(pluginId: string) {
    this.prefix = `plugin:${pluginId}:`
  }

  get<T>(key: string): T | undefined {
    try {
      const value = localStorage.getItem(this.prefix + key)
      return value ? JSON.parse(value) : undefined
    } catch {
      return undefined
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value))
    } catch (e) {
      console.error('Plugin storage set error:', e)
    }
  }

  delete(key: string): void {
    localStorage.removeItem(this.prefix + key)
  }

  clear(): void {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }
}

const contentChangeCallbacks = new Set<(content: string) => void>()
const tabChangeCallbacks = new Set<(tab: Tab | null) => void>()

export const triggerContentChange = (content: string): void => {
  contentChangeCallbacks.forEach((cb) => {
    try {
      cb(content)
    } catch (e) {
      console.error('Content change callback error:', e)
    }
  })
}

export const triggerTabChange = (tab: Tab | null): void => {
  tabChangeCallbacks.forEach((cb) => {
    try {
      cb(tab)
    } catch (e) {
      console.error('Tab change callback error:', e)
    }
  })
}

// Helper to find node by path
const findNodeByPath = (nodes: StoryNode[], path: string, kind: 'story' | 'setting'): StoryNode | null => {
  const parts = path.split('/').filter(Boolean)
  let currentNodes = nodes.filter((n) => n.parentId === null && n.kind === kind)

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const found = currentNodes.find((n) => n.name === part)
    if (!found) return null
    if (i === parts.length - 1) return found
    currentNodes = nodes.filter((n) => n.parentId === found.id)
  }
  return null
}

// Helper to get children by path
const getChildrenByPath = (nodes: StoryNode[], path: string, kind: 'story' | 'setting'): Array<{ name: string; type: 'file' | 'folder'; path: string }> => {
  if (path === '' || path === '/') {
    return nodes
      .filter((n) => n.parentId === null && n.kind === kind)
      .map((n) => ({
        name: n.name,
        type: n.type,
        path: n.name
      }))
  }

  const node = findNodeByPath(nodes, path, kind)
  if (!node || node.type !== 'folder') return []

  return nodes
    .filter((n) => n.parentId === node.id)
    .map((n) => ({
      name: n.name,
      type: n.type,
      path: path + '/' + n.name
    }))
}

// Setting field configurations (from SettingEditor)
// Internal keys are in English, UI display uses i18n
const SETTING_FIELD_CONFIG = {
  character: {
    single: ['name', 'gender', 'age'],
    multi: ['background', 'motivation', 'arc', 'appearance', 'personality', 'speech', 'skills', 'notes']
  },
  location: {
    single: [],
    multi: ['locationDescription', 'visual', 'auditory', 'olfactory', 'atmosphere', 'danger', 'notes']
  },
  item: {
    single: ['type', 'quality'],
    multi: ['description', 'stats', 'symbolism']
  },
  default: {
    single: [],
    multi: ['description', 'notes']
  }
}

// Category name mapping: Chinese name -> English key (for backward compatibility with existing data)
const CATEGORY_NAME_MAP: Record<string, string> = {
  '人物': 'character',
  '地点': 'location',
  '物品': 'item',
  'character': 'character',
  'location': 'location',
  'item': 'item'
}

// Helper to get category from path
const getCategoryFromPath = (nodes: StoryNode[], filePath: string): string => {
  const node = findNodeByPath(nodes, filePath, 'setting')
  if (!node) return 'default'

  // Find root parent
  let current: StoryNode | undefined = node
  while (current?.parentId) {
    const parent = nodes.find((n) => n.id === current!.parentId)
    if (!parent) break
    current = parent
  }

  if (!current?.name) return 'default'
  
  // Map the category name to English key
  const mappedKey = CATEGORY_NAME_MAP[current.name]
  if (mappedKey && SETTING_FIELD_CONFIG[mappedKey as keyof typeof SETTING_FIELD_CONFIG]) {
    return mappedKey
  }
  
  return 'default'
}

// Create abstract file API for story (no restrictions)
const createStoryFileAPI = () => {
  return {
    getContent: async (filePath: string): Promise<string | null> => {
      const project = useProjectStore.getState().currentProject
      const nodes = useProjectStore.getState().storyNodes
      if (!project) return null

      const node = findNodeByPath(nodes, filePath, 'story')
      if (!node || node.type !== 'file') return null

      return window.api.readNodeContent(project.projectSettingsPath, node.id)
    },

    setContent: async (filePath: string, content: string): Promise<void> => {
      const nodes = useProjectStore.getState().storyNodes
      const node = findNodeByPath(nodes, filePath, 'story')
      if (!node || node.type !== 'file') return

      await useProjectStore.getState().saveNodeContent(node.id, content)
    },

    list: (dirPath: string): Array<{ name: string; type: 'file' | 'folder'; path: string }> => {
      const nodes = useProjectStore.getState().storyNodes
      return getChildrenByPath(nodes, dirPath, 'story')
    },

    rename: async (oldPath: string, newPath: string): Promise<void> => {
      const nodes = useProjectStore.getState().storyNodes
      const node = findNodeByPath(nodes, oldPath, 'story')
      if (!node) return

      const newName = newPath.split('/').pop() || newPath
      await useProjectStore.getState().renameStoryNode(node.id, newName)
    },

    delete: async (filePath: string): Promise<void> => {
      const nodes = useProjectStore.getState().storyNodes
      const node = findNodeByPath(nodes, filePath, 'story')
      if (!node) return

      await useProjectStore.getState().deleteStoryNode(node.id)
    },

    create: async (filePath: string, type: 'file' | 'folder'): Promise<void> => {
      const project = useProjectStore.getState().currentProject
      const nodes = useProjectStore.getState().storyNodes
      if (!project) return

      const parts = filePath.split('/').filter(Boolean)
      const name = parts.pop() || filePath
      const parentPath = parts.join('/')

      let parentId: string | null = null
      if (parentPath) {
        const parent = findNodeByPath(nodes, parentPath, 'story')
        if (parent) {
          parentId = parent.id
        }
      }

      const input: CreateNodeInput = {
        projectSettingsPath: project.projectSettingsPath,
        parentId,
        name,
        type,
        kind: 'story'
      }

      const result = await hookSystem.intercept('file:beforeCreate', input)
      if (!result.proceed) return

      await window.api.createStoryNode(result.result!)
    },

    archive: async (filePath: string): Promise<void> => {
      const nodes = useProjectStore.getState().storyNodes
      const node = findNodeByPath(nodes, filePath, 'story')
      if (!node) return

      await useProjectStore.getState().deleteStoryNode(node.id)
    }
  }
}

// Create abstract file API for worldsetting (with restrictions)
const createWorldSettingFileAPI = () => {
  return {
    getContent: async (filePath: string): Promise<Record<string, string> | null> => {
      const project = useProjectStore.getState().currentProject
      const nodes = useProjectStore.getState().storyNodes
      if (!project) return null

      const node = findNodeByPath(nodes, filePath, 'setting')
      if (!node || node.type !== 'file') return null

      const content = await window.api.readNodeContent(project.projectSettingsPath, node.id)
      if (!content) return null

      try {
        return JSON.parse(content) as Record<string, string>
      } catch {
        return null
      }
    },

    setContent: async (filePath: string, content: Record<string, string>): Promise<void> => {
      const nodes = useProjectStore.getState().storyNodes
      const node = findNodeByPath(nodes, filePath, 'setting')
      if (!node || node.type !== 'file') return

      await useProjectStore.getState().saveNodeContent(node.id, JSON.stringify(content))
    },

    list: (dirPath: string): Array<{ name: string; type: 'file' | 'folder'; path: string }> => {
      const nodes = useProjectStore.getState().storyNodes
      return getChildrenByPath(nodes, dirPath, 'setting')
    },

    getCategories: (): string[] => {
      const nodes = useProjectStore.getState().storyNodes
      return nodes
        .filter((n) => n.kind === 'setting' && n.parentId === null && n.type === 'folder')
        .map((n) => n.name)
    },

    getFieldConfig: (filePath: string): { single: string[]; multi: string[] } => {
      const nodes = useProjectStore.getState().storyNodes
      const category = getCategoryFromPath(nodes, filePath)
      return (SETTING_FIELD_CONFIG as Record<string, { single: string[]; multi: string[] }>)[category] ||
        SETTING_FIELD_CONFIG.default
    },

    rename: async (oldPath: string, newPath: string): Promise<void> => {
      const nodes = useProjectStore.getState().storyNodes
      const node = findNodeByPath(nodes, oldPath, 'setting')
      if (!node) return

      const newName = newPath.split('/').pop() || newPath
      await useProjectStore.getState().renameStoryNode(node.id, newName)
    },

    delete: async (filePath: string): Promise<void> => {
      const nodes = useProjectStore.getState().storyNodes
      const node = findNodeByPath(nodes, filePath, 'setting')
      if (!node) return

      await useProjectStore.getState().deleteStoryNode(node.id)
    },

    create: async (filePath: string, type: 'file' | 'folder'): Promise<string | null> => {
      const project = useProjectStore.getState().currentProject
      const nodes = useProjectStore.getState().storyNodes
      if (!project) return i18n.t('errors.projectNotLoaded')

      const parts = filePath.split('/').filter(Boolean)
      const name = parts.pop() || filePath
      const parentPath = parts.join('/')

      let parentId: string | null = null
      let parentNode: StoryNode | null = null

      if (parentPath) {
        parentNode = findNodeByPath(nodes, parentPath, 'setting')
        if (parentNode) {
          parentId = parentNode.id
        }
      }

      if (type === 'file') {
        if (!parentId) {
          return i18n.t('setting.cannotCreateAtRoot')
        }
        if (parentNode && parentNode.parentId === null) {
          return i18n.t('setting.cannotCreateInCategory')
        }
      }

      const input: CreateNodeInput = {
        projectSettingsPath: project.projectSettingsPath,
        parentId,
        name,
        type,
        kind: 'setting'
      }

      const result = await hookSystem.intercept('file:beforeCreate', input)
      if (!result.proceed) return i18n.t('errors.operationCancelled')

      await window.api.createStoryNode(result.result!)
      return null
    },

    archive: async (filePath: string): Promise<void> => {
      const nodes = useProjectStore.getState().storyNodes
      const node = findNodeByPath(nodes, filePath, 'setting')
      if (!node) return

      await useProjectStore.getState().deleteStoryNode(node.id)
    }
  }
}

export const createPluginAPI = (pluginId: string): PluginAPI => {
  const storage = new PluginStorage(pluginId)

  return {
    commands: {
      register: (id: string, handler: (...args: unknown[]) => void) => {
        const fullId = `${pluginId}.${id}`
        return commandService.registerCommand(fullId, handler, pluginId)
      },
      execute: (id: string, ...args: unknown[]) => commandService.executeCommand(id, ...args),
      getCommands: () => {
        const commands: string[] = []
        return commands
      }
    },

    ui: {
      addActivityItem: (item: Omit<ActivityItem, 'pluginId'>) => {
        const fullItem: ActivityItem = { ...item, pluginId }
        usePluginService.getState().activityItems.push(fullItem)
        return () => {
          const state = usePluginService.getState()
          const index = state.activityItems.findIndex(
            (i) => i.id === fullItem.id && i.pluginId === pluginId
          )
          if (index !== -1) {
            state.activityItems.splice(index, 1)
          }
        }
      },
      addRightActivityItem: (item: Omit<RightActivityItem, 'pluginId'>) => {
        const fullItem: RightActivityItem = { ...item, pluginId }
        usePluginService.setState((state) => ({
          rightActivityItems: [...state.rightActivityItems, fullItem]
        }))
        return () => {
          usePluginService.setState((state) => ({
            rightActivityItems: state.rightActivityItems.filter(
              (i) => !(i.id === fullItem.id && i.pluginId === pluginId)
            )
          }))
        }
      },
      addStatusBarItem: (item: Omit<StatusBarItem, 'pluginId'>) => {
        const fullItem: StatusBarItem = { ...item, pluginId }
        usePluginService.setState((state) => ({
          statusBarItems: [...state.statusBarItems, fullItem]
        }))
        return () => {
          usePluginService.setState((state) => ({
            statusBarItems: state.statusBarItems.filter(
              (i) => !(i.id === fullItem.id && i.pluginId === pluginId)
            )
          }))
        }
      },
      showNotification: (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
        usePluginService.getState().addNotification({ message, type })
      },
      createWebView: (options: WebViewOptions) => {
        const webViewId = `${pluginId}:${options.id}`
        const webViewInfo: WebViewInfo = {
          id: webViewId,
          html: options.html,
          scripts: options.scripts || [],
          styles: options.styles || [],
          pluginId,
          onMessage: options.onMessage
        }
        usePluginService.getState().addWebView(webViewInfo)

        return {
          postMessage: (message: unknown) => {
            const iframe = document.querySelector(`iframe[data-webview-id="${webViewId}"]`) as HTMLIFrameElement
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage({ type: 'plugin-message', data: message }, '*')
            }
          },
          dispose: () => {
            usePluginService.getState().removeWebView(webViewId)
          }
        }
      },
      addWebViewPanel: (options: {
        id: string
        title: string
        icon: React.ReactNode | string
        html: string
        scripts?: string[]
        styles?: string[]
        onMessage?: (message: unknown) => void
      }) => {
        const webViewId = `${pluginId}:${options.id}`

        const webViewInfo: WebViewInfo = {
          id: webViewId,
          html: options.html,
          scripts: options.scripts || [],
          styles: options.styles || [],
          pluginId,
          onMessage: options.onMessage
        }
        usePluginService.getState().addWebView(webViewInfo)

        const activityItem: RightActivityItem = {
          id: options.id,
          icon: options.icon,
          title: options.title,
          webViewId,
          pluginId
        }
        usePluginService.setState((state) => ({
          rightActivityItems: [...state.rightActivityItems, activityItem]
        }))

        return {
          postMessage: (message: unknown) => {
            const iframe = document.querySelector(`iframe[data-webview-id="${webViewId}"]`) as HTMLIFrameElement
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage({ type: 'plugin-message', data: message }, '*')
            }
          },
          dispose: () => {
            usePluginService.getState().removeWebView(webViewId)
            usePluginService.setState((state) => ({
              rightActivityItems: state.rightActivityItems.filter((i) => i.id !== options.id)
            }))
          }
        }
      }
    },

    editor: {
      getActiveContent: async () => {
        const editorState = useEditorStore.getState()
        const projectState = useProjectStore.getState()
        const activeGroupId = editorState.focusedGroupId

        const tree = editorState.editorTree
        const findActiveTab = (node: typeof tree): Tab | null => {
          if (node.kind === 'group') {
            if (node.id === activeGroupId) {
              return node.tabs.find((t) => t.id === node.activeTabId) || null
            }
            return null
          }
          return findActiveTab(node.first) || findActiveTab(node.second)
        }

        const activeTab = findActiveTab(tree)
        if (!activeTab || activeTab.type !== 'file' || !activeTab.nodeId) return null

        const draft = projectState.draftsByNodeId[activeTab.nodeId]
        if (typeof draft === 'string') {
          return draft
        }

        const project = projectState.currentProject
        if (project) {
          return await window.api.readNodeContent(project.projectSettingsPath, activeTab.nodeId)
        }

        return null
      },
      getActiveTab: () => {
        const editorState = useEditorStore.getState()
        const tree = editorState.editorTree
        const activeGroupId = editorState.focusedGroupId

        const findActiveTab = (node: typeof tree): Tab | null => {
          if (node.kind === 'group') {
            if (node.id === activeGroupId) {
              return node.tabs.find((t) => t.id === node.activeTabId) || null
            }
            return null
          }
          return findActiveTab(node.first) || findActiveTab(node.second)
        }

        return findActiveTab(tree)
      },
      openTab: (options: OpenTabOptions) => {
        useEditorStore.getState().openTab({
          id: options.id,
          title: options.title,
          type: options.type as Tab['type'],
          nodeId: options.nodeId,
          kind: options.kind
        })
      },
      closeTab: (tabId: string) => {
        const editorState = useEditorStore.getState()
        const groupId = editorState.focusedGroupId
        useEditorStore.getState().closeTab(groupId, tabId)
      },
      onContentChange: (callback: (content: string) => void) => {
        contentChangeCallbacks.add(callback)
        return () => {
          contentChangeCallbacks.delete(callback)
        }
      },
      onTabChange: (callback: (tab: Tab | null) => void) => {
        tabChangeCallbacks.add(callback)
        // 立即调用一次当前 tab
        const editorState = useEditorStore.getState()
        const tree = editorState.editorTree
        const activeGroupId = editorState.focusedGroupId

        const findActiveTab = (node: typeof tree): Tab | null => {
          if (node.kind === 'group') {
            if (node.id === activeGroupId) {
              return node.tabs.find((t) => t.id === node.activeTabId) || null
            }
            return null
          }
          return findActiveTab(node.first) || findActiveTab(node.second)
        }

        const currentTab = findActiveTab(tree)
        if (currentTab) {
          callback(currentTab)
        }
        return () => {
          tabChangeCallbacks.delete(callback)
        }
      }
    },

    project: {
      getCurrent: () => useProjectStore.getState().currentProject,
      getNodes: () => useProjectStore.getState().storyNodes,
      getNodeById: (nodeId: string) =>
        useProjectStore.getState().storyNodes.find((n) => n.id === nodeId),
      createNode: async (input: CreateNodeInput) => {
        const result = await hookSystem.intercept('file:beforeCreate', input)
        if (!result.proceed) return []
        return window.api.createStoryNode(result.result!)
      },
      deleteNode: async (nodeId: string) => {
        const node = useProjectStore.getState().storyNodes.find((n) => n.id === nodeId)
        if (node) {
          const result = await hookSystem.intercept('file:beforeDelete', { nodeId, node })
          if (!result.proceed) return
        }
        await useProjectStore.getState().deleteStoryNode(nodeId)
      },
      renameNode: async (nodeId: string, newName: string) => {
        const node = useProjectStore.getState().storyNodes.find((n) => n.id === nodeId)
        if (node) {
          const result = await hookSystem.intercept('file:beforeRename', {
            nodeId,
            newName,
            node
          })
          if (!result.proceed) return
          newName = (result.result as { newName: string }).newName
        }
        await useProjectStore.getState().renameStoryNode(nodeId, newName)
      },
      moveNode: async (nodeId: string, newParentId: string | null) => {
        const node = useProjectStore.getState().storyNodes.find((n) => n.id === nodeId)
        if (node) {
          const result = await hookSystem.intercept('file:beforeMove', {
            nodeId,
            newParentId,
            node
          })
          if (!result.proceed) return
        }
        await useProjectStore.getState().moveStoryNode(nodeId, newParentId)
      },
      readNodeContent: async (nodeId: string) => {
        const project = useProjectStore.getState().currentProject
        if (!project) return null
        return window.api.readNodeContent(project.projectSettingsPath, nodeId)
      },
      writeNodeContent: async (nodeId: string, content: string) => {
        const project = useProjectStore.getState().currentProject
        const node = useProjectStore.getState().storyNodes.find((n) => n.id === nodeId)
        if (!project || !node) return

        const result = await hookSystem.waterfall('content:beforeSave', content)
        await useProjectStore.getState().saveNodeContent(nodeId, result)
      },
      getNodeSummaryAndOutline: async (nodeId: string) => {
        const project = useProjectStore.getState().currentProject
        if (!project) return { summary: null, outline: null }
        return window.api.getNodeSummaryAndOutline(project.projectSettingsPath, nodeId)
      },
      updateNodeSummaryAndOutline: async (nodeId: string, summary: string, outline: string) => {
        const project = useProjectStore.getState().currentProject
        if (!project) return
        await window.api.updateNodeSummaryAndOutline(
          project.projectSettingsPath,
          nodeId,
          summary,
          outline
        )
      }
    },

    story: createStoryFileAPI(),
    worldsetting: createWorldSettingFileAPI(),

    hooks: {
      beforeSave: (callback) => hookSystem.on('content:beforeSave', callback as never),
      afterLoad: (callback) => hookSystem.on('content:afterLoad', callback as never),
      onProofread: (callback) => hookSystem.on('proofread:process', callback as never),
      onFileOpen: (callback) => hookSystem.on('file:open', callback as never),
      onNodeCreate: (callback) => hookSystem.on('file:beforeCreate', callback as never),
      onNodeDelete: (callback) => hookSystem.on('file:beforeDelete', callback as never)
    },

    storage: {
      get: <T>(key: string) => storage.get<T>(key),
      set: <T>(key: string, value: T) => storage.set(key, value),
      delete: (key: string) => storage.delete(key),
      clear: () => storage.clear()
    },

    utils: {
      log: (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
        const prefix = `[Plugin:${pluginId}]`
        switch (level) {
          case 'error':
            console.error(prefix, message)
            break
          case 'warn':
            console.warn(prefix, message)
            break
          default:
            console.log(prefix, message)
        }
      }
    },

    native: {
      fetch: (url: string, options?: PluginFetchOptions) =>
        window.api.pluginNative.fetch(url, options),
      fetchStream: (
        url: string,
        callbacks: PluginFetchStreamCallbacks,
        options?: PluginFetchStreamOptions
      ) => window.api.pluginNative.fetchStream(url, callbacks, options),
      readFile: (path: string, encoding?: BufferEncoding) =>
        window.api.pluginNative.readFile(path, encoding),
      writeFile: (path: string, content: string) =>
        window.api.pluginNative.writeFile(path, content),
      exists: (path: string) =>
        window.api.pluginNative.exists(path),
      mkdir: (path: string) =>
        window.api.pluginNative.mkdir(path),
      readdir: (path: string) =>
        window.api.pluginNative.readdir(path),
      unlink: (path: string) =>
        window.api.pluginNative.unlink(path),
      exec: (command: string, cwd?: string) =>
        window.api.pluginNative.exec(command, cwd),
      getAppPath: (name: 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents') =>
        window.api.pluginNative.getAppPath(name)
    },

    i18n: {
      addLanguage: (languageFile: LanguageFile) => addLanguage(languageFile),
      getAvailableLanguages: () => getAvailableLanguages(),
      getCurrentLanguage: () => getCurrentLanguage(),
      setLanguage: (langCode: string) => setLanguage(langCode),
      t: (key: string, options?: Record<string, unknown>) => i18n.t(key, options)
    }
  }
}

export const usePluginService = create<PluginState>((set, get) => ({
  plugins: [],
  activityItems: [],
  rightActivityItems: [],
  statusBarItems: [],
  notifications: [],
  webViews: [],
  isLoading: false,

  loadPlugins: async () => {
    set({ isLoading: true })
    try {
      const pluginList = await window.api.getPlugins()
      // 先将插件列表存入状态（不加载），只加载被启用的插件
      set({ plugins: pluginList.map((p) => ({ ...p, loaded: false })) })
      // 只加载被启用的插件
      for (const plugin of pluginList) {
        if (plugin.enabled) {
          await get().loadPlugin(plugin)
        }
      }
    } catch (e) {
      console.error('Failed to load plugins:', e)
    } finally {
      set({ isLoading: false })
    }
  },

  reloadPlugins: async () => {
    set({ isLoading: true })
    try {
      // 1. 卸载所有已加载的插件
      const loadedPlugins = get().plugins.filter((p) => p.loaded)
      for (const plugin of loadedPlugins) {
        get().unloadPlugin(plugin.manifest.id)
      }

      // 2. 清空所有插件相关状态
      set({
        plugins: [],
        activityItems: [],
        rightActivityItems: [],
        statusBarItems: [],
        webViews: [],
        notifications: []
      })

      // 3. 清理所有插件注册的钩子
      hookSystem.clear()

      // 4. 重新加载插件列表
      await get().loadPlugins()

      console.log('[PluginService] Plugins reloaded successfully')
    } catch (e) {
      console.error('Failed to reload plugins:', e)
    } finally {
      set({ isLoading: false })
    }
  },

  loadPlugin: async (pluginInfo) => {
    const { manifest, path, mainPath } = pluginInfo
    const existingPlugin = get().plugins.find((p) => p.manifest.id === manifest.id)
    if (existingPlugin?.loaded) return

    try {
      const api = createPluginAPI(manifest.id)

      const languagesDir = `${path}/languages`
      const dirResult = await window.api.pluginNative.readdir(languagesDir)
      if (dirResult.success && dirResult.entries) {
        for (const entry of dirResult.entries) {
          if (entry.endsWith('.json')) {
            const langPath = `${languagesDir}/${entry}`
            const langResult = await window.api.pluginNative.readFile(langPath)
            if (langResult.success && langResult.content) {
              try {
                const langFile = JSON.parse(langResult.content) as LanguageFile
                if (langFile.languageMetadata) {
                  addLanguage(langFile)
                  console.log(`[Plugin:${manifest.id}] Loaded language: ${langFile.languageMetadata.code}`)
                }
              } catch (e) {
                console.warn(`[Plugin:${manifest.id}] Failed to parse language file ${entry}:`, e)
              }
            }
          }
        }
      }

      const result = await window.api.readPluginFile(mainPath)
      if (!result.success) {
        throw new Error(result.error || 'Failed to read plugin file')
      }

      const pluginCode = result.content!
      const pluginModule: { exports: { activate?: (api: PluginAPI) => void | Promise<void> } } = { exports: {} }

      const wrappedCode = `
        (function(module) {
          ${pluginCode}
        })
      `

      const pluginFunction = eval(wrappedCode)
      pluginFunction(pluginModule)

      const activate = pluginModule.exports.activate

      if (typeof activate === 'function') {
        await activate(api)
      } else {
        console.warn(`Plugin ${manifest.id} has no activate function`)
      }

      set((state) => {
        const filtered = state.plugins.filter((p) => p.manifest.id !== manifest.id)
        return {
          plugins: [
            ...filtered,
            {
              manifest,
              path,
              enabled: true, // 加载成功，标记为启用
              loaded: true
            }
          ]
        }
      })
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      console.error(`Failed to load plugin ${manifest.id}:`, e)
      set((state) => {
        const filtered = state.plugins.filter((p) => p.manifest.id !== manifest.id)
        return {
          plugins: [
            ...filtered,
            {
              manifest,
              path,
              enabled: false,
              loaded: false,
              error: errorMessage
            }
          ]
        }
      })
    }
  },

  unloadPlugin: (pluginId: string) => {
    const plugin = get().plugins.find((p) => p.manifest.id === pluginId)
    if (!plugin) return

    set((state) => ({
      plugins: state.plugins.map((p) =>
        p.manifest.id === pluginId ? { ...p, loaded: false } : p
      ),
      activityItems: state.activityItems.filter((i) => i.pluginId !== pluginId),
      rightActivityItems: state.rightActivityItems.filter((i) => i.pluginId !== pluginId),
      statusBarItems: state.statusBarItems.filter((i) => i.pluginId !== pluginId),
      webViews: state.webViews.filter((w) => w.pluginId !== pluginId)
    }))

    // 清理插件注册的命令
    commandService.unregisterByGroup(pluginId)

    new PluginStorage(pluginId).clear()
  },

  setPluginEnabled: (pluginId: string, enabled: boolean) => {
    const plugin = get().plugins.find((p) => p.manifest.id === pluginId)
    if (!plugin) return

    if (enabled && !plugin.loaded) {
      void get().loadPlugin({
        manifest: plugin.manifest,
        path: plugin.path,
        mainPath: `${plugin.path}/${plugin.manifest.main}`
      })
    } else if (!enabled && plugin.loaded) {
      get().unloadPlugin(pluginId)
    }

    set((state) => ({
      plugins: state.plugins.map((p) =>
        p.manifest.id === pluginId ? { ...p, enabled } : p
      )
    }))

    void window.api.setPluginEnabled(pluginId, enabled)
  },

  addNotification: (notification: NotificationOptions) => {
    set((state) => ({
      notifications: [...state.notifications, notification]
    }))

    const duration = notification.duration ?? 3000
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n !== notification)
        }))
      }, duration)
    }
  },

  removeNotification: (index: number) => {
    set((state) => ({
      notifications: state.notifications.filter((_, i) => i !== index)
    }))
  },

  addWebView: (webView: WebViewInfo) => {
    set((state) => ({
      webViews: [...state.webViews, webView]
    }))
  },

  removeWebView: (id: string) => {
    set((state) => ({
      webViews: state.webViews.filter((w) => w.id !== id)
    }))
  },

  getWebView: (id: string) => {
    return get().webViews.find((w) => w.id === id)
  },

  getHooks: () => hookSystem
}))

export type PluginServiceType = typeof usePluginService
