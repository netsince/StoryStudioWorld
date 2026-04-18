import { create } from 'zustand'
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

export interface ConfirmCloseResult {
  shouldClose: boolean
}

export type OnConfirmCloseCallback = (tab: Tab) => Promise<ConfirmCloseResult> | ConfirmCloseResult

// 导航历史记录项
interface NavigationHistoryEntry {
  groupId: string
  tabId: string
  tabType: Tab['type']
  nodeId?: string
}

interface EditorState {
  editorTree: EditorNode
  focusedGroupId: string

  // 导航历史
  navHistory: NavigationHistoryEntry[]
  navHistoryIndex: number
  canGoBack: () => boolean
  canGoForward: () => boolean
  goBack: () => void
  goForward: () => void

  groupCount: () => number
  setFocusedGroupId: (groupId: string) => void

  openTab: (tab: Tab) => void
  openWelcomeTab: () => void
  openCreateProjectTab: () => void
  openAboutTab: () => void
  openPreferencesTab: () => void
  removeCreateProjectTabs: () => void

  switchTab: (groupId: string, tabId: string) => void
  closeTab: (groupId: string, tabId: string, onConfirmClose?: OnConfirmCloseCallback) => void
  closeOtherTabs: (groupId: string, tabId: string) => void
  closeAllTabs: (groupId: string) => void
  togglePinTab: (groupId: string, tabId: string) => void
  onDirtyTab: (groupId: string, tabId: string) => void
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

const pendingCloseKeys = new Set<string>()

export const useEditorStore = create<EditorState>((set, get) => {
  const root = createEmptyGroup()

  const resolveTargetGroupId = (tree: EditorNode, focusedGroupId: string): string =>
    hasGroup(tree, focusedGroupId) ? focusedGroupId : findFirstGroupId(tree)

  const ensureFocusedGroupValid = (tree: EditorNode, focusedGroupId: string): string =>
    hasGroup(tree, focusedGroupId) ? focusedGroupId : findFirstGroupId(tree)

  return {
    editorTree: root,
    focusedGroupId: root.id,

    // 导航历史
    navHistory: [],
    navHistoryIndex: -1,
    canGoBack: () => get().navHistoryIndex > 0,
    canGoForward: () => get().navHistoryIndex < get().navHistory.length - 1,
    goBack: () => {
      const state = get()
      if (state.navHistoryIndex <= 0) return
      const newIndex = state.navHistoryIndex - 1
      const entry = state.navHistory[newIndex]
      if (entry) {
        const group = findGroupNode(state.editorTree, entry.groupId)
        if (group && group.tabs.some(t => t.id === entry.tabId)) {
          set({
            navHistoryIndex: newIndex,
            focusedGroupId: entry.groupId
          })
          set((s) => ({
            editorTree: updateGroup(s.editorTree, entry.groupId, (g) => ({ ...g, activeTabId: entry.tabId }))
          }))
        }
      }
    },
    goForward: () => {
      const state = get()
      if (state.navHistoryIndex >= state.navHistory.length - 1) return
      const newIndex = state.navHistoryIndex + 1
      const entry = state.navHistory[newIndex]
      if (entry) {
        const group = findGroupNode(state.editorTree, entry.groupId)
        if (group && group.tabs.some(t => t.id === entry.tabId)) {
          set({
            navHistoryIndex: newIndex,
            focusedGroupId: entry.groupId
          })
          set((s) => ({
            editorTree: updateGroup(s.editorTree, entry.groupId, (g) => ({ ...g, activeTabId: entry.tabId }))
          }))
        }
      }
    },

    groupCount: () => countGroups(get().editorTree),
    setFocusedGroupId: (groupId) => set({ focusedGroupId: groupId }),

    openTab: (tab) => {
      set((state) => {
        const targetGroupId = resolveTargetGroupId(state.editorTree, state.focusedGroupId)
        const nextTree = updateGroup(state.editorTree, targetGroupId, (group) => {
          const exists = group.tabs.some((item) => item.id === tab.id)
          const nextTabs = exists ? group.tabs : [...group.tabs, tab]
          return { ...group, tabs: nextTabs, activeTabId: tab.id }
        })

        // 记录导航历史
        const newEntry: NavigationHistoryEntry = {
          groupId: targetGroupId,
          tabId: tab.id,
          tabType: tab.type,
          nodeId: tab.type === 'file' ? tab.nodeId : undefined
        }
        const newHistory = state.navHistory.slice(0, state.navHistoryIndex + 1)
        // 避免连续重复记录相同位置
        const lastEntry = newHistory[newHistory.length - 1]
        if (!lastEntry || lastEntry.groupId !== newEntry.groupId || lastEntry.tabId !== newEntry.tabId) {
          newHistory.push(newEntry)
          // 限制历史记录长度
          if (newHistory.length > 50) {
            newHistory.shift()
          }
        }

        return {
          editorTree: nextTree,
          navHistory: newHistory,
          navHistoryIndex: newHistory.length - 1
        }
      })
    },

    openWelcomeTab: () => {
      get().openTab({ id: 'welcome', title: '欢迎使用', type: 'welcome' })
    },

    openCreateProjectTab: () => {
      const tab: Tab = { id: 'create-project', title: '新建项目', type: 'create-project' }
      set((state) => {
        const targetGroupId = resolveTargetGroupId(state.editorTree, state.focusedGroupId)
        const nextTree = updateGroup(state.editorTree, targetGroupId, (group) => {
          const exists = group.tabs.some((t) => t.id === tab.id)
          const nextTabs = exists ? group.tabs : [...group.tabs, tab]
          return { ...group, tabs: nextTabs, activeTabId: tab.id }
        })
        return { editorTree: nextTree, focusedGroupId: targetGroupId }
      })
    },

    openAboutTab: () => {
      const tab: Tab = { id: 'about', title: '关于', type: 'about' }
      set((state) => {
        const targetGroupId = resolveTargetGroupId(state.editorTree, state.focusedGroupId)
        const nextTree = updateGroup(state.editorTree, targetGroupId, (group) => {
          const exists = group.tabs.some((t) => t.id === tab.id)
          const nextTabs = exists ? group.tabs : [...group.tabs, tab]
          return { ...group, tabs: nextTabs, activeTabId: tab.id }
        })
        return { editorTree: nextTree, focusedGroupId: targetGroupId }
      })
    },

    openPreferencesTab: () => {
      const tab: Tab = { id: 'preferences', title: '首选项', type: 'preferences' }
      set((state) => {
        const targetGroupId = resolveTargetGroupId(state.editorTree, state.focusedGroupId)
        const nextTree = updateGroup(state.editorTree, targetGroupId, (group) => {
          const exists = group.tabs.some((t) => t.id === tab.id)
          const nextTabs = exists ? group.tabs : [...group.tabs, tab]
          return { ...group, tabs: nextTabs, activeTabId: tab.id }
        })
        return { editorTree: nextTree, focusedGroupId: targetGroupId }
      })
    },

    removeCreateProjectTabs: () => {
      set((state) => ({ editorTree: removeTabsByType(state.editorTree, 'create-project') }))
    },

    switchTab: (groupId, tabId) => {
      set((state) => {
        const group = findGroupNode(state.editorTree, groupId)
        const tab = group?.tabs.find(t => t.id === tabId)

        // 记录导航历史
        if (tab) {
          const newEntry: NavigationHistoryEntry = {
            groupId,
            tabId,
            tabType: tab.type,
            nodeId: tab.type === 'file' ? tab.nodeId : undefined
          }
          const newHistory = state.navHistory.slice(0, state.navHistoryIndex + 1)
          const lastEntry = newHistory[newHistory.length - 1]
          if (!lastEntry || lastEntry.groupId !== newEntry.groupId || lastEntry.tabId !== newEntry.tabId) {
            newHistory.push(newEntry)
            if (newHistory.length > 50) {
              newHistory.shift()
            }
          }

          return {
            editorTree: updateGroup(state.editorTree, groupId, (g) => ({ ...g, activeTabId: tabId })),
            navHistory: newHistory,
            navHistoryIndex: newHistory.length - 1
          }
        }

        return {
          editorTree: updateGroup(state.editorTree, groupId, (group) => ({ ...group, activeTabId: tabId }))
        }
      })
    },

    closeTab: (groupId, tabId, onConfirmClose) => {
      const closeKey = `${groupId}:${tabId}`
      if (pendingCloseKeys.has(closeKey)) return

      const { editorTree } = get()
      const tab = findGroupNode(editorTree, groupId)?.tabs.find((item) => item.id === tabId)
      if (tab?.isDirty && onConfirmClose) {
        pendingCloseKeys.add(closeKey)
        void (async (): Promise<void> => {
          try {
            const result = await onConfirmClose(tab)
            if (!result.shouldClose) return

            set((state) => {
              const tabStillExists = findGroupNode(state.editorTree, groupId)?.tabs.find((t) => t.id === tabId)
              if (!tabStillExists) return state

              const nextTree = updateGroup(state.editorTree, groupId, (group) => {
                const nextTabs = group.tabs.filter((item) => item.id !== tabId)
                const nextActive =
                  group.activeTabId === tabId ? (nextTabs[nextTabs.length - 1]?.id ?? '') : group.activeTabId
                return { ...group, tabs: nextTabs, activeTabId: nextActive }
              })
              const collapsedTree = collapseEmptyGroups(nextTree)
              const nextFocused = ensureFocusedGroupValid(collapsedTree, state.focusedGroupId)
              return state.focusedGroupId === nextFocused
                ? { editorTree: collapsedTree }
                : { editorTree: collapsedTree, focusedGroupId: nextFocused }
            })
          } finally {
            pendingCloseKeys.delete(closeKey)
          }
        })()
        return
      }

      set((state) => {
        const nextTree = updateGroup(state.editorTree, groupId, (group) => {
          const nextTabs = group.tabs.filter((item) => item.id !== tabId)
          const nextActive =
            group.activeTabId === tabId ? (nextTabs[nextTabs.length - 1]?.id ?? '') : group.activeTabId
          return { ...group, tabs: nextTabs, activeTabId: nextActive }
        })
        const collapsedTree = collapseEmptyGroups(nextTree)
        const nextFocused = ensureFocusedGroupValid(collapsedTree, state.focusedGroupId)
        return state.focusedGroupId === nextFocused
          ? { editorTree: collapsedTree }
          : { editorTree: collapsedTree, focusedGroupId: nextFocused }
      })
    },

    closeOtherTabs: (groupId, tabId) => {
      set((state) => {
        const nextTree = updateGroup(state.editorTree, groupId, (group) => {
          const nextTabs = group.tabs.filter((tab) => tab.id === tabId || tab.isPinned)
          return { ...group, tabs: nextTabs, activeTabId: tabId }
        })
        const collapsedTree = collapseEmptyGroups(nextTree)
        const nextFocused = ensureFocusedGroupValid(collapsedTree, state.focusedGroupId)
        return state.focusedGroupId === nextFocused
          ? { editorTree: collapsedTree }
          : { editorTree: collapsedTree, focusedGroupId: nextFocused }
      })
    },

    closeAllTabs: (groupId) => {
      set((state) => {
        const nextTree = updateGroup(state.editorTree, groupId, (group) => {
          const nextTabs = group.tabs.filter((tab) => tab.isPinned)
          return { ...group, tabs: nextTabs, activeTabId: nextTabs[0]?.id ?? '' }
        })
        const collapsedTree = collapseEmptyGroups(nextTree)
        const nextFocused = ensureFocusedGroupValid(collapsedTree, state.focusedGroupId)
        return state.focusedGroupId === nextFocused
          ? { editorTree: collapsedTree }
          : { editorTree: collapsedTree, focusedGroupId: nextFocused }
      })
    },

    togglePinTab: (groupId, tabId) => {
      set((state) => ({
        editorTree: updateGroup(state.editorTree, groupId, (group) => ({
          ...group,
          tabs: group.tabs.map((tab) => (tab.id === tabId ? { ...tab, isPinned: !tab.isPinned } : tab))
        }))
      }))
    },

    onDirtyTab: (groupId, tabId) => {
      get().setDirtyTab(groupId, tabId, true)
    },

    setDirtyTab: (groupId, tabId, isDirty) => {
      set((state) => ({
        editorTree: updateGroup(state.editorTree, groupId, (group) => ({
          ...group,
          tabs: group.tabs.map((tab) => (tab.id === tabId ? { ...tab, isDirty } : tab))
        }))
      }))
    },

    reorderTabs: (groupId, draggedId, targetId) => {
      set((state) => ({
        editorTree: updateGroup(state.editorTree, groupId, (group) => {
          const draggedIndex = group.tabs.findIndex((tab) => tab.id === draggedId)
          const targetIndex = group.tabs.findIndex((tab) => tab.id === targetId)
          if (draggedIndex === -1 || targetIndex === -1) return group

          const nextTabs = [...group.tabs]
          const [draggedTab] = nextTabs.splice(draggedIndex, 1)
          nextTabs.splice(targetIndex, 0, draggedTab)
          return { ...group, tabs: nextTabs }
        })
      }))
    },

    moveTab: (fromGroupId, toGroupId, tabId, beforeTabId) => {
      set((state) => {
        if (fromGroupId === toGroupId) return state

        let movedTab: Tab | undefined
        const withoutSource = updateGroup(state.editorTree, fromGroupId, (group) => {
          const tab = group.tabs.find((t) => t.id === tabId)
          if (!tab) return group
          movedTab = tab
          const nextTabs = group.tabs.filter((t) => t.id !== tabId)
          const nextActiveTabId =
            group.activeTabId === tabId ? (nextTabs[nextTabs.length - 1]?.id ?? '') : group.activeTabId
          return { ...group, tabs: nextTabs, activeTabId: nextActiveTabId }
        })

        if (!movedTab) return state

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
        return { editorTree: collapsedTree, focusedGroupId: toGroupId }
      })
    },

    dockTabToSplit: (fromGroupId, targetGroupId, tabId, side) => {
      set((state) => {
        const sourceGroup = findGroupNode(state.editorTree, fromGroupId)
        if (fromGroupId === targetGroupId && sourceGroup && sourceGroup.tabs.length <= 1) {
          return state
        }

        let movedTab: Tab | undefined
        const withoutSource = updateGroup(state.editorTree, fromGroupId, (group) => {
          const tab = group.tabs.find((t) => t.id === tabId)
          if (!tab) return group
          movedTab = tab
          const nextTabs = group.tabs.filter((t) => t.id !== tabId)
          const nextActiveTabId =
            group.activeTabId === tabId ? (nextTabs[nextTabs.length - 1]?.id ?? '') : group.activeTabId
          return { ...group, tabs: nextTabs, activeTabId: nextActiveTabId }
        })

        if (!movedTab) return state

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
        return { editorTree: collapsedTree, focusedGroupId: newGroup.id }
      })
    },

    splitGroup: (groupId, direction, tabId) => {
      set((state) => {
        const sourceGroup = tabId ? findGroupNode(state.editorTree, groupId) : null
        if (tabId && sourceGroup && sourceGroup.tabs.length <= 1) return state

        const tab = tabId ? sourceGroup?.tabs.find((t) => t.id === tabId) : undefined
        const newGroup: EditorGroupNode = tab
          ? { kind: 'group', id: createId('group'), tabs: [tab], activeTabId: tab.id }
          : createEmptyGroup()
        const nextTree = collapseEmptyGroups(splitAtGroup(state.editorTree, groupId, direction, newGroup, 'second'))
        return { editorTree: nextTree, focusedGroupId: newGroup.id }
      })
    },

    closeGroup: (groupId) => {
      set((state) => {
        if (countGroups(state.editorTree) <= 1) return state
        const next = removeGroup(state.editorTree, groupId).node
        if (!next) return state
        const normalizedTree = collapseEmptyGroups(next)
        const nextFocused = ensureFocusedGroupValid(normalizedTree, state.focusedGroupId)
        return state.focusedGroupId === nextFocused
          ? { editorTree: normalizedTree }
          : { editorTree: normalizedTree, focusedGroupId: nextFocused }
      })
    },

    resizeSplit: (splitId, ratio) => {
      set((state) => ({
        editorTree: updateSplitRatio(state.editorTree, splitId, clamp(ratio, 0.1, 0.9))
      }))
    }
  }
})
