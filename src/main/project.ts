import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { basename, dirname, join, normalize } from 'path'
import { existsSync, copyFileSync, unlinkSync, mkdirSync } from 'fs'
import {
  STORY_DB_FILE,
  initDatabase,
  saveDatabase,
  loadDatabase,
  getNodes,
  getArchivedNodes,
  getChildNodes,
  createNode,
  renameNode,
  deleteNode,
  deleteNodeRecursively,
  permanentlyDeleteNode,
  restoreNode,
  moveNode,
  getNodeContent,
  updateNodeContent,
  getNodeSummary,
  updateNodeSummary,
  getNodeOutline,
  updateNodeOutline,
  StoryNode,
  getGalleryByNodeId,
  createGalleryItem,
  updateGalleryCaption,
  updateGallerySortOrder,
  setGalleryTheme,
  unsetGalleryTheme,
  deleteGalleryItem,
  getGalleryItem,
  type GalleryItem
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

export async function initSettingNodes(projectSettingsPath: string): Promise<StoryNode[]> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)

  const existingNodes = getNodes(db).filter((n) => n.kind === 'setting' && n.parentId === null)
  const defaultCategories = ['character', 'location', 'worldview', 'item', 'other']

  let changed = false
  for (const name of defaultCategories) {
    if (!existingNodes.some((n) => n.name === name)) {
      createNode(db, null, name, 'folder', 'setting')
      changed = true
    }
  }

  if (changed) {
    await saveDatabase(db, project.storyDbPath)
  }

  const nodes = getNodes(db)
  db.close()
  return nodes
}

export async function createProject(input: CreateProjectInput): Promise<ProjectData> {
  const projectPath = normalizeProjectPath(input.projectPath)
  const projectName = input.projectName.trim()

  if (!projectName) {
    throw new Error('请填写项目名。')
  }

  await ensureDirectoryEmpty(projectPath)

  const storyDbPath = getStoryDbPath(projectPath)
  const db = await initDatabase(storyDbPath)

  createNode(db, null, input.defaultStoryName || 'Story', 'file')

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

export async function getChildNodesByParent(
  projectPathInput: string,
  parentId: string | null
): Promise<StoryNode[]> {
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
  createNode(db, input.parentId, name, input.type, input.kind || 'story')

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

  try {
    // 获取要移动的节点和目标节点
    const stmt = db.prepare(`SELECT id, parentId, sortOrder FROM nodes WHERE id IN (?, ?)`)
    stmt.bind([input.nodeId, input.targetNodeId])

    let sourceNode: { id: string; parentId: string | null; sortOrder: number } | null = null
    let targetNode: { id: string; parentId: string | null; sortOrder: number } | null = null

    while (stmt.step()) {
      const row = stmt.getAsObject() as { id: string; parentId: string | null; sortOrder: number }
      if (row.id === input.nodeId) {
        sourceNode = row
      } else if (row.id === input.targetNodeId) {
        targetNode = row
      }
    }
    stmt.free()

    if (!sourceNode || !targetNode) {
      throw new Error('节点不存在')
    }

    // 确保在同一层级
    if (sourceNode.parentId !== targetNode.parentId) {
      throw new Error('只能同层级排序')
    }

    const newSortOrder =
      input.position === 'before' ? targetNode.sortOrder - 1 : targetNode.sortOrder + 1

    // 更新源节点的 sortOrder
    const now = new Date().toISOString()
    db.run(`UPDATE nodes SET sortOrder = ?, updatedAt = ? WHERE id = ?`, [
      newSortOrder,
      now,
      input.nodeId
    ])

    await saveDatabase(db, project.storyDbPath)
    const nodes = getNodes(db)
    return nodes
  } finally {
    try {
      db.close()
    } catch (closeError) {
      console.error('Failed to close database connection:', closeError)
    }
  }
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

export async function getNodeSummaryAndOutline(
  projectSettingsPath: string,
  nodeId: string
): Promise<{ summary: string | null; outline: string | null }> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)
  const summary = getNodeSummary(db, nodeId)
  const outline = getNodeOutline(db, nodeId)
  db.close()
  return { summary, outline }
}

export async function updateNodeSummaryAndOutline(
  projectSettingsPath: string,
  nodeId: string,
  summary: string,
  outline: string
): Promise<void> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)
  updateNodeSummary(db, nodeId, summary)
  updateNodeOutline(db, nodeId, outline)
  await saveDatabase(db, project.storyDbPath)
  db.close()
}

export async function getArchivedNodesProject(projectSettingsPath: string): Promise<StoryNode[]> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)
  const nodes = getArchivedNodes(db)
  db.close()
  return nodes
}

export async function restoreArchivedNode(projectSettingsPath: string, nodeId: string, newParentId: string | null = null): Promise<StoryNode[]> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)
  
  restoreNode(db, nodeId, newParentId)
  
  await saveDatabase(db, project.storyDbPath)
  const nodes = getNodes(db)
  db.close()
  return nodes
}

export async function permanentlyDeleteProjectNode(input: DeleteNodeInput): Promise<StoryNode[]> {
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
    permanentlyDeleteNode(db, input.nodeId)
  }

  await saveDatabase(db, project.storyDbPath)
  const nodes = getNodes(db)
  db.close()
  return nodes
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

// ==================== Gallery Functions ====================

function getAttachmentsDir(projectSettingsPath: string): string {
  const projectDir = dirname(projectSettingsPath)
  return join(projectDir, 'attachments')
}

function getGalleryFilePath(projectSettingsPath: string, itemId: string, fileName: string): string {
  return join(getAttachmentsDir(projectSettingsPath), `${itemId}_${fileName}`)
}

export async function getGalleryImages(projectSettingsPath: string, nodeId: string): Promise<(GalleryItem & { dataUrl: string })[]> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)
  const items = getGalleryByNodeId(db, nodeId)
  db.close()

  const attachmentsDir = getAttachmentsDir(projectSettingsPath)
  const result: (GalleryItem & { dataUrl: string })[] = []

  for (const item of items) {
    const filePath = join(attachmentsDir, `${item.id}_${item.fileName}`)
    try {
      const buffer = await readFile(filePath)
      const base64 = buffer.toString('base64')
      const ext = item.fileName.split('.').pop()?.toLowerCase()
      const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
      result.push({ ...item, dataUrl: `data:${mime};base64,${base64}` })
    } catch {
      result.push({ ...item, dataUrl: '' })
    }
  }

  return result
}

export async function uploadGalleryImage(
  projectSettingsPath: string,
  nodeId: string,
  sourceFilePath: string
): Promise<GalleryItem & { dataUrl: string }> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)
  const existing = getGalleryByNodeId(db, nodeId)
  const sortOrder = existing.length
  const fileName = basename(sourceFilePath)
  const item = createGalleryItem(db, nodeId, fileName, sortOrder)
  await saveDatabase(db, project.storyDbPath)
  db.close()

  const attachmentsDir = getAttachmentsDir(projectSettingsPath)
  if (!existsSync(attachmentsDir)) {
    mkdirSync(attachmentsDir, { recursive: true })
  }
  const destPath = join(attachmentsDir, `${item.id}_${fileName}`)
  copyFileSync(sourceFilePath, destPath)

  const buffer = await readFile(destPath)
  const base64 = buffer.toString('base64')
  const ext = fileName.split('.').pop()?.toLowerCase()
  const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg'

  return { ...item, dataUrl: `data:${mime};base64,${base64}` }
}

export async function updateGalleryImageCaption(
  projectSettingsPath: string,
  itemId: string,
  caption: string
): Promise<void> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)
  updateGalleryCaption(db, itemId, caption)
  await saveDatabase(db, project.storyDbPath)
  db.close()
}

export async function reorderGalleryImages(
  projectSettingsPath: string,
  itemIds: string[]
): Promise<void> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)
  for (let i = 0; i < itemIds.length; i++) {
    updateGallerySortOrder(db, itemIds[i], i)
  }
  await saveDatabase(db, project.storyDbPath)
  db.close()
}

export async function setGalleryThemeImage(
  projectSettingsPath: string,
  nodeId: string,
  itemId: string
): Promise<void> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)
  setGalleryTheme(db, nodeId, itemId)
  await saveDatabase(db, project.storyDbPath)
  db.close()
}

export async function unsetGalleryThemeImage(
  projectSettingsPath: string,
  nodeId: string
): Promise<void> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)
  unsetGalleryTheme(db, nodeId)
  await saveDatabase(db, project.storyDbPath)
  db.close()
}

export async function removeGalleryImage(
  projectSettingsPath: string,
  itemId: string
): Promise<void> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)
  const item = getGalleryItem(db, itemId)
  deleteGalleryItem(db, itemId)
  await saveDatabase(db, project.storyDbPath)
  db.close()

  if (item) {
    const filePath = getGalleryFilePath(projectSettingsPath, item.id, item.fileName)
    try { unlinkSync(filePath) } catch { /* ignore */ }
  }
}

export async function getGalleryImageBuffer(
  projectSettingsPath: string,
  itemId: string
): Promise<Buffer | null> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)
  const item = getGalleryItem(db, itemId)
  db.close()

  if (!item) return null

  const filePath = getGalleryFilePath(projectSettingsPath, item.id, item.fileName)
  try {
    return await readFile(filePath)
  } catch {
    return null
  }
}
