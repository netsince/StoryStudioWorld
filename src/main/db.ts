import initSqlJs, { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import { dirname } from 'path'

export const STORY_DB_FILE = 'story.db'

export interface StoryNode {
  id: string
  parentId: string | null
  name: string
  type: 'folder' | 'file'
  kind: 'story' | 'setting'
  fileName: string | null
  content: string | null
  summary: string | null
  outline: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

let SQL: initSqlJs.SqlJsStatic | null = null

async function getSqlJs(): Promise<initSqlJs.SqlJsStatic> {
  if (!SQL) {
    SQL = await initSqlJs()
  }
  return SQL
}

export async function initDatabase(dbPath: string): Promise<Database> {
  const SqlJs = await getSqlJs()
  let db: Database

  try {
    const buffer = await (await import('fs/promises')).readFile(dbPath)
    db = new SqlJs.Database(buffer)
  } catch {
    db = new SqlJs.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      parentId TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('folder', 'file')),
      kind TEXT NOT NULL DEFAULT 'story' CHECK (kind IN ('story', 'setting')),
      fileName TEXT,
      content TEXT,
      summary TEXT,
      outline TEXT,
      sortOrder INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deletedAt TEXT,
      FOREIGN KEY (parentId) REFERENCES nodes(id) ON DELETE CASCADE
    )
  `)

  db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_parentId ON nodes(parentId)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_sortOrder ON nodes(sortOrder)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_deletedAt ON nodes(deletedAt)`)

  // 快照表
  db.run(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      nodeCount INTEGER DEFAULT 0,
      storyCount INTEGER DEFAULT 0,
      settingCount INTEGER DEFAULT 0,
      nodesJson TEXT NOT NULL
    )
  `)

  db.run(`CREATE INDEX IF NOT EXISTS idx_snapshots_createdAt ON snapshots(createdAt)`)

  migrateDatabase(db)

  return db
}

function migrateDatabase(db: Database): void {
  const result = db.exec('PRAGMA table_info(nodes)')
  if (result.length === 0) return

  const columns = result[0].values.map((row) => row[1] as string)

  if (!columns.includes('kind')) {
    db.run("ALTER TABLE nodes ADD COLUMN kind TEXT NOT NULL DEFAULT 'story'")
  }

  if (!columns.includes('content')) {
    db.run('ALTER TABLE nodes ADD COLUMN content TEXT')
  }

  if (!columns.includes('summary')) {
    db.run('ALTER TABLE nodes ADD COLUMN summary TEXT')
  }

  if (!columns.includes('outline')) {
    db.run('ALTER TABLE nodes ADD COLUMN outline TEXT')
  }

  db.exec('DROP TABLE IF EXISTS node_metadata')
}

export async function saveDatabase(db: Database, dbPath: string): Promise<void> {
  const data = db.export()
  const buffer = Buffer.from(data)
  await mkdir(dirname(dbPath), { recursive: true })
  await writeFile(dbPath, buffer)
}

export async function loadDatabase(dbPath: string): Promise<Database> {
  return initDatabase(dbPath)
}

export function getNodes(db: Database): StoryNode[] {
  const stmt = db.prepare(`
    SELECT id, parentId, name, type, kind, fileName, content, summary, outline, sortOrder, createdAt, updatedAt, deletedAt
    FROM nodes
    WHERE deletedAt IS NULL
    ORDER BY sortOrder ASC, createdAt ASC
  `)

  const nodes: StoryNode[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject() as StoryNode
    nodes.push(row)
  }
  stmt.free()
  return nodes
}

export function getArchivedNodes(db: Database): StoryNode[] {
  const stmt = db.prepare(`
    SELECT id, parentId, name, type, kind, fileName, content, summary, outline, sortOrder, createdAt, updatedAt, deletedAt
    FROM nodes
    WHERE deletedAt IS NOT NULL
    ORDER BY deletedAt DESC
  `)

  const nodes: StoryNode[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject() as StoryNode
    nodes.push(row)
  }
  stmt.free()
  return nodes
}

export function restoreNode(db: Database, nodeId: string, newParentId: string | null | undefined = undefined): void {
  const node = getNodeWithDeleted(db, nodeId)
  if (!node) return

  const now = new Date().toISOString()
  
  // If we have a parent and it's archived, restore it first
  if (node.parentId) {
    const parent = getNodeWithDeleted(db, node.parentId)
    if (parent && parent.deletedAt !== null) {
      restoreNode(db, parent.id)
    }
  }

  if (newParentId !== undefined) {
    db.run(`UPDATE nodes SET deletedAt = NULL, updatedAt = ?, parentId = ? WHERE id = ?`, [now, newParentId, nodeId])
  } else {
    db.run(`UPDATE nodes SET deletedAt = NULL, updatedAt = ? WHERE id = ?`, [now, nodeId])
  }

  // Also restore children
  const stmt = db.prepare(`SELECT id FROM nodes WHERE parentId = ? AND deletedAt IS NOT NULL`)
  stmt.bind([nodeId])
  const childIds: string[] = []
  while (stmt.step()) {
    childIds.push((stmt.getAsObject() as { id: string }).id)
  }
  stmt.free()

  for (const childId of childIds) {
    restoreNode(db, childId)
  }
}

export function getNodeWithDeleted(db: Database, nodeId: string): StoryNode | null {
  const stmt = db.prepare(`
    SELECT id, parentId, name, type, kind, fileName, content, summary, outline, sortOrder, createdAt, updatedAt, deletedAt
    FROM nodes WHERE id = ?
  `)
  stmt.bind([nodeId])

  if (stmt.step()) {
    const node = stmt.getAsObject() as StoryNode
    stmt.free()
    return node
  }
  stmt.free()
  return null
}

export function getNode(db: Database, nodeId: string): StoryNode | null {
  const stmt = db.prepare(`
    SELECT id, parentId, name, type, kind, fileName, content, summary, outline, sortOrder, createdAt, updatedAt, deletedAt
    FROM nodes WHERE id = ? AND deletedAt IS NULL
  `)
  stmt.bind([nodeId])

  if (stmt.step()) {
    const node = stmt.getAsObject() as StoryNode
    stmt.free()
    return node
  }
  stmt.free()
  return null
}

export function getChildNodes(db: Database, parentId: string | null): StoryNode[] {
  const stmt = db.prepare(`
    SELECT id, parentId, name, type, kind, fileName, content, summary, outline, sortOrder, createdAt, updatedAt, deletedAt
    FROM nodes
    WHERE parentId IS ? AND deletedAt IS NULL
    ORDER BY sortOrder ASC, createdAt ASC
  `)
  stmt.bind([parentId])

  const nodes: StoryNode[] = []
  while (stmt.step()) {
    nodes.push(stmt.getAsObject() as StoryNode)
  }
  stmt.free()
  return nodes
}

export function getMaxSortOrder(db: Database, parentId: string | null): number {
  const stmt = db.prepare(`
    SELECT MAX(sortOrder) as maxOrder FROM nodes WHERE parentId IS ?
  `)
  stmt.bind([parentId])

  let maxOrder = 0
  if (stmt.step()) {
    const row = stmt.getAsObject() as { maxOrder: number | null }
    maxOrder = row.maxOrder ?? 0
  }
  stmt.free()
  return maxOrder
}

export function createNode(
  db: Database,
  parentId: string | null,
  name: string,
  type: 'folder' | 'file',
  kind: 'story' | 'setting' = 'story',
  content: string = ''
): StoryNode {
  const id = randomUUID()
  const now = new Date().toISOString()
  const sortOrder = getMaxSortOrder(db, parentId) + 1
  const fileName = type === 'file' ? `${name}.md` : null

  // 将内容包装为JSON格式
  const jsonContent = type === 'file' ? JSON.stringify({ content }) : null

  db.run(
    `INSERT INTO nodes (id, parentId, name, type, kind, fileName, content, sortOrder, createdAt, updatedAt, deletedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [id, parentId, name, type, kind, fileName, jsonContent, sortOrder, now, now]
  )

  return getNode(db, id)!
}

export function renameNode(db: Database, nodeId: string, newName: string): StoryNode | null {
  const node = getNode(db, nodeId)
  if (!node) return null

  const now = new Date().toISOString()
  const newFileName = node.type === 'file' ? `${newName}.md` : node.fileName

  db.run(`UPDATE nodes SET name = ?, fileName = ?, updatedAt = ? WHERE id = ?`, [
    newName,
    newFileName,
    now,
    nodeId
  ])

  return getNode(db, nodeId)
}

export function deleteNode(db: Database, nodeId: string): void {
  const node = getNode(db, nodeId)
  if (!node) return

  const now = new Date().toISOString()
  db.run(`UPDATE nodes SET deletedAt = ? WHERE id = ?`, [now, nodeId])
}

export function deleteNodeRecursively(db: Database, nodeId: string): void {
  const children = getChildNodes(db, nodeId)
  for (const child of children) {
    deleteNodeRecursively(db, child.id)
  }

  const node = getNode(db, nodeId)
  if (node) {
    const now = new Date().toISOString()
    db.run(`UPDATE nodes SET deletedAt = ? WHERE id = ?`, [now, nodeId])
  }
}

export function permanentlyDeleteNode(db: Database, nodeId: string): void {
  const stmt = db.prepare(`SELECT id FROM nodes WHERE parentId = ? AND deletedAt IS NULL`)
  stmt.bind([nodeId])
  while (stmt.step()) {
    const child = stmt.getAsObject() as { id: string }
    permanentlyDeleteNode(db, child.id)
  }
  stmt.free()

  db.run(`DELETE FROM nodes WHERE id = ?`, [nodeId])
}

export function moveNode(
  db: Database,
  nodeId: string,
  newParentId: string | null
): StoryNode | null {
  const node = getNode(db, nodeId)
  if (!node) return null

  if (newParentId) {
    const newParent = getNode(db, newParentId)
    if (!newParent || newParent.type !== 'folder') return null

    if (isDescendantOf(db, newParentId, nodeId)) return null
  }

  const now = new Date().toISOString()
  const sortOrder = getMaxSortOrder(db, newParentId) + 1

  db.run(`UPDATE nodes SET parentId = ?, sortOrder = ?, updatedAt = ? WHERE id = ?`, [
    newParentId,
    sortOrder,
    now,
    nodeId
  ])

  return getNode(db, nodeId)
}

function isDescendantOf(db: Database, nodeId: string, ancestorId: string): boolean {
  let currentId: string | null = nodeId

  while (currentId) {
    if (currentId === ancestorId) return true
    const node = getNode(db, currentId)
    currentId = node?.parentId ?? null
  }

  return false
}

export function reorderNode(db: Database, nodeId: string, newSortOrder: number): void {
  const node = getNode(db, nodeId)
  if (!node) return

  const now = new Date().toISOString()
  db.run(`UPDATE nodes SET sortOrder = ?, updatedAt = ? WHERE id = ?`, [newSortOrder, now, nodeId])
}

export function getNodeContent(db: Database, nodeId: string): string | null {
  const node = getNode(db, nodeId)
  if (!node || node.type !== 'file') return null
  
  // 兼容旧数据：如果 content 不是 JSON 格式，直接返回
  if (!node.content) return null
  
  try {
    const parsed = JSON.parse(node.content)
    return typeof parsed === 'object' && parsed !== null && 'content' in parsed 
      ? parsed.content 
      : node.content
  } catch {
    // 旧数据格式，直接返回原始内容
    return node.content
  }
}

export function updateNodeContent(db: Database, nodeId: string, content: string): void {
  const node = getNode(db, nodeId)
  if (!node || node.type !== 'file') return

  const now = new Date().toISOString()
  // 将内容包装为JSON格式
  const jsonContent = JSON.stringify({ content })
  db.run(`UPDATE nodes SET content = ?, updatedAt = ? WHERE id = ?`, [jsonContent, now, nodeId])
}

export function getNodeSummary(db: Database, nodeId: string): string | null {
  const node = getNode(db, nodeId)
  if (!node || node.type !== 'file') return null
  return node.summary
}

export function updateNodeSummary(db: Database, nodeId: string, summary: string): void {
  const node = getNode(db, nodeId)
  if (!node || node.type !== 'file') return

  const now = new Date().toISOString()
  db.run(`UPDATE nodes SET summary = ?, updatedAt = ? WHERE id = ?`, [summary, now, nodeId])
}

export function getNodeOutline(db: Database, nodeId: string): string | null {
  const node = getNode(db, nodeId)
  if (!node || node.type !== 'file') return null
  return node.outline
}

export function updateNodeOutline(db: Database, nodeId: string, outline: string): void {
  const node = getNode(db, nodeId)
  if (!node || node.type !== 'file') return

  const now = new Date().toISOString()
  db.run(`UPDATE nodes SET outline = ?, updatedAt = ? WHERE id = ?`, [outline, now, nodeId])
}

// ==================== Snapshot Functions ====================

export interface Snapshot {
  id: string
  name: string
  description: string | null
  createdAt: string
  nodeCount: number
  storyCount: number
  settingCount: number
  nodes: StoryNode[]
}

export function createSnapshot(
  db: Database,
  name: string,
  description: string | null,
  nodes: StoryNode[]
): Snapshot {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const nodeCount = nodes.length
  const storyCount = nodes.filter(n => n.kind === 'story').length
  const settingCount = nodes.filter(n => n.kind === 'setting').length

  db.run(
    `INSERT INTO snapshots (id, name, description, createdAt, nodeCount, storyCount, settingCount, nodesJson)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, description, createdAt, nodeCount, storyCount, settingCount, JSON.stringify(nodes)]
  )

  return {
    id,
    name,
    description,
    createdAt,
    nodeCount,
    storyCount,
    settingCount,
    nodes
  }
}

export function getAllSnapshots(db: Database): Snapshot[] {
  const stmt = db.prepare(`
    SELECT id, name, description, createdAt, nodeCount, storyCount, settingCount, nodesJson
    FROM snapshots
    ORDER BY createdAt DESC
  `)

  const snapshots: Snapshot[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    snapshots.push({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      createdAt: row.createdAt as string,
      nodeCount: row.nodeCount as number,
      storyCount: row.storyCount as number,
      settingCount: row.settingCount as number,
      nodes: JSON.parse(row.nodesJson as string) as StoryNode[]
    })
  }
  stmt.free()

  return snapshots
}

export function getSnapshot(db: Database, snapshotId: string): Snapshot | null {
  const stmt = db.prepare(`
    SELECT id, name, description, createdAt, nodeCount, storyCount, settingCount, nodesJson
    FROM snapshots WHERE id = ?
  `)
  stmt.bind([snapshotId])

  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()

    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      createdAt: row.createdAt as string,
      nodeCount: row.nodeCount as number,
      storyCount: row.storyCount as number,
      settingCount: row.settingCount as number,
      nodes: JSON.parse(row.nodesJson as string) as StoryNode[]
    }
  }

  stmt.free()
  return null
}

export function deleteSnapshot(db: Database, snapshotId: string): boolean {
  const stmt = db.prepare(`SELECT id FROM snapshots WHERE id = ?`)
  stmt.bind([snapshotId])
  const exists = stmt.step()
  stmt.free()

  if (!exists) return false

  db.run(`DELETE FROM snapshots WHERE id = ?`, [snapshotId])
  return true
}

export function restoreFromSnapshot(db: Database, snapshotId: string): boolean {
  const snapshot = getSnapshot(db, snapshotId)
  if (!snapshot) return false

  // 清除现有节点（硬删除）
  db.run(`DELETE FROM nodes`)

  // 恢复快照中的节点
  for (const node of snapshot.nodes) {
    db.run(
      `INSERT INTO nodes (id, parentId, name, type, kind, fileName, content, sortOrder, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        node.id,
        node.parentId,
        node.name,
        node.type,
        node.kind,
        node.fileName,
        node.content,
        node.sortOrder,
        node.createdAt,
        node.updatedAt,
        node.deletedAt
      ]
    )
  }

  return true
}

export function getAllNodesWithDeleted(db: Database): StoryNode[] {
  const stmt = db.prepare(`
    SELECT id, parentId, name, type, kind, fileName, content, summary, outline, sortOrder, createdAt, updatedAt, deletedAt
    FROM nodes
    ORDER BY sortOrder ASC, createdAt ASC
  `)

  const nodes: StoryNode[] = []
  while (stmt.step()) {
    nodes.push(stmt.getAsObject() as StoryNode)
  }
  stmt.free()

  return nodes
}
