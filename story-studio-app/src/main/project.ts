import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { basename, dirname, join, normalize } from 'path'
import {
  STORY_DB_FILE,
  initDatabase,
  saveDatabase,
  loadDatabase,
  getNodes,
  getChildNodes,
  createNode,
  renameNode,
  deleteNode,
  deleteNodeRecursively,
  moveNode,
  reorderNode,
  getNodeContent,
  updateNodeContent,
  StoryNode
} from './db'

export const PROJECT_SETTINGS_FILE = 'storystudioworld.sswprojectsetting'
const PROJECT_VERSION = 2

export interface ProjectData {
  version: number
  projectName: string
  description: string
  projectPath: string
  projectSettingsPath: string
  storyDbPath: string
}

interface PersistedProjectData {
  version: number
  projectName: string
  description: string
}

export interface CreateProjectInput {
  projectName: string
  description: string
  projectPath: string
}

export interface CreateNodeInput {
  projectSettingsPath: string
  parentId: string | null
  name: string
  type: 'folder' | 'file'
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
  newSortOrder: number
}

export interface ReadNodeContentInput {
  projectSettingsPath: string
  nodeId: string
}

export interface WriteNodeContentInput {
  projectSettingsPath: string
  nodeId: string
  content: string
}

function normalizeProjectPath(projectPath: string): string {
  return normalize(projectPath.trim())
}

function normalizeProjectSettingsPath(projectSettingsPath: string): string {
  return normalize(projectSettingsPath.trim())
}

function stripMd(name: string): string {
  return name.replace(/\.md$/i, '').trim()
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath)
    return true
  } catch {
    return false
  }
}

async function ensureDirectoryEmpty(projectPath: string): Promise<void> {
  if (!(await pathExists(projectPath))) {
    await mkdir(projectPath, { recursive: true })
    return
  }

  const state = await stat(projectPath)
  if (!state.isDirectory()) {
    throw new Error('项目路径必须是一个文件夹。')
  }

  const fs = await import('fs/promises')
  const entries = await fs.readdir(projectPath)
  if (entries.length > 0) {
    throw new Error('项目路径必须为空文件夹。')
  }
}

function getSettingsPath(projectPath: string): string {
  return join(projectPath, PROJECT_SETTINGS_FILE)
}

function getStoryDbPath(projectPath: string): string {
  return join(projectPath, STORY_DB_FILE)
}

async function writeProjectSettings(project: ProjectData): Promise<void> {
  const persisted: PersistedProjectData = {
    version: project.version,
    projectName: project.projectName,
    description: project.description
  }

  await writeFile(getSettingsPath(project.projectPath), JSON.stringify(persisted, null, 2), 'utf-8')
}

async function readProjectSettings(projectPath: string): Promise<PersistedProjectData> {
  const settingsPath = getSettingsPath(projectPath)
  if (!(await pathExists(settingsPath))) {
    throw new Error('当前文件夹不是有效的 Story Studio World 项目。')
  }

  const raw = await readFile(settingsPath, 'utf-8')
  return JSON.parse(raw) as PersistedProjectData
}

function withProjectPath(projectPath: string, data: PersistedProjectData): ProjectData {
  return {
    version: data.version ?? PROJECT_VERSION,
    projectName: data.projectName ?? basename(projectPath),
    description: data.description ?? '',
    projectPath,
    projectSettingsPath: getSettingsPath(projectPath),
    storyDbPath: getStoryDbPath(projectPath)
  }
}

export async function createProject(input: CreateProjectInput): Promise<ProjectData> {
  const projectPath = normalizeProjectPath(input.projectPath)
  const projectName = input.projectName.trim()

  if (!projectName) {
    throw new Error('请填写项目名。')
  }

  await ensureDirectoryEmpty(projectPath)
  await mkdir(join(projectPath, 'character'), { recursive: true })
  await mkdir(join(projectPath, 'worldviewsetting'), { recursive: true })

  const storyDbPath = getStoryDbPath(projectPath)
  const db = await initDatabase(storyDbPath)

  createNode(db, null, '故事', 'file')

  await saveDatabase(db, storyDbPath)
  db.close()

  const project: ProjectData = {
    version: PROJECT_VERSION,
    projectName,
    description: input.description.trim(),
    projectPath,
    projectSettingsPath: getSettingsPath(projectPath),
    storyDbPath
  }

  await writeProjectSettings(project)
  return project
}

export async function loadProject(projectPathInput: string): Promise<ProjectData> {
  const projectSettingsPath = normalizeProjectSettingsPath(projectPathInput)
  if (basename(projectSettingsPath) !== PROJECT_SETTINGS_FILE) {
    throw new Error(`请选择 ${PROJECT_SETTINGS_FILE} 文件。`)
  }

  const projectPath = dirname(projectSettingsPath)
  const settings = await readProjectSettings(projectPath)
  return withProjectPath(projectPath, settings)
}

export async function getProjectNodes(projectPathInput: string): Promise<StoryNode[]> {
  const project = await loadProject(projectPathInput)
  const db = await loadDatabase(project.storyDbPath)
  const nodes = getNodes(db)
  db.close()
  return nodes
}

export async function getChildNodesByParent(projectPathInput: string, parentId: string | null): Promise<StoryNode[]> {
  const project = await loadProject(projectPathInput)
  const db = await loadDatabase(project.storyDbPath)
  const nodes = getChildNodes(db, parentId)
  db.close()
  return nodes
}

export async function createStoryNode(input: CreateNodeInput): Promise<StoryNode[]> {
  const project = await loadProject(input.projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)

  const name = input.type === 'file' ? stripMd(input.name) : input.name
  createNode(db, input.parentId, name, input.type)

  await saveDatabase(db, project.storyDbPath)
  const nodes = getNodes(db)
  db.close()
  return nodes
}

export async function renameStoryNode(input: RenameNodeInput): Promise<StoryNode[]> {
  const project = await loadProject(input.projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)

  renameNode(db, input.nodeId, input.newName)

  await saveDatabase(db, project.storyDbPath)
  const nodes = getNodes(db)
  db.close()
  return nodes
}

export async function deleteStoryNode(input: DeleteNodeInput): Promise<StoryNode[]> {
  const project = await loadProject(input.projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)

  const stmt = db.prepare(`SELECT type FROM nodes WHERE id = ?`)
  stmt.bind([input.nodeId])
  let type: string | null = null
  if (stmt.step()) {
    type = (stmt.getAsObject() as { type: string }).type
  }
  stmt.free()
  if (type !== null) {
    if (type === 'folder') {
      deleteNodeRecursively(db, input.nodeId)
    } else {
      deleteNode(db, input.nodeId)
    }
  }

  await saveDatabase(db, project.storyDbPath)
  const nodes = getNodes(db)
  db.close()
  return nodes
}

export async function moveStoryNode(input: MoveNodeInput): Promise<StoryNode[]> {
  const project = await loadProject(input.projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)

  moveNode(db, input.nodeId, input.newParentId)

  await saveDatabase(db, project.storyDbPath)
  const nodes = getNodes(db)
  db.close()
  return nodes
}

export async function reorderStoryNode(input: ReorderNodeInput): Promise<StoryNode[]> {
  const project = await loadProject(input.projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)

  reorderNode(db, input.nodeId, input.newSortOrder)

  await saveDatabase(db, project.storyDbPath)
  const nodes = getNodes(db)
  db.close()
  return nodes
}

export async function readNodeContent(input: ReadNodeContentInput): Promise<string | null> {
  const project = await loadProject(input.projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)
  const content = getNodeContent(db, input.nodeId)
  db.close()
  return content
}

export async function writeNodeContent(input: WriteNodeContentInput): Promise<void> {
  const project = await loadProject(input.projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)
  updateNodeContent(db, input.nodeId, input.content)
  await saveDatabase(db, project.storyDbPath)
  db.close()
}

export async function clearProjectDirectory(projectPath: string): Promise<void> {
  if (await pathExists(projectPath)) {
    await rm(projectPath, { recursive: true, force: true })
  }
}

export function buildNodeTree(nodes: StoryNode[]): Map<string | null, StoryNode[]> {
  const tree = new Map<string | null, StoryNode[]>()

  for (const node of nodes) {
    const parentId = node.parentId
    if (!tree.has(parentId)) {
      tree.set(parentId, [])
    }
    tree.get(parentId)!.push(node)
  }

  for (const children of tree.values()) {
    children.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  return tree
}
