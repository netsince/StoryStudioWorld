export type ActivityType = 'chapter' | 'character' | 'setting' | 'plugin'
export type RightActivityType = 'proofread' | 'memo' | 'archive'

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

export interface RecentProject {
  projectSettingsPath: string
  name: string
}

export interface Tab {
  id: string
  title: string
  type: 'welcome' | 'file' | 'create-project'
  path?: string
  isDirty?: boolean
  isPinned?: boolean
}

export interface EditorGroupNode {
  kind: 'group'
  id: string
  tabs: Tab[]
  activeTabId: string
}

export interface EditorSplitNode {
  kind: 'split'
  id: string
  direction: 'row' | 'column'
  ratio: number
  first: EditorNode
  second: EditorNode
}

export type EditorNode = EditorGroupNode | EditorSplitNode
