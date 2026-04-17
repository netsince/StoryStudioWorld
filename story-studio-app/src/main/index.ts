import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  createProject,
  createStoryNode,
  loadProject,
  getProjectNodes,
  renameStoryNode,
  deleteStoryNode,
  moveStoryNode,
  reorderStoryNode,
  readNodeContent,
  writeNodeContent
} from './project'

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

  ipcMain.handle('open-project-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Story Studio World Project', extensions: ['sswprojectsetting'] }]
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

  ipcMain.handle(
    'create-story-node',
    async (
      _,
      input: {
        projectSettingsPath: string
        parentId: string | null
        name: string
        type: 'folder' | 'file'
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
        newSortOrder: number
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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

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
