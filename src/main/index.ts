import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { ReadingOrderConfig } from '../preload/index'
import { APP_NAME } from './config'
import {
  createProject,
  createStoryNode,
  initSettingNodes,
  loadProject,
  getProjectNodes,
  renameStoryNode,
  deleteStoryNode,
  moveStoryNode,
  reorderStoryNode,
  readNodeContent,
  writeNodeContent,
  getNodeSummaryAndOutline,
  updateNodeSummaryAndOutline,
  getArchivedNodesProject,
  restoreArchivedNode,
  permanentlyDeleteProjectNode,
  getGalleryImages,
  uploadGalleryImage,
  updateGalleryImageCaption,
  reorderGalleryImages,
  setGalleryThemeImage,
  unsetGalleryThemeImage,
  removeGalleryImage
} from './project'
import { proofreadText } from './proofread'
import { getAllMemos, createMemo, updateMemo, deleteMemo } from './memo'
import {
  createSnapshot,
  getAllSnapshots,
  deleteSnapshot,
  restoreSnapshot,
  compareWithCurrent
} from './snapshot'
import { pluginLoader } from './pluginLoader'
import {
  exportToDocx,
  exportToPdf,
  exportToEpub,
  exportToTxt,
  exportToMarkdown,
  exportToWiki,
  type ExportContent,
  type WikiNode,
  type WikiGalleryItem
} from './export'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    ...(process.platform !== 'darwin' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 窗口焦点管理 - 优化后台挂起恢复性能
  mainWindow.on('focus', () => {
    // 通知渲染进程窗口已获得焦点
    mainWindow.webContents.send('window-focus')
  })

  mainWindow.on('blur', () => {
    // 通知渲染进程窗口已失去焦点
    mainWindow.webContents.send('window-blur')
  })

  // 窗口恢复时强制刷新以解决可能的渲染问题
  mainWindow.on('restore', () => {
    mainWindow.webContents.send('window-restore')
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  ipcMain.on('window-minimize', () => {
    mainWindow.minimize()
  })

  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.on('window-close', () => {
    mainWindow.close()
  })

  ipcMain.on('window-set-fullscreen', (_, fullScreen: boolean) => {
    mainWindow.setFullScreen(fullScreen)
  })

  ipcMain.handle('window-is-fullscreen', () => {
    return mainWindow.isFullScreen()
  })

  ipcMain.handle('open-project-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: `${APP_NAME} Project`, extensions: ['sswprojectsetting'] }]
    })
    if (!canceled) {
      return filePaths[0]
    }
    return null
  })

  ipcMain.handle('pick-project-path-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory']
    })
    if (!canceled) {
      return filePaths[0]
    }
    return null
  })

  ipcMain.handle('load-project', async (_, projectSettingsPath: string) => {
    return loadProject(projectSettingsPath)
  })

  ipcMain.handle(
    'create-project',
    async (_, input: { projectName: string; description: string; projectPath: string }) => {
      return createProject(input)
    }
  )

  ipcMain.handle('get-project-nodes', async (_, projectSettingsPath: string) => {
    return getProjectNodes(projectSettingsPath)
  })

  ipcMain.handle('init-setting-nodes', async (_, projectSettingsPath: string) => {
    return initSettingNodes(projectSettingsPath)
  })

  ipcMain.handle(
    'create-story-node',
    async (
      _,
      input: {
        projectSettingsPath: string
        parentId: string | null
        name: string
        type: 'folder' | 'file'
        kind?: 'story' | 'setting'
      }
    ) => {
      return createStoryNode(input)
    }
  )

  ipcMain.handle(
    'rename-story-node',
    async (
      _,
      input: {
        projectSettingsPath: string
        nodeId: string
        newName: string
      }
    ) => {
      return renameStoryNode(input)
    }
  )

  ipcMain.handle(
    'delete-story-node',
    async (
      _,
      input: {
        projectSettingsPath: string
        nodeId: string
      }
    ) => {
      return deleteStoryNode(input)
    }
  )

  ipcMain.handle(
    'move-story-node',
    async (
      _,
      input: {
        projectSettingsPath: string
        nodeId: string
        newParentId: string | null
      }
    ) => {
      return moveStoryNode(input)
    }
  )

  ipcMain.handle(
    'reorder-story-node',
    async (
      _,
      input: {
        projectSettingsPath: string
        nodeId: string
        targetNodeId: string
        position: 'before' | 'after'
      }
    ) => {
      return reorderStoryNode(input)
    }
  )

  ipcMain.handle('read-node-content', async (_, projectSettingsPath: string, nodeId: string) => {
    return readNodeContent({ projectSettingsPath, nodeId })
  })

  ipcMain.handle(
    'write-node-content',
    async (_, projectSettingsPath: string, nodeId: string, content: string) => {
      return writeNodeContent({ projectSettingsPath, nodeId, content })
    }
  )

  ipcMain.handle(
    'get-node-summary-and-outline',
    async (_, projectSettingsPath: string, nodeId: string) => {
      return getNodeSummaryAndOutline(projectSettingsPath, nodeId)
    }
  )

  ipcMain.handle(
    'update-node-summary-and-outline',
    async (_, projectSettingsPath: string, nodeId: string, summary: string, outline: string) => {
      return updateNodeSummaryAndOutline(projectSettingsPath, nodeId, summary, outline)
    }
  )

  ipcMain.handle('get-archived-nodes', async (_, projectSettingsPath: string) => {
    return getArchivedNodesProject(projectSettingsPath)
  })

  ipcMain.handle('restore-archived-node', async (_, projectSettingsPath: string, nodeId: string, newParentId: string | null = null) => {
    return restoreArchivedNode(projectSettingsPath, nodeId, newParentId)
  })

  ipcMain.handle(
    'permanently-delete-node',
    async (
      _,
      input: {
        projectSettingsPath: string
        nodeId: string
      }
    ) => {
      return permanentlyDeleteProjectNode(input)
    }
  )

  ipcMain.handle('get-app-version', async () => {
    const pkgPath = join(__dirname, '../../package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return {
      version: pkg.version || '0.0.1',
      electron: process.versions.electron || 'Unknown',
      chrome: process.versions.chrome || 'Unknown',
      node: process.versions.node || 'Unknown',
      v8: process.versions.v8 || 'Unknown',
      platform: process.platform
    }
  })

  ipcMain.handle('proofread-text', async (_, text: string) => {
    return proofreadText(text)
  })

  // Memo IPC handlers
  ipcMain.handle('get-all-memos', async () => {
    return getAllMemos()
  })

  ipcMain.handle('create-memo', async (_, content: string) => {
    return createMemo(content)
  })

  ipcMain.handle('update-memo', async (_, id: string, content: string) => {
    return updateMemo(id, content)
  })

  ipcMain.handle('delete-memo', async (_, id: string) => {
    return deleteMemo(id)
  })

  // Snapshot IPC handlers
  ipcMain.handle('create-snapshot', async (_, projectSettingsPath: string, name: string, description?: string) => {
    return createSnapshot({ projectSettingsPath, name, description })
  })

  ipcMain.handle('get-all-snapshots', async (_, projectSettingsPath: string) => {
    return getAllSnapshots(projectSettingsPath)
  })

  ipcMain.handle('delete-snapshot', async (_, projectSettingsPath: string, snapshotId: string) => {
    return deleteSnapshot(projectSettingsPath, snapshotId)
  })

  ipcMain.handle('restore-snapshot', async (_, projectSettingsPath: string, snapshotId: string) => {
    return restoreSnapshot(projectSettingsPath, snapshotId)
  })

  ipcMain.handle('compare-with-current', async (_, projectSettingsPath: string, snapshotId: string) => {
    return compareWithCurrent(projectSettingsPath, snapshotId)
  })

  // Plugin IPC handlers
  ipcMain.handle('get-plugins', async () => {
    return pluginLoader.discoverPlugins()
  })

  ipcMain.handle('get-plugin-settings', async () => {
    return pluginLoader.getSettings()
  })

  ipcMain.handle('set-plugin-enabled', async (_, pluginId: string, enabled: boolean) => {
    return pluginLoader.setPluginEnabled(pluginId, enabled)
  })

  ipcMain.handle('get-plugin-dir', async () => {
    return pluginLoader.getPluginDir()
  })

  ipcMain.on('open-plugins-folder', () => {
    shell.openPath(pluginLoader.getPluginDir())
  })

  ipcMain.handle('read-plugin-file', async (_, filePath: string) => {
    try {
      if (!existsSync(filePath)) {
        return { success: false, error: 'File not found' }
      }
      const content = readFileSync(filePath, 'utf-8')
      return { success: true, content }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  // Reading Order IPC handlers
  const getReadingOrderPath = (projectSettingsPath: string): string => {
    const projectDir = dirname(projectSettingsPath)
    return join(projectDir, 'storystudioworld.readingorder.json')
  }

  ipcMain.handle('read-reading-order', async (_, projectSettingsPath: string): Promise<ReadingOrderConfig | null> => {
    try {
      const readingOrderPath = getReadingOrderPath(projectSettingsPath)
      if (!existsSync(readingOrderPath)) {
        return null
      }
      const content = readFileSync(readingOrderPath, 'utf-8')
      return JSON.parse(content) as ReadingOrderConfig
    } catch (e) {
      console.error('Failed to read reading order:', e)
      return null
    }
  })

  ipcMain.handle('write-reading-order', async (_, projectSettingsPath: string, config: ReadingOrderConfig): Promise<void> => {
    try {
      const readingOrderPath = getReadingOrderPath(projectSettingsPath)
      const projectDir = dirname(readingOrderPath)
      if (!existsSync(projectDir)) {
        mkdirSync(projectDir, { recursive: true })
      }
      writeFileSync(readingOrderPath, JSON.stringify(config, null, 2), 'utf-8')
    } catch (e) {
      console.error('Failed to write reading order:', e)
      throw e
    }
  })

  // Export Story IPC handler
  ipcMain.handle('export-story', async (_, input: {
    projectSettingsPath: string
    format: 'txt' | 'md' | 'pdf' | 'epub' | 'docx'
    mode: 'single' | 'readingOrder'
    nodeId: string | null
    nodeName: string
    fileName: string
  }) => {
    try {
      const { projectSettingsPath, format, mode, nodeId, nodeName, fileName } = input
      const projectDir = dirname(projectSettingsPath)

      // 显示保存对话框 - 使用用户选择的格式
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: `${fileName || 'exported-story'}.${format}`,
        filters: [
          { name: format.toUpperCase(), extensions: [format] }
        ]
      })

      if (canceled || !filePath) {
        return { success: false, error: 'Export cancelled' }
      }

      // 获取项目信息
      const project = await loadProject(projectSettingsPath)
      const contents: ExportContent[] = []

      if (mode === 'single' && nodeId) {
        // 导出单章
        const nodeContent = await readNodeContent({ projectSettingsPath, nodeId })
        if (nodeContent) {
          contents.push({
            title: nodeName || 'Untitled',
            content: nodeContent
          })
        }
      } else if (mode === 'readingOrder') {
        // 按照阅读编排导出
        const readingOrderPath = join(projectDir, 'storystudioworld.readingorder.json')
        if (existsSync(readingOrderPath)) {
          const readingOrderContent = readFileSync(readingOrderPath, 'utf-8')
          const readingOrder = JSON.parse(readingOrderContent) as ReadingOrderConfig

          for (const item of readingOrder.items) {
            const nodeContent = await readNodeContent({ projectSettingsPath, nodeId: item.nodeId })
            if (nodeContent) {
              contents.push({
                title: item.title,
                content: nodeContent
              })
            }
          }
        }
      }

      if (contents.length === 0) {
        return { success: false, error: 'No content to export' }
      }

      // 根据格式选择导出方式
      switch (format) {
        case 'docx':
          await exportToDocx({
            filePath,
            contents,
            projectName: project.projectName
          })
          break
        case 'pdf':
          await exportToPdf({
            filePath,
            contents,
            projectName: project.projectName
          })
          break
        case 'epub':
          await exportToEpub({
            filePath,
            contents,
            projectName: project.projectName
          })
          break
        case 'txt':
          exportToTxt(filePath, contents)
          break
        case 'md':
          exportToMarkdown(filePath, contents)
          break
        default:
          return { success: false, error: `Unsupported format: ${format}` }
      }

      return { success: true, filePath }
    } catch (error) {
      console.error('Export story failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Pick Wiki Export Path
  ipcMain.handle('pick-wiki-export-path', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Wiki Export Folder'
    })
    if (canceled || filePaths.length === 0) {
      return null
    }
    return filePaths[0]
  })

  // Export Wiki IPC handler
  ipcMain.handle('export-wiki', async (_, input: {
    projectSettingsPath: string
    exportPath: string
    language: string
    includeChapters: boolean
    i18nStrings: Record<string, string>
  }) => {
    try {
      const { projectSettingsPath, exportPath, language, includeChapters, i18nStrings } = input

      const project = await loadProject(projectSettingsPath)
      const rawNodes = await getProjectNodes(projectSettingsPath)

      const settingFileIds = new Set(
        rawNodes.filter((n) => n.type === 'file' && n.kind === 'setting').map((n) => n.id)
      )

      const storyFileIds = new Set(
        rawNodes.filter((n) => n.type === 'file' && n.kind === 'story').map((n) => n.id)
      )

      const includedFileIds = new Set([...settingFileIds])
      if (includeChapters) {
        storyFileIds.forEach((id) => includedFileIds.add(id))
      }

      const ancestorIds = new Set<string>()
      for (const node of rawNodes) {
        if (includedFileIds.has(node.id)) {
          let current = node
          while (current.parentId) {
            ancestorIds.add(current.parentId)
            current = rawNodes.find((n) => n.id === current.parentId) || current
            if (!current.parentId) break
          }
        }
      }

      const wikiNodes: WikiNode[] = []
      for (const node of rawNodes) {
        if (node.type === 'file' && !includedFileIds.has(node.id)) continue
        if (node.type === 'folder' && !ancestorIds.has(node.id)) continue

        let content: string | null = null
        let summary: string | null = null
        let outline: string | null = null
        let gallery: WikiGalleryItem[] = []

        if (node.type === 'file') {
          content = await readNodeContent({ projectSettingsPath, nodeId: node.id })
          if (node.kind === 'story') {
            const meta = await getNodeSummaryAndOutline(projectSettingsPath, node.id)
            summary = meta.summary
            outline = meta.outline
          }
          try {
            const galleryImages = await getGalleryImages(projectSettingsPath, node.id)
            gallery = galleryImages.map((img) => ({
              id: img.id,
              fileName: img.fileName,
              caption: img.caption,
              isTheme: img.isTheme,
              dataUrl: img.dataUrl
            }))
          } catch { /* ignore gallery errors */ }
        }

        wikiNodes.push({
          id: node.id,
          parentId: node.parentId,
          name: node.name,
          type: node.type,
          kind: node.kind,
          content,
          summary,
          outline,
          sortOrder: node.sortOrder,
          gallery
        })
      }

      exportToWiki({
        exportPath,
        projectName: project.projectName,
        nodes: wikiNodes,
        language,
        includeChapters,
        i18nStrings
      })

      return { success: true, exportPath }
    } catch (error) {
      console.error('Export wiki failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Gallery IPC Handlers
  ipcMain.handle('gallery:get-images', async (_, { projectSettingsPath, nodeId }) => {
    try {
      return await getGalleryImages(projectSettingsPath, nodeId)
    } catch (error) {
      console.error('Get gallery images failed:', error)
      return []
    }
  })

  ipcMain.handle('gallery:upload-image', async (_, { projectSettingsPath, nodeId }) => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        title: 'Select Image',
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'] }
        ]
      })
      if (canceled || filePaths.length === 0) return null

      return await uploadGalleryImage(projectSettingsPath, nodeId, filePaths[0])
    } catch (error) {
      console.error('Upload gallery image failed:', error)
      return null
    }
  })

  ipcMain.handle('gallery:update-caption', async (_, { projectSettingsPath, itemId, caption }) => {
    await updateGalleryImageCaption(projectSettingsPath, itemId, caption)
  })

  ipcMain.handle('gallery:reorder', async (_, { projectSettingsPath, itemIds }) => {
    await reorderGalleryImages(projectSettingsPath, itemIds)
  })

  ipcMain.handle('gallery:set-theme', async (_, { projectSettingsPath, nodeId, itemId }) => {
    await setGalleryThemeImage(projectSettingsPath, nodeId, itemId)
  })

  ipcMain.handle('gallery:unset-theme', async (_, { projectSettingsPath, nodeId }) => {
    await unsetGalleryThemeImage(projectSettingsPath, nodeId)
  })

  ipcMain.handle('gallery:remove', async (_, { projectSettingsPath, itemId }) => {
    await removeGalleryImage(projectSettingsPath, itemId)
  })

  // Plugin Native APIs
  const execAsync = promisify(exec)

  ipcMain.handle('plugin-native:fetch', async (_, url: string, options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    headers?: Record<string, string>
    body?: string
    timeout?: number
  }) => {
    try {
      const controller = new AbortController()
      const timeout = options?.timeout || 30000
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const fetchOptions: RequestInit = {
        method: options?.method || 'GET',
        headers: options?.headers,
        body: options?.body,
        signal: controller.signal
      }

      const response = await fetch(url, fetchOptions)
      clearTimeout(timeoutId)

      const headers: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        headers[key] = value
      })

      const body = await response.text()

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers,
        body
      }
    } catch (e) {
      return {
        ok: false,
        status: 0,
        statusText: e instanceof Error ? e.message : String(e),
        headers: {},
        body: ''
      }
    }
  })

  ipcMain.handle('plugin-native:fetchStream', async (event, streamId: string, url: string, options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    headers?: Record<string, string>
    body?: string
    timeout?: number
  }) => {
    try {
      const controller = new AbortController()
      const timeout = options?.timeout || 120000
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const fetchOptions: RequestInit = {
        method: options?.method || 'GET',
        headers: options?.headers,
        body: options?.body,
        signal: controller.signal
      }

      const response = await fetch(url, fetchOptions)
      clearTimeout(timeoutId)

      const headers: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        headers[key] = value
      })

      event.sender.send(`plugin-native:fetchStream:${streamId}:start`, {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers
      })

      if (!response.ok) {
        const errorBody = await response.text()
        event.sender.send(`plugin-native:fetchStream:${streamId}:error`, {
          message: `HTTP ${response.status}: ${errorBody}`
        })
        return { started: false }
      }

      if (!response.body) {
        event.sender.send(`plugin-native:fetchStream:${streamId}:error`, {
          message: 'Response body is null'
        })
        return { started: false }
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read()

        if (done) {
          event.sender.send(`plugin-native:fetchStream:${streamId}:end`)
          return
        }

        const chunk = decoder.decode(value, { stream: true })
        event.sender.send(`plugin-native:fetchStream:${streamId}:chunk`, { chunk })

        return pump()
      }

      pump().catch((err) => {
        event.sender.send(`plugin-native:fetchStream:${streamId}:error`, {
          message: err instanceof Error ? err.message : String(err)
        })
      })

      return { started: true }
    } catch (e) {
      event.sender.send(`plugin-native:fetchStream:${streamId}:error`, {
        message: e instanceof Error ? e.message : String(e)
      })
      return { started: false }
    }
  })

  ipcMain.handle('plugin-native:fetchStreamAbort', async () => {
    return { aborted: true }
  })

  ipcMain.handle('plugin-native:readFile', async (_, path: string, encoding: BufferEncoding = 'utf-8') => {
    try {
      if (!existsSync(path)) {
        return { success: false, error: 'File not found' }
      }
      const content = readFileSync(path, encoding)
      return { success: true, content }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('plugin-native:writeFile', async (_, path: string, content: string) => {
    try {
      const dir = join(path, '..')
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(path, content, 'utf-8')
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('plugin-native:exists', async (_, path: string) => {
    return existsSync(path)
  })

  ipcMain.handle('plugin-native:mkdir', async (_, path: string) => {
    try {
      mkdirSync(path, { recursive: true })
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('plugin-native:readdir', async (_, path: string) => {
    try {
      if (!existsSync(path)) {
        return { success: false, error: 'Directory not found' }
      }
      const entries = readdirSync(path, { withFileTypes: true })
      return { success: true, entries: entries.map(e => e.name) }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('plugin-native:unlink', async (_, path: string) => {
    try {
      if (!existsSync(path)) {
        return { success: false, error: 'File not found' }
      }
      unlinkSync(path)
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('plugin-native:exec', async (_, command: string, cwd?: string) => {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || app.getPath('userData'),
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024
      })
      return { stdout, stderr }
    } catch (e) {
      return {
        stdout: '',
        stderr: '',
        error: e instanceof Error ? e.message : String(e)
      }
    }
  })

  ipcMain.handle('plugin-native:getAppPath', async (_, name: 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents') => {
    return app.getPath(name)
  })

  ipcMain.on('toggle-devtools', () => {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools()
    } else {
      mainWindow.webContents.openDevTools()
    }
  })

  ipcMain.on('open-new-window', () => {
    createWindow()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  pluginLoader.init()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
