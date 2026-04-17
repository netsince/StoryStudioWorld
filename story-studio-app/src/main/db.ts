import initSqlJs, { Database } from 'sql.js'
import { randomUUID } from 'crypto'

export const STORY_DB_FILE = 'story.db'

export interface StoryNode {
  id: string
  parentId: string | null
  name: string
  type: 'folder' | 'file'
  fileName: string | null
  content: string | null
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
      fileName TEXT,
      content TEXT,
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

  migrateDatabase(db)

  return db
}

function migrateDatabase(db: Database): void {
  const result = db.exec("PRAGMA table_info(nodes)")
  if (result.length === 0) return

  const columns = result[0].values.map((row) => row[1] as string)

  if (!columns.includes('content')) {
    db.run('ALTER TABLE nodes ADD COLUMN content TEXT')
  }

  db.exec('DROP TABLE IF EXISTS node_metadata')
}

export async function saveDatabase(db: Database, dbPath: string): Promise<void> {
  const data = db.export()
  const buffer = Buffer.from(data)
  const { mkdir, writeFile } = await import('fs/promises')
  const { dirname } = await import('path')
  await mkdir(dirname(dbPath), { recursive: true })
  await writeFile(dbPath, buffer)
}

export async function loadDatabase(dbPath: string): Promise<Database> {
  return initDatabase(dbPath)
}

export function getNodes(db: Database): StoryNode[] {
  const stmt = db.prepare(`
    SELECT id, parentId, name, type, fileName, content, sortOrder, createdAt, updatedAt, deletedAt
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
    SELECT id, parentId, name, type, fileName, content, sortOrder, createdAt, updatedAt, deletedAt
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
    SELECT id, parentId, name, type, fileName, content, sortOrder, createdAt, updatedAt, deletedAt
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
  content: string = ''
): StoryNode {
  const id = randomUUID()
  const now = new Date().toISOString()
  const sortOrder = getMaxSortOrder(db, parentId) + 1
  const fileName = type === 'file' ? `${name}.md` : null

  db.run(
    `INSERT INTO nodes (id, parentId, name, type, fileName, content, sortOrder, createdAt, updatedAt, deletedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [id, parentId, name, type, fileName, type === 'file' ? content : null, sortOrder, now, now]
  )

  return getNode(db, id)!
}

export function renameNode(db: Database, nodeId: string, newName: string): StoryNode | null {
  const node = getNode(db, nodeId)
  if (!node) return null

  const now = new Date().toISOString()
  const newFileName = node.type === 'file' ? `${newName}.md` : node.fileName

  db.run(
    `UPDATE nodes SET name = ?, fileName = ?, updatedAt = ? WHERE id = ?`,
    [newName, newFileName, now, nodeId]
  )

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

export function getNodeContent(db: Database, nodeId: string): string | null {
  const node = getNode(db, nodeId)
  if (!node || node.type !== 'file') return null
  return node.content
}

export function updateNodeContent(db: Database, nodeId: string, content: string): void {
  const node = getNode(db, nodeId)
  if (!node || node.type !== 'file') return

  const now = new Date().toISOString()
  db.run(`UPDATE nodes SET content = ?, updatedAt = ? WHERE id = ?`, [content, now, nodeId])
}
