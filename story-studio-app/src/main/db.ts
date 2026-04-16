import initSqlJs, { Database } from 'sql.js'
import { readFile, writeFile, mkdir, rm, rename } from 'fs/promises'
import { join, dirname } from 'path'
import { randomUUID } from 'crypto'

export const STORY_DB_FILE = 'story.db'

export interface StoryNode {
  id: string
  parentId: string | null
  name: string
  type: 'folder' | 'file'
  fileName: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface StoryNodeMetadata {
  nodeId: string
  tags: string | null
  description: string | null
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
    const buffer = await readFile(dbPath)
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
      fileName TEXT,
      sortOrder INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deletedAt TEXT,
      FOREIGN KEY (parentId) REFERENCES nodes(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS node_metadata (
      nodeId TEXT PRIMARY KEY,
      tags TEXT,
      description TEXT,
      FOREIGN KEY (nodeId) REFERENCES nodes(id) ON DELETE CASCADE
    )
  `)

  db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_parentId ON nodes(parentId)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_sortOrder ON nodes(sortOrder)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_deletedAt ON nodes(deletedAt)`)

  return db
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
    SELECT id, parentId, name, type, fileName, sortOrder, createdAt, updatedAt, deletedAt
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

export function getNode(db: Database, nodeId: string): StoryNode | null {
  const stmt = db.prepare(`
    SELECT id, parentId, name, type, fileName, sortOrder, createdAt, updatedAt, deletedAt
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

export function getChildNodes(db: Database, parentId: string | null): StoryNode[] {
  const stmt = db.prepare(`
    SELECT id, parentId, name, type, fileName, sortOrder, createdAt, updatedAt, deletedAt
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
  projectPath: string,
  parentId: string | null,
  name: string,
  type: 'folder' | 'file',
  fileName?: string
): StoryNode {
  const id = randomUUID()
  const now = new Date().toISOString()
  const sortOrder = getMaxSortOrder(db, parentId) + 1

  if (type === 'file' && !fileName) {
    fileName = `${name}.md`
  }

  db.run(
    `INSERT INTO nodes (id, parentId, name, type, fileName, sortOrder, createdAt, updatedAt, deletedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [id, parentId, name, type, fileName ?? null, sortOrder, now, now]
  )

  if (type === 'folder') {
    const folderPath = join(projectPath, 'story', id)
    mkdir(folderPath, { recursive: true })
  } else if (type === 'file' && parentId) {
    const parentNode = getNode(db, parentId)
    if (parentNode) {
      const filePath = join(projectPath, 'story', parentNode.id, fileName!)
      writeFile(filePath, '', 'utf-8')
    }
  }

  return getNode(db, id)!
}

export function renameNode(db: Database, projectPath: string, nodeId: string, newName: string): StoryNode | null {
  const node = getNode(db, nodeId)
  if (!node) return null

  const now = new Date().toISOString()

  if (node.type === 'file') {
    const parentNode = getNode(db, node.parentId!)
    if (parentNode) {
      const oldPath = join(projectPath, 'story', parentNode.id, node.fileName!)
      const newFileName = newName.endsWith('.md') ? newName : `${newName}.md`
      const newPath = join(projectPath, 'story', parentNode.id, newFileName)
      rename(oldPath, newPath)
      db.run(
        `UPDATE nodes SET name = ?, fileName = ?, updatedAt = ? WHERE id = ?`,
        [newName, newFileName, now, nodeId]
      )
    }
  } else {
    db.run(`UPDATE nodes SET name = ?, updatedAt = ? WHERE id = ?`, [newName, now, nodeId])
  }

  return getNode(db, nodeId)
}

export function deleteNode(db: Database, projectPath: string, nodeId: string): void {
  const node = getNode(db, nodeId)
  if (!node) return

  const now = new Date().toISOString()

  if (node.type === 'folder') {
    deleteNodeRecursively(db, projectPath, nodeId)
  } else {
    const parentNode = getNode(db, node.parentId!)
    if (parentNode) {
      const filePath = join(projectPath, 'story', parentNode.id, node.fileName!)
      rm(filePath, { force: true })
    }
    db.run(`UPDATE nodes SET deletedAt = ? WHERE id = ?`, [now, nodeId])
  }
}

function deleteNodeRecursively(db: Database, projectPath: string, nodeId: string): void {
  const children = getChildNodes(db, nodeId)
  for (const child of children) {
    deleteNodeRecursively(db, projectPath, child.id)
  }

  const node = getNode(db, nodeId)
  if (node) {
    const folderPath = join(projectPath, 'story', nodeId)
    rm(folderPath, { force: true, recursive: true })
    const now = new Date().toISOString()
    db.run(`UPDATE nodes SET deletedAt = ? WHERE id = ?`, [now, nodeId])
  }
}

export function moveNode(
  db: Database,
  projectPath: string,
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

  if (node.type === 'file') {
    const oldParent = getNode(db, node.parentId!)
    const newParent = getNode(db, newParentId!)

    if (oldParent && newParent) {
      const oldPath = join(projectPath, 'story', oldParent.id, node.fileName!)
      const newPath = join(projectPath, 'story', newParent.id, node.fileName!)
      rename(oldPath, newPath)
    }
  } else {
    const oldPath = join(projectPath, 'story', node.id)
    const newPath = join(projectPath, 'story', newParentId || 'root', node.id)
    rename(oldPath, newPath).catch(() => {})
  }

  db.run(
    `UPDATE nodes SET parentId = ?, sortOrder = ?, updatedAt = ? WHERE id = ?`,
    [newParentId, sortOrder, now, nodeId]
  )

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

export function getNodeMetadata(db: Database, nodeId: string): StoryNodeMetadata | null {
  const stmt = db.prepare(`SELECT nodeId, tags, description FROM node_metadata WHERE nodeId = ?`)
  stmt.bind([nodeId])

  if (stmt.step()) {
    const metadata = stmt.getAsObject() as StoryNodeMetadata
    stmt.free()
    return metadata
  }
  stmt.free()
  return null
}

export function updateNodeMetadata(
  db: Database,
  nodeId: string,
  tags: string | null,
  description: string | null
): void {
  db.run(
    `INSERT OR REPLACE INTO node_metadata (nodeId, tags, description) VALUES (?, ?, ?)`,
    [nodeId, tags, description]
  )
}
