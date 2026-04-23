import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'

export type DropSide = 'left' | 'right' | 'top' | 'bottom' | 'center'
export type DropOverlayRect = { top: string; left: string; width: string; height: string }

export interface DropOverlayState {
  visible: boolean
  side: DropSide
  overlay: DropOverlayRect
}

const TAB_DND_MIME = 'application/x-ssw-tab'
const TAB_DRAG_CLEANUP_EVENT = 'ssw:tab-drag-cleanup'
const TAB_DRAG_HOVER_EVENT = 'ssw:tab-drag-hover'

let activeTabDrag: { groupId: string; tabId: string } | null = null

const dispatchTabDragCleanup = (): void => {
  activeTabDrag = null
  window.dispatchEvent(new CustomEvent(TAB_DRAG_CLEANUP_EVENT))
}

const dispatchTabDragHover = (groupId: string): void => {
  window.dispatchEvent(new CustomEvent(TAB_DRAG_HOVER_EVENT, { detail: { groupId } }))
}

const readTabDragPayload = (event: DragEvent): { groupId: string; tabId: string } | null => {
  const raw = event.dataTransfer.getData(TAB_DND_MIME)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'groupId' in parsed &&
      'tabId' in parsed &&
      typeof (parsed as { groupId: unknown }).groupId === 'string' &&
      typeof (parsed as { tabId: unknown }).tabId === 'string'
    ) {
      return parsed as { groupId: string; tabId: string }
    }
    return null
  } catch {
    return null
  }
}

const getTabDragPayload = (event: DragEvent): { groupId: string; tabId: string } | null =>
  readTabDragPayload(event) ?? activeTabDrag

const getOverlayOffsetHeight = (tabsVisible: boolean, tabsCount: number): number =>
  tabsVisible && tabsCount > 0 ? 35 : 0

const isPointInTabStrip = (clientY: number, rect: DOMRect, overlayOffsetHeight: number): boolean =>
  overlayOffsetHeight > 0 && clientY - rect.top <= overlayOffsetHeight

const computeDropOperation = (
  clientX: number,
  clientY: number,
  rect: DOMRect,
  overlayOffsetHeight: number
): { side: DropSide; overlay: DropOverlayRect } => {
  const editorWidth = rect.width
  const editorHeight = Math.max(0, rect.height - overlayOffsetHeight)
  if (!editorWidth || !editorHeight) {
    return {
      side: 'center',
      overlay: { top: '0', left: '0', width: '100%', height: '100%' }
    }
  }

  const offsetX = clientX - rect.left
  const offsetY = clientY - rect.top - overlayOffsetHeight

  const edgeWidthThreshold = editorWidth * 0.1
  const edgeHeightThreshold = editorHeight * 0.1
  const splitHeightThreshold = editorHeight / 3

  let side: DropSide = 'center'
  if (
    !(
      offsetX > edgeWidthThreshold &&
      offsetX < editorWidth - edgeWidthThreshold &&
      offsetY > edgeHeightThreshold &&
      offsetY < editorHeight - edgeHeightThreshold
    )
  ) {
    if (offsetY < splitHeightThreshold) {
      side = 'top'
    } else if (offsetY > splitHeightThreshold * 2) {
      side = 'bottom'
    } else if (offsetX < editorWidth / 2) {
      side = 'left'
    } else {
      side = 'right'
    }
  }

  switch (side) {
    case 'top':
      return {
        side,
        overlay: { top: `${overlayOffsetHeight}px`, left: '0', width: '100%', height: '50%' }
      }
    case 'bottom':
      return {
        side,
        overlay: {
          top: `calc(${overlayOffsetHeight}px + 50%)`,
          left: '0',
          width: '100%',
          height: '50%'
        }
      }
    case 'left':
      return {
        side,
        overlay: {
          top: `${overlayOffsetHeight}px`,
          left: '0',
          width: '50%',
          height: `calc(100% - ${overlayOffsetHeight}px)`
        }
      }
    case 'right':
      return {
        side,
        overlay: {
          top: `${overlayOffsetHeight}px`,
          left: '50%',
          width: '50%',
          height: `calc(100% - ${overlayOffsetHeight}px)`
        }
      }
    default:
      return {
        side: 'center',
        overlay: {
          top: `${overlayOffsetHeight}px`,
          left: '0',
          width: '100%',
          height: `calc(100% - ${overlayOffsetHeight}px)`
        }
      }
  }
}

export interface UseTabDragValue {
  draggedTabId: string | null
  dropOverlay: DropOverlayState
  overlayOffsetHeight: number

  onTabDragStart: (event: DragEvent, tabId: string) => void
  onTabDragOver: (event: DragEvent, targetTabId: string) => void
  onTabDragEnd: () => void

  onGroupDragEnter: (event: DragEvent) => void
  onGroupDragOver: (event: DragEvent) => void
  onGroupDragLeave: (event: DragEvent) => void
  onGroupDrop: (event: DragEvent) => void
}

export const useTabDrag = (args: {
  groupId: string
  tabsCount: number
  tabsVisible: boolean
  onReorderTabs: (groupId: string, draggedId: string, targetId: string) => void
  onMoveTab: (fromGroupId: string, toGroupId: string, tabId: string, beforeTabId?: string) => void
  onDockTabToSplit: (
    fromGroupId: string,
    targetGroupId: string,
    tabId: string,
    side: Exclude<DropSide, 'center'>
  ) => void
}): UseTabDragValue => {
  const { groupId, tabsCount, tabsVisible, onReorderTabs, onMoveTab, onDockTabToSplit } = args

  const [draggedTabId, setDraggedTabId] = useState<string | null>(null)
  const [dropOverlay, setDropOverlay] = useState<DropOverlayState>({
    visible: false,
    side: 'center',
    overlay: { top: '0', left: '0', width: '100%', height: '100%' }
  })

  const dragDepthRef = useRef(0)
  const lastOverlaySideRef = useRef<DropSide>('center')
  const overlayOffsetHeight = useMemo(
    () => getOverlayOffsetHeight(tabsVisible, tabsCount),
    [tabsCount, tabsVisible]
  )

  const resetDropOverlay = useCallback((): void => {
    dragDepthRef.current = 0
    lastOverlaySideRef.current = 'center'
    setDropOverlay({
      visible: false,
      side: 'center',
      overlay: { top: '0', left: '0', width: '100%', height: '100%' }
    })
  }, [])

  const hideDropOverlay = useCallback((): void => {
    lastOverlaySideRef.current = 'center'
    setDropOverlay((prev) =>
      prev.visible
        ? {
            visible: false,
            side: 'center',
            overlay: { top: '0', left: '0', width: '100%', height: '100%' }
          }
        : prev
    )
  }, [])

  useEffect(() => {
    const handleGlobalDragCleanup = (): void => {
      setDraggedTabId(null)
      resetDropOverlay()
    }

    const handleGlobalDragHover = (event: Event): void => {
      const customEvent = event as CustomEvent<{ groupId?: string }>
      if (customEvent.detail?.groupId !== groupId && dropOverlay.visible) {
        resetDropOverlay()
      }
    }

    window.addEventListener(TAB_DRAG_CLEANUP_EVENT, handleGlobalDragCleanup as EventListener)
    window.addEventListener(TAB_DRAG_HOVER_EVENT, handleGlobalDragHover as EventListener)
    window.addEventListener('dragend', handleGlobalDragCleanup)
    window.addEventListener('drop', handleGlobalDragCleanup)

    return () => {
      window.removeEventListener(TAB_DRAG_CLEANUP_EVENT, handleGlobalDragCleanup as EventListener)
      window.removeEventListener(TAB_DRAG_HOVER_EVENT, handleGlobalDragHover as EventListener)
      window.removeEventListener('dragend', handleGlobalDragCleanup)
      window.removeEventListener('drop', handleGlobalDragCleanup)
    }
  }, [dropOverlay.visible, groupId, resetDropOverlay])

  const onTabDragStart = useCallback(
    (event: DragEvent, tabId: string): void => {
      dispatchTabDragCleanup()
      setDraggedTabId(tabId)
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData(TAB_DND_MIME, JSON.stringify({ groupId, tabId }))
      event.dataTransfer.setData('text/plain', tabId)
      activeTabDrag = { groupId, tabId }
      const img = new Image()
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      event.dataTransfer.setDragImage(img, 0, 0)
    },
    [groupId]
  )

  const onTabDragOver = useCallback(
    (event: DragEvent, targetTabId: string): void => {
      event.preventDefault()
      if (draggedTabId && draggedTabId !== targetTabId) {
        onReorderTabs(groupId, draggedTabId, targetTabId)
      }
    },
    [draggedTabId, groupId, onReorderTabs]
  )

  const onTabDragEnd = useCallback((): void => {
    dispatchTabDragCleanup()
  }, [])

  const onGroupDragEnter = useCallback((event: DragEvent): void => {
    const payload = getTabDragPayload(event)
    if (!payload) return
    dragDepthRef.current += 1
  }, [])

  const onGroupDragOver = useCallback(
    (event: DragEvent): void => {
      const payload = getTabDragPayload(event)
      if (!payload) return
      event.preventDefault()
      dispatchTabDragHover(groupId)
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      if (isPointInTabStrip(event.clientY, rect, overlayOffsetHeight)) {
        hideDropOverlay()
        return
      }
      const operation = computeDropOperation(
        event.clientX,
        event.clientY,
        rect,
        overlayOffsetHeight
      )
      if (lastOverlaySideRef.current !== operation.side || !dropOverlay.visible) {
        lastOverlaySideRef.current = operation.side
        setDropOverlay({ visible: true, side: operation.side, overlay: operation.overlay })
      }
    },
    [dropOverlay.visible, groupId, hideDropOverlay, overlayOffsetHeight]
  )

  const onGroupDragLeave = useCallback(
    (event: DragEvent): void => {
      const nextTarget = event.relatedTarget as Node | null
      const currentTarget = event.currentTarget as HTMLElement
      if (nextTarget && currentTarget.contains(nextTarget)) return

      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) {
        resetDropOverlay()
      }
    },
    [resetDropOverlay]
  )

  const onGroupDrop = useCallback(
    (event: DragEvent): void => {
      event.preventDefault()
      event.stopPropagation()
      const payload = getTabDragPayload(event)
      const intendedSide = lastOverlaySideRef.current
      resetDropOverlay()
      if (!payload) return

      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      const computedSide = isPointInTabStrip(event.clientY, rect, overlayOffsetHeight)
        ? 'center'
        : computeDropOperation(event.clientX, event.clientY, rect, overlayOffsetHeight).side
      const side = computedSide === 'center' ? intendedSide : computedSide
      if (payload.groupId === groupId && side === 'center') return

      if (side === 'center') {
        onMoveTab(payload.groupId, groupId, payload.tabId)
      } else {
        onDockTabToSplit(payload.groupId, groupId, payload.tabId, side)
      }

      dispatchTabDragCleanup()
    },
    [groupId, onDockTabToSplit, onMoveTab, overlayOffsetHeight, resetDropOverlay]
  )

  return {
    draggedTabId,
    dropOverlay,
    overlayOffsetHeight,
    onTabDragStart,
    onTabDragOver,
    onTabDragEnd,
    onGroupDragEnter,
    onGroupDragOver,
    onGroupDragLeave,
    onGroupDrop
  }
}
