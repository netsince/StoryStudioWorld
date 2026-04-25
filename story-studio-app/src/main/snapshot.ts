import type { Database } from 'sql.js'
import type { StoryNode, Snapshot } from './db'
import {
  loadDatabase,
  saveDatabase,
  getAllNodesWithDeleted,
  createSnapshot as createSnapshotDb,
  getAllSnapshots as getAllSnapshotsDb,
  getSnapshot as getSnapshotDb,
  deleteSnapshot as deleteSnapshotDb,
  restoreFromSnapshot as restoreFromSnapshotDb
} from './db'
import { loadProject } from './project'

export type { Snapshot } from './db'

export interface DiffNode {
  id: string
  name: string
  type: 'folder' | 'file'
  kind: 'story' | 'setting'
  path?: string
  before?: StoryNode
  after?: StoryNode
}

function getPath(node: StoryNode, nodesMap: Map<string, StoryNode>): string {
  const parts: string[] = []
  let current: StoryNode | undefined = node
  
  // Start from parent to avoid including own name in path
  if (current.parentId) {
    let parent = nodesMap.get(current.parentId)
    while (parent) {
      parts.unshift(parent.name)
      if (!parent.parentId) break
      parent = nodesMap.get(parent.parentId)
    }
  }
  
  return parts.join(' / ')
}

export interface DiffResult {
  story: {
    added: DiffNode[]
    modified: DiffNode[]
    deleted: DiffNode[]
  }
  setting: {
    added: DiffNode[]
    modified: DiffNode[]
    deleted: DiffNode[]
  }
}

export interface CreateSnapshotInput {
  projectSettingsPath: string
  name: string
  description?: string
}

export async function createSnapshot(input: CreateSnapshotInput): Promise<Snapshot> {
  const project = await loadProject(input.projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)

  try {
    // 获取所有节点（包括软删除的）
    const nodes = getAllNodesWithDeleted(db)

    // 创建快照
    const snapshot = createSnapshotDb(db, input.name, input.description || null, nodes)

    // 保存数据库
    await saveDatabase(db, project.storyDbPath)

    return snapshot
  } finally {
    db.close()
  }
}

export async function getAllSnapshots(projectSettingsPath: string): Promise<Snapshot[]> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)

  try {
    return getAllSnapshotsDb(db)
  } finally {
    db.close()
  }
}

export async function getSnapshot(projectSettingsPath: string, snapshotId: string): Promise<Snapshot | null> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)

  try {
    return getSnapshotDb(db, snapshotId)
  } finally {
    db.close()
  }
}

export async function deleteSnapshot(projectSettingsPath: string, snapshotId: string): Promise<boolean> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)

  try {
    const result = deleteSnapshotDb(db, snapshotId)
    await saveDatabase(db, project.storyDbPath)
    return result
  } finally {
    db.close()
  }
}

export async function restoreSnapshot(projectSettingsPath: string, snapshotId: string): Promise<boolean> {
  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)

  try {
    const result = restoreFromSnapshotDb(db, snapshotId)
    await saveDatabase(db, project.storyDbPath)
    return result
  } finally {
    db.close()
  }
}

export function computeDiff(before: StoryNode[], after: StoryNode[]): DiffResult {
  const beforeMap = new Map(before.map(n => [n.id, n]))
  const afterMap = new Map(after.map(n => [n.id, n]))

  const result: DiffResult = {
    story: { added: [], modified: [], deleted: [] },
    setting: { added: [], modified: [], deleted: [] }
  }

  // 检查新增和修改
  for (const [id, afterNode] of afterMap) {
    const beforeNode = beforeMap.get(id)
    const target = afterNode.kind === 'story' ? result.story : result.setting

    if (!beforeNode) {
      // 新增
      target.added.push({
        id: afterNode.id,
        name: afterNode.name,
        type: afterNode.type,
        kind: afterNode.kind,
        path: getPath(afterNode, afterMap),
        after: afterNode
      })
    } else {
      // 检查是否有变更
      const hasChanged =
        beforeNode.name !== afterNode.name ||
        beforeNode.parentId !== afterNode.parentId ||
        beforeNode.sortOrder !== afterNode.sortOrder ||
        beforeNode.content !== afterNode.content ||
        beforeNode.deletedAt !== afterNode.deletedAt

      if (hasChanged) {
        target.modified.push({
          id: afterNode.id,
          name: afterNode.name,
          type: afterNode.type,
          kind: afterNode.kind,
          path: getPath(afterNode, afterMap),
          before: beforeNode,
          after: afterNode
        })
      }
    }
  }

  // 检查删除
  for (const [id, beforeNode] of beforeMap) {
    if (!afterMap.has(id)) {
      const target = beforeNode.kind === 'story' ? result.story : result.setting
      target.deleted.push({
        id: beforeNode.id,
        name: beforeNode.name,
        type: beforeNode.type,
        kind: beforeNode.kind,
        path: getPath(beforeNode, beforeMap),
        before: beforeNode
      })
    }
  }

  return result
}

export async function compareSnapshots(
  projectSettingsPath: string,
  beforeSnapshotId: string,
  afterSnapshotId: string
): Promise<DiffResult | null> {
  const beforeSnapshot = await getSnapshot(projectSettingsPath, beforeSnapshotId)
  const afterSnapshot = await getSnapshot(projectSettingsPath, afterSnapshotId)

  if (!beforeSnapshot || !afterSnapshot) {
    return null
  }

  return computeDiff(beforeSnapshot.nodes, afterSnapshot.nodes)
}

export async function compareWithCurrent(
  projectSettingsPath: string,
  snapshotId: string
): Promise<DiffResult | null> {
  const snapshot = await getSnapshot(projectSettingsPath, snapshotId)
  if (!snapshot) return null

  const project = await loadProject(projectSettingsPath)
  const db = await loadDatabase(project.storyDbPath)

  try {
    const currentNodes = getAllNodesWithDeleted(db)
    return computeDiff(snapshot.nodes, currentNodes)
  } finally {
    db.close()
  }
}
