import type { StoryNode } from '../models'

/**
 * 获取节点的显示名称
 * 对于设定的根分类节点（character/location/worldview/item/other），会返回翻译后的名称
 * @param node - 故事节点
 * @param t - i18n 翻译函数
 * @returns 显示名称
 */
export function getNodeDisplayName(node: StoryNode, t: (key: string) => string): string {
  if (node.kind === 'setting' && node.parentId === null) {
    const categoryKey = `setting.category.${node.name}`
    const translated = t(categoryKey)
    if (translated !== categoryKey) {
      return translated
    }
  }
  return node.name
}

/**
 * 检查节点是否是设定的默认分类节点
 * @param node - 故事节点
 * @returns 是否是默认分类节点
 */
export function isDefaultSettingCategory(node: StoryNode): boolean {
  if (node.kind !== 'setting' || node.parentId !== null) return false
  const defaultCategories = ['character', 'location', 'worldview', 'item', 'other']
  return defaultCategories.includes(node.name)
}

/**
 * 构建节点的完整路径（用于显示）
 * 路径中的每个节点名称都会应用 i18n 翻译
 * @param node - 目标节点
 * @param allNodes - 所有节点列表（用于查找父节点）
 * @param t - i18n 翻译函数
 * @returns 完整路径字符串，如 "角色 / 文件夹 / 设定文件"
 */
export function buildNodeDisplayPath(
  node: StoryNode,
  allNodes: StoryNode[],
  t: (key: string) => string
): string {
  const path: string[] = []
  let current: StoryNode | undefined = node

  while (current) {
    path.unshift(getNodeDisplayName(current, t))
    current = allNodes.find((n) => n.id === current?.parentId)
  }

  return path.join(' / ')
}
