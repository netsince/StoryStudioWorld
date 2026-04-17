import type { EditorGroupNode, EditorNode, Tab } from '../models'

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

export const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}:${crypto.randomUUID()}`
  }
  return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`
}

export const createEmptyGroup = (): EditorGroupNode => ({
  kind: 'group',
  id: createId('group'),
  tabs: [],
  activeTabId: ''
})

export const countGroups = (node: EditorNode): number =>
  node.kind === 'group' ? 1 : countGroups(node.first) + countGroups(node.second)

export const hasGroup = (node: EditorNode, groupId: string): boolean => {
  if (node.kind === 'group') return node.id === groupId
  return hasGroup(node.first, groupId) || hasGroup(node.second, groupId)
}

export const findFirstGroupId = (node: EditorNode): string =>
  node.kind === 'group' ? node.id : findFirstGroupId(node.first)

export const findGroupNode = (node: EditorNode, groupId: string): EditorGroupNode | null => {
  if (node.kind === 'group') return node.id === groupId ? node : null
  return findGroupNode(node.first, groupId) ?? findGroupNode(node.second, groupId)
}

export const updateGroup = (
  node: EditorNode,
  groupId: string,
  updater: (group: EditorGroupNode) => EditorGroupNode
): EditorNode => {
  if (node.kind === 'group') {
    return node.id === groupId ? updater(node) : node
  }
  const nextFirst = updateGroup(node.first, groupId, updater)
  const nextSecond = updateGroup(node.second, groupId, updater)
  if (nextFirst === node.first && nextSecond === node.second) return node
  return { ...node, first: nextFirst, second: nextSecond }
}

export const mapGroups = (
  node: EditorNode,
  mapper: (group: EditorGroupNode) => EditorGroupNode
): EditorNode => {
  if (node.kind === 'group') return mapper(node)
  return { ...node, first: mapGroups(node.first, mapper), second: mapGroups(node.second, mapper) }
}

export const updateSplitRatio = (node: EditorNode, splitId: string, ratio: number): EditorNode => {
  if (node.kind === 'group') return node
  if (node.id === splitId) return { ...node, ratio }
  const nextFirst = updateSplitRatio(node.first, splitId, ratio)
  const nextSecond = updateSplitRatio(node.second, splitId, ratio)
  if (nextFirst === node.first && nextSecond === node.second) return node
  return { ...node, first: nextFirst, second: nextSecond }
}

export const splitAtGroup = (
  node: EditorNode,
  groupId: string,
  direction: 'row' | 'column',
  newGroup: EditorGroupNode,
  place: 'first' | 'second' = 'second'
): EditorNode => {
  if (node.kind === 'group') {
    if (node.id !== groupId) return node
    return {
      kind: 'split',
      id: createId('split'),
      direction,
      ratio: 0.5,
      first: place === 'first' ? newGroup : node,
      second: place === 'first' ? node : newGroup
    }
  }
  const nextFirst = splitAtGroup(node.first, groupId, direction, newGroup, place)
  const nextSecond = splitAtGroup(node.second, groupId, direction, newGroup, place)
  if (nextFirst === node.first && nextSecond === node.second) return node
  return { ...node, first: nextFirst, second: nextSecond }
}

export const removeGroup = (
  node: EditorNode,
  groupId: string
): { node: EditorNode | null; removed: boolean } => {
  if (node.kind === 'group') {
    return node.id === groupId ? { node: null, removed: true } : { node, removed: false }
  }

  const left = removeGroup(node.first, groupId)
  if (left.removed) {
    if (left.node === null) return { node: node.second, removed: true }
    return { node: { ...node, first: left.node }, removed: true }
  }

  const right = removeGroup(node.second, groupId)
  if (right.removed) {
    if (right.node === null) return { node: node.first, removed: true }
    return { node: { ...node, second: right.node }, removed: true }
  }

  return { node, removed: false }
}

export const collapseEmptyGroups = (node: EditorNode): EditorNode => {
  if (countGroups(node) <= 1) return node

  const visit = (current: EditorNode): EditorNode | null => {
    if (current.kind === 'group') {
      return current.tabs.length === 0 ? null : current
    }

    const nextFirst = visit(current.first)
    const nextSecond = visit(current.second)

    if (!nextFirst && !nextSecond) return null
    if (!nextFirst) return nextSecond
    if (!nextSecond) return nextFirst

    return { ...current, first: nextFirst, second: nextSecond }
  }

  return visit(node) ?? node
}

export const removeTabsByType = (node: EditorNode, tabType: Tab['type']): EditorNode =>
  mapGroups(node, (group) => {
    const nextTabs = group.tabs.filter((tab) => tab.type !== tabType)
    const nextActiveTabId = group.activeTabId && nextTabs.some((t) => t.id === group.activeTabId)
      ? group.activeTabId
      : ''
    return group.tabs === nextTabs && group.activeTabId === nextActiveTabId
      ? group
      : { ...group, tabs: nextTabs, activeTabId: nextActiveTabId }
  })

