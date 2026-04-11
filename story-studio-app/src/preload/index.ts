import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
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
  createStoryNode: (input: CreateStoryNodeInput): Promise<ProjectData> =>
    ipcRenderer.invoke('create-story-node', input),
  renameStoryNode: (input: RenameStoryNodeInput): Promise<ProjectData> =>
    ipcRenderer.invoke('rename-story-node', input),
  toggleVolumeCollapsed: (input: ToggleVolumeInput): Promise<ProjectData> =>
    ipcRenderer.invoke('toggle-volume-collapsed', input),
  reorderVolumes: (input: ReorderVolumeInput): Promise<ProjectData> =>
    ipcRenderer.invoke('reorder-volumes', input),
  moveChapterToVolume: (input: MoveChapterInput): Promise<ProjectData> =>
    ipcRenderer.invoke('move-chapter-to-volume', input)
}

export interface StoryChapter {
  id: string
  name: string
  fileName: string
}

export interface StoryVolume {
  id: string
  name: string
  folderName: string
  collapsed: boolean
  chapters: StoryChapter[]
}

export interface ProjectData {
  version: number
  projectName: string
  description: string
  projectPath: string
  projectSettingsPath: string
  storyVolumes: StoryVolume[]
}

export interface CreateProjectInput {
  projectName: string
  description: string
  projectPath: string
}

export interface CreateStoryNodeInput {
  projectSettingsPath: string
  nodeType: 'volume' | 'chapter'
  parentVolumeId?: string
}

export interface RenameStoryNodeInput {
  projectSettingsPath: string
  nodeType: 'volume' | 'chapter'
  nodeId: string
  nextName: string
}

export interface ToggleVolumeInput {
  projectSettingsPath: string
  volumeId: string
}

export interface ReorderVolumeInput {
  projectSettingsPath: string
  draggedVolumeId: string
  targetVolumeId: string
}

export interface MoveChapterInput {
  projectSettingsPath: string
  chapterId: string
  targetVolumeId: string
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
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
