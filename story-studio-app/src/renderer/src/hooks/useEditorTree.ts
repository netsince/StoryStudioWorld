import { useCallback, useMemo, useState } from 'react'
import type { EditorGroupNode, EditorNode, Tab } from '../models'
import {
  clamp,
  collapseEmptyGroups,
  countGroups,
  createEmptyGroup,
  createId,
  findFirstGroupId,
  findGroupNode,
  hasGroup,
  removeGroup,
  removeTabsByType,
  splitAtGroup,
  updateGroup,
  updateSplitRatio
} from '../editor/editorTree'

export interface UseEditorTreeValue {
  editorTree: EditorNode
  focusedGroupId: string
  groupCount: number
  setFocusedGroupId: (groupId: string) => void

  openTab: (tab: Tab) => void
  openWelcomeTab: () => void
  openCreateProjectTab: () => void
  removeCreateProjectTabs: () => void

  switchTab: (groupId: string, tabId: string) => void
  closeTab: (groupId: string, tabId: string) => void
  closeOtherTabs: (groupId: string, tabId: string) => void
  closeAllTabs: (groupId: string) => void
  togglePinTab: (groupId: string, tabId: string) => void
  toggleDirtyTab: (groupId: string, tabId: string) => void
  setDirtyTab: (groupId: string, tabId: string, isDirty: boolean) => void
  reorderTabs: (groupId: string, draggedId: string, targetId: string) => void
  moveTab: (fromGroupId: string, toGroupId: string, tabId: string, beforeTabId?: string) => void
  dockTabToSplit: (
    fromGroupId: string,
    targetGroupId: string,
    tabId: string,
    side: 'left' | 'right' | 'top' | 'bottom'
  ) => void
  splitGroup: (groupId: string, direction: 'row' | 'column', tabId?: string) => void
  closeGroup: (groupId: string) => void
  resizeSplit: (splitId: string, ratio: number) => void
}

export const useEditorTree = (): UseEditorTreeValue => {
  const [initialEditor] = useState(() => {
    const root = createEmptyGroup()
    return { root, focusedGroupId: root.id }
  })
  const [editorTree, setEditorTree] = useState<EditorNode>(initialEditor.root)
  const [focusedGroupId, setFocusedGroupId] = useState<string>(initialEditor.focusedGroupId)

  const groupCount = useMemo(() => countGroups(editorTree), [editorTree])

  const resolveTargetGroupId = useCallback(
    (tree: EditorNode): string => (hasGroup(tree, focusedGroupId) ? focusedGroupId : findFirstGroupId(tree)),
    [focusedGroupId]
  )

  const openTab = useCallback(
    (tab: Tab): void => {
      setEditorTree((prev) => {
        const targetGroupId = resolveTargetGroupId(prev)
        return updateGroup(prev, targetGroupId, (group) => {
          const exists = group.tabs.some((item) => item.id === tab.id)
          const nextTabs = exists ? group.tabs : [...group.tabs, tab]
          return { ...group, tabs: nextTabs, activeTabId: tab.id }
        })
      })
    },
    [resolveTargetGroupId]
  )

  const openWelcomeTab = useCallback((): void => {
    openTab({ id: 'welcome', title: '欢迎使用', type: 'welcome' })
  }, [openTab])

  const openCreateProjectTab = useCallback((): void => {
    const tab: Tab = { id: 'create-project', title: '新建项目', type: 'create-project' }
    setEditorTree((prev) => {
      const targetGroupId = resolveTargetGroupId(prev)
      setFocusedGroupId(targetGroupId)
      return updateGroup(prev, targetGroupId, (group) => {
        const exists = group.tabs.some((t) => t.id === tab.id)
        const nextTabs = exists ? group.tabs : [...group.tabs, tab]
        return { ...group, tabs: nextTabs, activeTabId: tab.id }
      })
    })
  }, [resolveTargetGroupId])

  const removeCreateProjectTabs = useCallback((): void => {
    setEditorTree((prev) => removeTabsByType(prev, 'create-project'))
  }, [])

  const closeTab = useCallback(
    (groupId: string, tabId: string): void => {
      setEditorTree((prev) => {
        const nextTree = updateGroup(prev, groupId, (group) => {
          const tab = group.tabs.find((item) => item.id === tabId)
          if (tab?.isDirty && !window.confirm(`${tab.title} 有未保存的更改，确定要关闭吗？`)) {
            return group
          }

          const nextTabs = group.tabs.filter((item) => item.id !== tabId)
          const nextActive =
            group.activeTabId === tabId ? (nextTabs[nextTabs.length - 1]?.id ?? '') : group.activeTabId
          return { ...group, tabs: nextTabs, activeTabId: nextActive }
        })
        const collapsedTree = collapseEmptyGroups(nextTree)
        if (!hasGroup(collapsedTree, focusedGroupId)) {
          setFocusedGroupId(findFirstGroupId(collapsedTree))
        }
        return collapsedTree
      })
    },
    [focusedGroupId]
  )

  const closeOtherTabs = useCallback(
    (groupId: string, tabId: string): void => {
      setEditorTree((prev) => {
        const nextTree = updateGroup(prev, groupId, (group) => {
          const nextTabs = group.tabs.filter((tab) => tab.id === tabId || tab.isPinned)
          return { ...group, tabs: nextTabs, activeTabId: tabId }
        })
        const collapsedTree = collapseEmptyGroups(nextTree)
        if (!hasGroup(collapsedTree, focusedGroupId)) {
          setFocusedGroupId(findFirstGroupId(collapsedTree))
        }
        return collapsedTree
      })
    },
    [focusedGroupId]
  )

  const closeAllTabs = useCallback(
    (groupId: string): void => {
      setEditorTree((prev) => {
        const nextTree = updateGroup(prev, groupId, (group) => {
          const nextTabs = group.tabs.filter((tab) => tab.isPinned)
          return { ...group, tabs: nextTabs, activeTabId: nextTabs[0]?.id ?? '' }
        })
        const collapsedTree = collapseEmptyGroups(nextTree)
        if (!hasGroup(collapsedTree, focusedGroupId)) {
          setFocusedGroupId(findFirstGroupId(collapsedTree))
        }
        return collapsedTree
      })
    },
    [focusedGroupId]
  )

  const togglePinTab = useCallback((groupId: string, tabId: string): void => {
    setEditorTree((prev) =>
      updateGroup(prev, groupId, (group) => ({
        ...group,
        tabs: group.tabs.map((tab) => (tab.id === tabId ? { ...tab, isPinned: !tab.isPinned } : tab))
      }))
    )
  }, [])

  const toggleDirtyTab = useCallback((groupId: string, tabId: string): void => {
    setEditorTree((prev) =>
      updateGroup(prev, groupId, (group) => ({
        ...group,
        tabs: group.tabs.map((tab) => (tab.id === tabId ? { ...tab, isDirty: !tab.isDirty } : tab))
      }))
    )
  }, [])

  const setDirtyTab = useCallback((groupId: string, tabId: string, isDirty: boolean): void => {
    setEditorTree((prev) =>
      updateGroup(prev, groupId, (group) => ({
        ...group,
        tabs: group.tabs.map((tab) => (tab.id === tabId ? { ...tab, isDirty } : tab))
      }))
    )
  }, [])

  const reorderTabs = useCallback((groupId: string, draggedId: string, targetId: string): void => {
    setEditorTree((prev) =>
      updateGroup(prev, groupId, (group) => {
        const draggedIndex = group.tabs.findIndex((tab) => tab.id === draggedId)
        const targetIndex = group.tabs.findIndex((tab) => tab.id === targetId)
        if (draggedIndex === -1 || targetIndex === -1) return group

        const nextTabs = [...group.tabs]
        const [draggedTab] = nextTabs.splice(draggedIndex, 1)
        nextTabs.splice(targetIndex, 0, draggedTab)
        return { ...group, tabs: nextTabs }
      })
    )
  }, [])

  const moveTab = useCallback(
    (fromGroupId: string, toGroupId: string, tabId: string, beforeTabId?: string): void => {
      setEditorTree((prev) => {
        if (fromGroupId === toGroupId) return prev

        let movedTab: Tab | undefined
        const withoutSource = updateGroup(prev, fromGroupId, (group) => {
          const tab = group.tabs.find((t) => t.id === tabId)
          if (!tab) return group
          movedTab = tab
          const nextTabs = group.tabs.filter((t) => t.id !== tabId)
          const nextActiveTabId =
            group.activeTabId === tabId ? (nextTabs[nextTabs.length - 1]?.id ?? '') : group.activeTabId
          return { ...group, tabs: nextTabs, activeTabId: nextActiveTabId }
        })

        if (!movedTab) return prev

        const next = updateGroup(withoutSource, toGroupId, (group) => {
          if (group.tabs.some((t) => t.id === movedTab!.id)) {
            return { ...group, activeTabId: movedTab!.id }
          }
          const nextTabs = [...group.tabs]
          const insertIndex = beforeTabId ? nextTabs.findIndex((t) => t.id === beforeTabId) : -1
          if (insertIndex === -1) {
            nextTabs.push(movedTab!)
          } else {
            nextTabs.splice(Math.max(0, insertIndex), 0, movedTab!)
          }
          return { ...group, tabs: nextTabs, activeTabId: movedTab!.id }
        })

        const collapsedTree = collapseEmptyGroups(next)
        setFocusedGroupId(toGroupId)
        return collapsedTree
      })
    },
    []
  )

  const dockTabToSplit = useCallback(
    (
      fromGroupId: string,
      targetGroupId: string,
      tabId: string,
      side: 'left' | 'right' | 'top' | 'bottom'
    ): void => {
      setEditorTree((prev) => {
        const sourceGroup = findGroupNode(prev, fromGroupId)
        if (fromGroupId === targetGroupId && sourceGroup && sourceGroup.tabs.length <= 1) {
          return prev
        }

        let movedTab: Tab | undefined
        const withoutSource = updateGroup(prev, fromGroupId, (group) => {
          const tab = group.tabs.find((t) => t.id === tabId)
          if (!tab) return group
          movedTab = tab
          const nextTabs = group.tabs.filter((t) => t.id !== tabId)
          const nextActiveTabId =
            group.activeTabId === tabId ? (nextTabs[nextTabs.length - 1]?.id ?? '') : group.activeTabId
          return { ...group, tabs: nextTabs, activeTabId: nextActiveTabId }
        })

        if (!movedTab) return prev

        const newGroup: EditorGroupNode = {
          kind: 'group',
          id: createId('group'),
          tabs: [movedTab],
          activeTabId: movedTab.id
        }

        const direction: 'row' | 'column' = side === 'left' || side === 'right' ? 'row' : 'column'
        const place: 'first' | 'second' = side === 'left' || side === 'top' ? 'first' : 'second'
        const next = splitAtGroup(withoutSource, targetGroupId, direction, newGroup, place)
        const collapsedTree = collapseEmptyGroups(next)
        setFocusedGroupId(newGroup.id)
        return collapsedTree
      })
    },
    []
  )

  const switchTab = useCallback((groupId: string, tabId: string): void => {
    setEditorTree((prev) => updateGroup(prev, groupId, (group) => ({ ...group, activeTabId: tabId })))
  }, [])

  const splitGroup = useCallback((groupId: string, direction: 'row' | 'column', tabId?: string): void => {
    setEditorTree((prev) => {
      const sourceGroup = tabId ? findGroupNode(prev, groupId) : null
      if (tabId && sourceGroup && sourceGroup.tabs.length <= 1) return prev

      const tab = tabId ? sourceGroup?.tabs.find((t) => t.id === tabId) : undefined
      const newGroup: EditorGroupNode = tab
        ? { kind: 'group', id: createId('group'), tabs: [tab], activeTabId: tab.id }
        : createEmptyGroup()
      const nextTree = collapseEmptyGroups(splitAtGroup(prev, groupId, direction, newGroup, 'second'))
      setFocusedGroupId(newGroup.id)
      return nextTree
    })
  }, [])

  const closeGroup = useCallback(
    (groupId: string): void => {
      setEditorTree((prev) => {
        if (countGroups(prev) <= 1) return prev
        const next = removeGroup(prev, groupId).node
        if (!next) return prev
        const normalizedTree = collapseEmptyGroups(next)
        if (!hasGroup(normalizedTree, focusedGroupId)) {
          setFocusedGroupId(findFirstGroupId(normalizedTree))
        }
        return normalizedTree
      })
    },
    [focusedGroupId]
  )

  const resizeSplit = useCallback((splitId: string, ratio: number): void => {
    setEditorTree((prev) => updateSplitRatio(prev, splitId, clamp(ratio, 0.1, 0.9)))
  }, [])

  return {
    editorTree,
    focusedGroupId,
    groupCount,
    setFocusedGroupId,
    openTab,
    openWelcomeTab,
    openCreateProjectTab,
    removeCreateProjectTabs,
    switchTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    togglePinTab,
    toggleDirtyTab,
    setDirtyTab,
    reorderTabs,
    moveTab,
    dockTabToSplit,
    splitGroup,
    closeGroup,
    resizeSplit
  }
}

