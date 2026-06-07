import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface ContextMenuItem {
  key: string
  label: string
  shortcut?: string
  onSelect: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose?: () => void
}

// 解析标签和快捷键
const parseLabel = (label: string): { text: string; shortcut?: string } => {
  const match = label.match(/^(.+?)\s*\((.+?)\)$/)
  if (match) {
    return { text: match[1], shortcut: match[2] }
  }
  return { text: label }
}

// 一维布局算法（来自 vse/base/common/layout.ts）
const enum LayoutAnchorPosition {
  Before,
  After
}

const enum LayoutAnchorMode {
  Avoid,
  Align
}

interface ILayoutAnchor {
  offset: number
  size: number
  mode?: LayoutAnchorMode
  position: LayoutAnchorPosition
}

interface ILayoutResult {
  position: number
  result: 'ok' | 'flipped' | 'overlap'
}

function layout(viewportSize: number, viewSize: number, anchor: ILayoutAnchor): ILayoutResult {
  const layoutAfterAnchorBoundary =
    anchor.mode === LayoutAnchorMode.Align ? anchor.offset : anchor.offset + anchor.size
  const layoutBeforeAnchorBoundary =
    anchor.mode === LayoutAnchorMode.Align ? anchor.offset + anchor.size : anchor.offset

  if (anchor.position === LayoutAnchorPosition.After) {
    if (viewSize <= viewportSize - layoutAfterAnchorBoundary) {
      return { position: layoutAfterAnchorBoundary, result: 'ok' }
    }
    if (viewSize <= layoutBeforeAnchorBoundary) {
      return { position: layoutBeforeAnchorBoundary - viewSize, result: 'flipped' }
    }
    return { position: Math.max(viewportSize - viewSize, 0), result: 'overlap' }
  } else {
    if (viewSize <= layoutBeforeAnchorBoundary) {
      return { position: layoutBeforeAnchorBoundary - viewSize, result: 'ok' }
    }
    if (
      viewSize <= viewportSize - layoutAfterAnchorBoundary &&
      layoutBeforeAnchorBoundary < viewSize / 2
    ) {
      return { position: layoutAfterAnchorBoundary, result: 'flipped' }
    }
    return { position: 0, result: 'overlap' }
  }
}

// 二维布局算法（来自 vse/base/common/layout.ts）
const enum AnchorAlignment {
  Left,
  Right
}

const enum AnchorPosition {
  Below,
  Above
}

const enum AnchorAxisAlignment {
  Vertical,
  Horizontal
}

interface IRect {
  top: number
  left: number
  width: number
  height: number
}

interface ISize {
  width: number
  height: number
}

interface ILayout2DResult {
  top: number
  left: number
}

function layout2d(
  viewport: IRect,
  view: ISize,
  anchor: IRect,
  options?: {
    anchorAlignment?: AnchorAlignment
    anchorPosition?: AnchorPosition
    anchorAxisAlignment?: AnchorAxisAlignment
  }
): ILayout2DResult {
  let anchorAlignment = options?.anchorAlignment ?? AnchorAlignment.Left
  let anchorPosition = options?.anchorPosition ?? AnchorPosition.Below
  const anchorAxisAlignment = options?.anchorAxisAlignment ?? AnchorAxisAlignment.Vertical

  let top: number
  let left: number

  if (anchorAxisAlignment === AnchorAxisAlignment.Vertical) {
    const verticalAnchor: ILayoutAnchor = {
      offset: anchor.top - viewport.top,
      size: anchor.height,
      position:
        anchorPosition === AnchorPosition.Below
          ? LayoutAnchorPosition.After
          : LayoutAnchorPosition.Before
    }
    const horizontalAnchor: ILayoutAnchor = {
      offset: anchor.left,
      size: anchor.width,
      position:
        anchorAlignment === AnchorAlignment.Left
          ? LayoutAnchorPosition.Before
          : LayoutAnchorPosition.After,
      mode: LayoutAnchorMode.Align
    }

    const verticalLayoutResult = layout(viewport.height, view.height, verticalAnchor)
    top = verticalLayoutResult.position + viewport.top

    if (verticalLayoutResult.result === 'flipped') {
      anchorPosition =
        anchorPosition === AnchorPosition.Below ? AnchorPosition.Above : AnchorPosition.Below
    }

    // 如果视图与锚点在垂直方向重叠，水平方向必须避开锚点
    const verticalOverlap = top < anchor.top + anchor.height && top + view.height > anchor.top
    if (verticalOverlap) {
      horizontalAnchor.mode = LayoutAnchorMode.Avoid
    }

    const horizontalLayoutResult = layout(viewport.width, view.width, horizontalAnchor)
    left = horizontalLayoutResult.position

    if (horizontalLayoutResult.result === 'flipped') {
      anchorAlignment =
        anchorAlignment === AnchorAlignment.Left ? AnchorAlignment.Right : AnchorAlignment.Left
    }
  } else {
    const horizontalAnchor: ILayoutAnchor = {
      offset: anchor.left,
      size: anchor.width,
      position:
        anchorAlignment === AnchorAlignment.Left
          ? LayoutAnchorPosition.Before
          : LayoutAnchorPosition.After
    }
    const verticalAnchor: ILayoutAnchor = {
      offset: anchor.top,
      size: anchor.height,
      position:
        anchorPosition === AnchorPosition.Below
          ? LayoutAnchorPosition.After
          : LayoutAnchorPosition.Before,
      mode: LayoutAnchorMode.Align
    }

    const horizontalLayoutResult = layout(viewport.width, view.width, horizontalAnchor)
    left = horizontalLayoutResult.position

    if (horizontalLayoutResult.result === 'flipped') {
      anchorAlignment =
        anchorAlignment === AnchorAlignment.Left ? AnchorAlignment.Right : AnchorAlignment.Left
    }

    // 如果视图与锚点在水平方向重叠，垂直方向必须避开锚点
    const horizontalOverlap = left < anchor.left + anchor.width && left + view.width > anchor.left
    if (horizontalOverlap) {
      verticalAnchor.mode = LayoutAnchorMode.Avoid
    }

    const verticalLayoutResult = layout(viewport.height, view.height, verticalAnchor)
    top = verticalLayoutResult.position + viewport.top

    if (verticalLayoutResult.result === 'flipped') {
      anchorPosition =
        anchorPosition === AnchorPosition.Below ? AnchorPosition.Above : AnchorPosition.Below
    }
  }

  return { top, left }
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: -9999, y: -9999 })

  // 使用 vse 的 layout2d 算法进行边界检测
  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    const rect = menu.getBoundingClientRect()
    const winWidth = window.innerWidth
    const winHeight = window.innerHeight

    const viewport: IRect = {
      top: 0,
      left: 0,
      width: winWidth,
      height: winHeight
    }

    const view: ISize = {
      width: rect.width,
      height: rect.height
    }

    // 锚点：鼠标位置，视为 2x2 的小方块（和 vse 一致）
    const anchor: IRect = {
      top: y,
      left: x,
      width: 2,
      height: 2
    }

    const result = layout2d(viewport, view, anchor, {
      anchorAlignment: AnchorAlignment.Left,
      anchorPosition: AnchorPosition.Below,
      anchorAxisAlignment: AnchorAxisAlignment.Vertical
    })

    // 使用 requestAnimationFrame 避免在 effect 中直接 setState
    requestAnimationFrame(() => {
      setPosition({ x: result.left, y: result.top })
    })
  }, [x, y])

  // 点击外部关闭
  useEffect(() => {
    const handleClick = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose?.()
      }
    }

    document.addEventListener('mousedown', handleClick, true)
    document.addEventListener('contextmenu', handleClick, true)

    return () => {
      document.removeEventListener('mousedown', handleClick, true)
      document.removeEventListener('contextmenu', handleClick, true)
    }
  }, [onClose])

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleItemClick = (item: ContextMenuItem): void => {
    item.onSelect()
    onClose?.()
  }

  const menu = (
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      aria-orientation="vertical"
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 100000,
        backgroundColor: 'var(--menu-bg, #252526)',
        border: '1px solid var(--menu-border, #454545)',
        borderRadius: '6px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        padding: '4px 0',
        minWidth: '160px',
        fontSize: '13px',
        lineHeight: '1.4',
        outline: 'none'
      }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      {items.map((item) => {
        if (item.label === '---') {
          return (
            <div
              key={item.key}
              className="menu-separator"
              role="separator"
              style={{
                height: '1px',
                backgroundColor: 'var(--menu-border, #454545)',
                margin: '4px 8px'
              }}
            />
          )
        }

        const { text, shortcut } = parseLabel(item.label)

        return (
          <div
            key={item.key}
            className="menu-item"
            role="menuitem"
            tabIndex={-1}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              cursor: 'pointer',
              color: 'var(--menu-fg, #cccccc)',
              transition: 'background-color 0.1s',
              outline: 'none',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--menu-hover-bg, #094771)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            onMouseDown={(event) => {
              if (event.button !== 0) return
              event.preventDefault()
              event.stopPropagation()
              handleItemClick(item)
            }}
          >
            <span>{text}</span>
            {shortcut && (
              <span
                style={{
                  marginLeft: '24px',
                  fontSize: '12px',
                  color: 'var(--menu-shortcut-fg, #888888)',
                  opacity: 0.8
                }}
              >
                {shortcut}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )

  return createPortal(menu, document.body)
}

export default ContextMenu
