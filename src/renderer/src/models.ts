export type ActivityType = 'chapter' | 'setting' | 'plugin' | 'archive' | string
export type RightActivityType = 'chapterMeta' | 'proofread' | 'memo' | 'snapshot' | string

export interface StoryNode {
  id: string
  parentId: string | null
  name: string
  type: 'folder' | 'file'
  kind: 'story' | 'setting'
  fileName: string | null
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

export interface RecentProject {
  projectSettingsPath: string
  name: string
}

export interface Tab {
  id: string
  title: string
  type: 'welcome' | 'file' | 'create-project' | 'about' | 'preferences' | 'archive'
  path?: string
  nodeId?: string
  kind?: 'story' | 'setting'
  field?: string
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
