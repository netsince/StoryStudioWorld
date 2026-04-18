import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useEditorStore } from '../stores/editorStore'
import { useProjectStore } from '../stores/projectStore'
import ContextMenu, { type ContextMenuItem } from './ContextMenu'
import { commandService, Commands } from '../services/commandService'

const ssworldSvg = new URL('../assets/ssworld.svg', import.meta.url).href

type MenuId = 'file' | 'edit' | 'select' | 'view' | 'goto' | 'help' | null

const TitleBar: React.FC = () => {
  const {
    openWelcomeTab,
    openCreateProjectTab,
    openAboutTab,
    editorTree,
  } = useEditorStore()

  const {
    currentProject,
    openProject,
    createStoryNode,
  } = useProjectStore()

  const handleMinimize = (): void => window.api.minimize()
  const handleMaximize = (): void => window.api.maximize()
  const handleClose = (): void => window.api.close()

  // 菜单状态
  const [activeMenu, setActiveMenu] = useState<MenuId>(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const menuRefs = {
    file: useRef<HTMLSpanElement>(null),
    edit: useRef<HTMLSpanElement>(null),
    select: useRef<HTMLSpanElement>(null),
    view: useRef<HTMLSpanElement>(null),
    goto: useRef<HTMLSpanElement>(null),
    help: useRef<HTMLSpanElement>(null),
  }

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutside = Object.values(menuRefs).every(
        (ref) => !ref.current?.contains(event.target as Node)
      )
      if (isOutside) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMenuClick = (menuId: MenuId) => {
    if (!menuId) {
      setActiveMenu(null)
      return
    }
    const ref = menuRefs[menuId]
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setMenuPos({ x: rect.left, y: rect.bottom + 4 })
    }
    setActiveMenu(menuId)
  }

  // 获取当前活动的文件 tab
  const getActiveFileTab = useCallback(() => {
    const group = editorTree.kind === 'group' 
      ? editorTree 
      : null
    if (!group) return null
    const activeTab = group.tabs.find((t) => t.id === group.activeTabId)
    return activeTab?.type === 'file' ? activeTab : null
  }, [editorTree])

  // 文件菜单
  const fileMenuItems: ContextMenuItem[] = [
    {
      key: 'open-project',
      label: '打开项目',
      onSelect: () => {
        void openProject()
        setActiveMenu(null)
      },
    },
    {
      key: 'new-project',
      label: '新建项目',
      onSelect: () => {
        openCreateProjectTab()
        setActiveMenu(null)
      },
    },
    {
      key: 'separator1',
      label: '---',
      onSelect: () => {},
    },
    {
      key: 'new-folder',
      label: '新建文件夹',
      onSelect: () => {
        if (currentProject) {
          const name = prompt('文件夹名称')
          if (name) {
            void createStoryNode(null, name, 'folder')
          }
        } else {
          alert('请先打开一个项目')
        }
        setActiveMenu(null)
      },
    },
    {
      key: 'new-chapter',
      label: '新建章',
      onSelect: () => {
        if (currentProject) {
          const name = prompt('章节名称')
          if (name) {
            void createStoryNode(null, name, 'file')
          }
        } else {
          alert('请先打开一个项目')
        }
        setActiveMenu(null)
      },
    },
    {
      key: 'separator2',
      label: '---',
      onSelect: () => {},
    },
    {
      key: 'save',
      label: '保存 (Ctrl+S)',
      onSelect: () => {
        commandService.executeCommand(Commands.SAVE)
        setActiveMenu(null)
      },
    },
    {
      key: 'separator3',
      label: '---',
      onSelect: () => {},
    },
    {
      key: 'new-window',
      label: '新窗口',
      onSelect: () => {
        window.api.openNewWindow()
        setActiveMenu(null)
      },
    },
    {
      key: 'close-window',
      label: '关闭窗口',
      onSelect: () => {
        handleClose()
      },
    },
  ]

  // 编辑菜单
  const editMenuItems: ContextMenuItem[] = [
    {
      key: 'undo',
      label: '撤销 (Ctrl+Z)',
      onSelect: () => {
        commandService.executeCommand(Commands.UNDO)
        setActiveMenu(null)
      },
    },
    {
      key: 'redo',
      label: '恢复 (Ctrl+Y)',
      onSelect: () => {
        commandService.executeCommand(Commands.REDO)
        setActiveMenu(null)
      },
    },
    {
      key: 'separator1',
      label: '---',
      onSelect: () => {},
    },
    {
      key: 'cut',
      label: '剪切 (Ctrl+X)',
      onSelect: () => {
        commandService.executeCommand(Commands.CUT)
        setActiveMenu(null)
      },
    },
    {
      key: 'copy',
      label: '复制 (Ctrl+C)',
      onSelect: () => {
        commandService.executeCommand(Commands.COPY)
        setActiveMenu(null)
      },
    },
    {
      key: 'paste',
      label: '粘贴 (Ctrl+V)',
      onSelect: () => {
        commandService.executeCommand(Commands.PASTE)
        setActiveMenu(null)
      },
    },
    {
      key: 'separator2',
      label: '---',
      onSelect: () => {},
    },
    {
      key: 'find',
      label: '本文件查找 (Ctrl+F)',
      onSelect: () => {
        commandService.executeCommand(Commands.FIND)
        setActiveMenu(null)
      },
    },
  ]

  // 选择菜单
  const selectMenuItems: ContextMenuItem[] = [
    {
      key: 'select-all',
      label: '全选 (Ctrl+A)',
      onSelect: () => {
        commandService.executeCommand(Commands.SELECT_ALL)
        setActiveMenu(null)
      },
    },
    {
      key: 'expand-selection',
      label: '扩大选区',
      onSelect: () => {
        commandService.executeCommand(Commands.EXPAND_SELECTION)
        setActiveMenu(null)
      },
    },
    {
      key: 'shrink-selection',
      label: '缩小选区',
      onSelect: () => {
        commandService.executeCommand(Commands.SHRINK_SELECTION)
        setActiveMenu(null)
      },
    },
    {
      key: 'separator1',
      label: '---',
      onSelect: () => {},
    },
    {
      key: 'select-paragraph',
      label: '选择本段',
      onSelect: () => {
        commandService.executeCommand(Commands.SELECT_PARAGRAPH)
        setActiveMenu(null)
      },
    },
    {
      key: 'separator2',
      label: '---',
      onSelect: () => {},
    },
    {
      key: 'cursor-up',
      label: '光标向上移动',
      onSelect: () => {
        commandService.executeCommand(Commands.CURSOR_UP)
        setActiveMenu(null)
      },
    },
    {
      key: 'cursor-down',
      label: '光标向下移动',
      onSelect: () => {
        commandService.executeCommand(Commands.CURSOR_DOWN)
        setActiveMenu(null)
      },
    },
    {
      key: 'cursor-left',
      label: '光标向左移动',
      onSelect: () => {
        commandService.executeCommand(Commands.CURSOR_LEFT)
        setActiveMenu(null)
      },
    },
    {
      key: 'cursor-right',
      label: '光标向右移动',
      onSelect: () => {
        commandService.executeCommand(Commands.CURSOR_RIGHT)
        setActiveMenu(null)
      },
    },
    {
      key: 'separator3',
      label: '---',
      onSelect: () => {},
    },
    {
      key: 'prev-match',
      label: '上一个匹配',
      onSelect: () => {
        commandService.executeCommand(Commands.PREV_MATCH)
        setActiveMenu(null)
      },
    },
    {
      key: 'next-match',
      label: '下一个匹配',
      onSelect: () => {
        commandService.executeCommand(Commands.NEXT_MATCH)
        setActiveMenu(null)
      },
    },
  ]

  // 查看菜单
  const viewMenuItems: ContextMenuItem[] = [
    {
      key: 'dev-tools',
      label: '开发者工具',
      onSelect: () => {
        window.api.toggleDevTools()
        setActiveMenu(null)
      },
    },
  ]

  // 转到菜单
  const gotoMenuItems: ContextMenuItem[] = [
    {
      key: 'welcome',
      label: '欢迎使用',
      onSelect: () => {
        openWelcomeTab()
        setActiveMenu(null)
      },
    },
    {
      key: 'separator1',
      label: '---',
      onSelect: () => {},
    },
    {
      key: 'back',
      label: '返回',
      onSelect: () => {
        commandService.executeCommand(Commands.NAV_BACK)
        setActiveMenu(null)
      },
    },
    {
      key: 'forward',
      label: '前进',
      onSelect: () => {
        commandService.executeCommand(Commands.NAV_FORWARD)
        setActiveMenu(null)
      },
    },
  ]

  // 帮助菜单
  const helpMenuItems: ContextMenuItem[] = [
    {
      key: 'dev-tools',
      label: '开发者工具',
      onSelect: () => {
        window.api.toggleDevTools()
        setActiveMenu(null)
      },
    },
    {
      key: 'separator1',
      label: '---',
      onSelect: () => {},
    },
    {
      key: 'about',
      label: '关于',
      onSelect: () => {
        openAboutTab()
        setActiveMenu(null)
      },
    },
  ]

  const menuItemsMap: Record<Exclude<MenuId, null>, ContextMenuItem[]> = {
    file: fileMenuItems,
    edit: editMenuItems,
    select: selectMenuItems,
    view: viewMenuItems,
    goto: gotoMenuItems,
    help: helpMenuItems,
  }

  return (
    <div className="title-bar">
      <div className="title-bar-left">
        <div className="app-logo" onClick={openWelcomeTab} style={{ cursor: 'pointer' }}>
          <img className="brand-logo" src={ssworldSvg} alt="Story Studio World" />
          Story Studio World
        </div>
        <div className="title-bar-menu">
          <span
            ref={menuRefs.file}
            style={{ cursor: 'pointer' }}
            onClick={() => handleMenuClick('file')}
          >
            文件
          </span>
          <span
            ref={menuRefs.edit}
            style={{ cursor: 'pointer' }}
            onClick={() => handleMenuClick('edit')}
          >
            编辑
          </span>
          <span
            ref={menuRefs.select}
            style={{ cursor: 'pointer' }}
            onClick={() => handleMenuClick('select')}
          >
            选择
          </span>
          <span
            ref={menuRefs.view}
            style={{ cursor: 'pointer' }}
            onClick={() => handleMenuClick('view')}
          >
            查看
          </span>
          <span
            ref={menuRefs.goto}
            style={{ cursor: 'pointer' }}
            onClick={() => handleMenuClick('goto')}
          >
            转到
          </span>
          <span
            ref={menuRefs.help}
            style={{ cursor: 'pointer' }}
            onClick={() => handleMenuClick('help')}
          >
            帮助
          </span>
          {activeMenu && (
            <ContextMenu
              x={menuPos.x}
              y={menuPos.y}
              items={menuItemsMap[activeMenu]}
              onClose={() => setActiveMenu(null)}
            />
          )}
        </div>
      </div>
      <div className="title-bar-controls">
        <span onClick={handleMinimize}>—</span>
        <span onClick={handleMaximize}>□</span>
        <span className="close" onClick={handleClose}>
          ✕
        </span>
      </div>
    </div>
  )
}

export default TitleBar
