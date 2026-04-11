import { ElectronAPI } from '@electron-toolkit/preload'
import {
  CreateProjectInput,
  CreateStoryNodeInput,
  MoveChapterInput,
  ProjectData,
  RenameStoryNodeInput,
  ReorderVolumeInput,
  ToggleVolumeInput
} from './index'

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
      createStoryNode: (input: CreateStoryNodeInput) => Promise<ProjectData>
      renameStoryNode: (input: RenameStoryNodeInput) => Promise<ProjectData>
      toggleVolumeCollapsed: (input: ToggleVolumeInput) => Promise<ProjectData>
      reorderVolumes: (input: ReorderVolumeInput) => Promise<ProjectData>
      moveChapterToVolume: (input: MoveChapterInput) => Promise<ProjectData>
    }
  }
}
