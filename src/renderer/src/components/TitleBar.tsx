import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '../stores/editorStore'
import { useProjectStore } from '../stores/projectStore'
import { useUiStore } from '../stores/uiStore'
import ContextMenu, { type ContextMenuItem } from './ContextMenu'
import { commandService, Commands } from '../services/commandService'
import { useUiSettings } from '../hooks/useUiSettings'
import { APP_NAME } from '../constants/config'

const ssworldSvg = new URL('../assets/ssworld.svg', import.meta.url).href

type MenuId = 'file' | 'edit' | 'select' | 'view' | 'goto' | 'help' | null

const TitleBar: React.FC = () => {
  const { t } = useTranslation()
  const {
    openWelcomeTab,
    openCreateProjectTab,
    openAboutTab,
    openPreferencesTab,
    openReadingOrderTab,
    openExportStoryTab,
    openExportWikiTab,
    focusedGroupId
  } = useEditorStore()
  const { hideAppLogoText } = useUiSettings()

  const { currentProject, openProject, createStoryNode, storyNodes } = useProjectStore()

  const handleMinimize = (): void => window.api.minimize()
  const handleMaximize = (): void => window.api.maximize()
  const handleClose = (): void => window.api.close()

  const [activeMenu, setActiveMenu] = useState<MenuId>(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const fileRef = useRef<HTMLSpanElement>(null)
  const editRef = useRef<HTMLSpanElement>(null)
  const selectRef = useRef<HTMLSpanElement>(null)
  const viewRef = useRef<HTMLSpanElement>(null)
  const gotoRef = useRef<HTMLSpanElement>(null)
  const helpRef = useRef<HTMLSpanElement>(null)

  const menuRefs = {
    file: fileRef,
    edit: editRef,
    select: selectRef,
    view: viewRef,
    goto: gotoRef,
    help: helpRef
  }

  const executeCommand = (commandId: string): void => {
    commandService.setActiveGroup(focusedGroupId)
    commandService.executeCommand(commandId)
    setActiveMenu(null)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const isOutside = Object.values(menuRefs).every(
        (ref) => !ref.current?.contains(event.target as Node)
      )
      if (isOutside) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [])

  const handleMenuClick = (menuId: MenuId): void => {
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

  const fileMenuItems: ContextMenuItem[] = [
    {
      key: 'open-project',
      label: t('menu.openProject'),
      onSelect: () => {
        void openProject()
        setActiveMenu(null)
      }
    },
    {
      key: 'new-project',
      label: t('menu.newProject'),
      onSelect: () => {
        openCreateProjectTab()
        setActiveMenu(null)
      }
    },
    {
      key: 'separator1',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'new-folder',
      label: t('editor.newFolder'),
      onSelect: () => {
        setActiveMenu(null)
        if (currentProject) {
          void createStoryNode(null, t('sidebar.newFolder'), 'folder')
        } else {
          alert(t('errors.projectNotLoaded'))
        }
      }
    },
    {
      key: 'new-chapter',
      label: t('editor.newFile'),
      onSelect: () => {
        setActiveMenu(null)
        if (currentProject) {
          const fileCount = storyNodes.filter((n) => n.type === 'file').length
          const name = `${t('editor.chapter')} ${fileCount + 1}`
          void createStoryNode(null, name, 'file')
        } else {
          alert(t('errors.projectNotLoaded'))
        }
      }
    },
    {
      key: 'separator2',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'save',
      label: `${t('menu.save')} (Ctrl+S)`,
      onSelect: () => {
        executeCommand(Commands.SAVE)
      }
    },
    {
      key: 'separator3',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'reading-order',
      label: t('readingOrder.title'),
      onSelect: () => {
        openReadingOrderTab()
        setActiveMenu(null)
      }
    },
    {
      key: 'separator4',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'export-story',
      label: t('exportStory.title'),
      onSelect: () => {
        openExportStoryTab()
        setActiveMenu(null)
      }
    },
    {
      key: 'export-wiki',
      label: t('exportWiki.title'),
      onSelect: () => {
        openExportWikiTab()
        setActiveMenu(null)
      }
    },
    {
      key: 'separator5',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'close-window',
      label: t('menu.closeProject'),
      onSelect: () => {
        handleClose()
      }
    }
  ]

  const editMenuItems: ContextMenuItem[] = [
    {
      key: 'undo',
      label: `${t('menu.undo')} (Ctrl+Z)`,
      onSelect: () => executeCommand(Commands.UNDO)
    },
    {
      key: 'redo',
      label: `${t('menu.redo')} (Ctrl+Y)`,
      onSelect: () => executeCommand(Commands.REDO)
    },
    {
      key: 'separator1',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'cut',
      label: `${t('menu.cut')} (Ctrl+X)`,
      onSelect: () => executeCommand(Commands.CUT)
    },
    {
      key: 'copy',
      label: `${t('menu.copy')} (Ctrl+C)`,
      onSelect: () => executeCommand(Commands.COPY)
    },
    {
      key: 'paste',
      label: `${t('menu.paste')} (Ctrl+V)`,
      onSelect: () => executeCommand(Commands.PASTE)
    },
    {
      key: 'separator2',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'find',
      label: `${t('menu.find')} (Ctrl+F)`,
      onSelect: () => executeCommand(Commands.FIND)
    }
  ]

  const selectMenuItems: ContextMenuItem[] = [
    {
      key: 'select-all',
      label: `${t('menu.selectAll')} (Ctrl+A)`,
      onSelect: () => executeCommand(Commands.SELECT_ALL)
    },
    {
      key: 'expand-selection',
      label: t('menu.expandSelection'),
      onSelect: () => executeCommand(Commands.EXPAND_SELECTION)
    },
    {
      key: 'shrink-selection',
      label: t('menu.shrinkSelection'),
      onSelect: () => executeCommand(Commands.SHRINK_SELECTION)
    },
    {
      key: 'separator1',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'select-paragraph',
      label: t('menu.selectParagraph'),
      onSelect: () => executeCommand(Commands.SELECT_PARAGRAPH)
    },
    {
      key: 'separator2',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'cursor-up',
      label: t('menu.cursorUp'),
      onSelect: () => executeCommand(Commands.CURSOR_UP)
    },
    {
      key: 'cursor-down',
      label: t('menu.cursorDown'),
      onSelect: () => executeCommand(Commands.CURSOR_DOWN)
    },
    {
      key: 'cursor-left',
      label: t('menu.cursorLeft'),
      onSelect: () => executeCommand(Commands.CURSOR_LEFT)
    },
    {
      key: 'cursor-right',
      label: t('menu.cursorRight'),
      onSelect: () => executeCommand(Commands.CURSOR_RIGHT)
    }
  ]

  const viewMenuItems: ContextMenuItem[] = [
    {
      key: 'zen-mode',
      label: useUiStore.getState().isZenMode ? t('menu.exitZenMode') : t('menu.enterZenMode'),
      onSelect: () => {
        useUiStore.getState().toggleZenMode()
        setActiveMenu(null)
      }
    },
    {
      key: 'separator-zen',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'dev-tools',
      label: t('menu.devTools'),
      onSelect: () => {
        window.api.toggleDevTools()
        setActiveMenu(null)
      }
    }
  ]

  const gotoMenuItems: ContextMenuItem[] = [
    {
      key: 'quick-open',
      label: `${t('menu.quickOpen')} (Ctrl+P)`,
      onSelect: () => executeCommand(Commands.QUICK_OPEN)
    },
    {
      key: 'separator-quickopen',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'welcome',
      label: t('welcome.title'),
      onSelect: () => {
        openWelcomeTab()
        setActiveMenu(null)
      }
    },
    {
      key: 'preferences',
      label: t('menu.preferences'),
      onSelect: () => {
        openPreferencesTab()
        setActiveMenu(null)
      }
    },
    {
      key: 'separator1',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'back',
      label: t('menu.back'),
      onSelect: () => executeCommand(Commands.NAV_BACK)
    },
    {
      key: 'forward',
      label: t('menu.forward'),
      onSelect: () => executeCommand(Commands.NAV_FORWARD)
    }
  ]

  const helpMenuItems: ContextMenuItem[] = [
    {
      key: 'dev-tools',
      label: t('menu.devTools'),
      onSelect: () => {
        window.api.toggleDevTools()
        setActiveMenu(null)
      }
    },
    {
      key: 'separator1',
      label: '---',
      onSelect: () => {}
    },
    {
      key: 'about',
      label: t('menu.about'),
      onSelect: () => {
        openAboutTab()
        setActiveMenu(null)
      }
    }
  ]

  const menuItemsMap: Record<Exclude<MenuId, null>, ContextMenuItem[]> = {
    file: fileMenuItems,
    edit: editMenuItems,
    select: selectMenuItems,
    view: viewMenuItems,
    goto: gotoMenuItems,
    help: helpMenuItems
  }

  return (
    <div className="title-bar">
      <div className="title-bar-left">
        <div className="app-logo" onClick={openWelcomeTab} style={{ cursor: 'pointer' }}>
          <img className="brand-logo" src={ssworldSvg} alt={APP_NAME} />
          {!hideAppLogoText && APP_NAME}
        </div>
        <div className="title-bar-menu">
          <span
            ref={menuRefs.file}
            style={{ cursor: 'pointer' }}
            onClick={() => handleMenuClick('file')}
          >
            {t('menu.file')}
          </span>
          <span
            ref={menuRefs.edit}
            style={{ cursor: 'pointer' }}
            onClick={() => handleMenuClick('edit')}
          >
            {t('menu.edit')}
          </span>
          <span
            ref={menuRefs.select}
            style={{ cursor: 'pointer' }}
            onClick={() => handleMenuClick('select')}
          >
            {t('menu.select')}
          </span>
          <span
            ref={menuRefs.view}
            style={{ cursor: 'pointer' }}
            onClick={() => handleMenuClick('view')}
          >
            {t('menu.view')}
          </span>
          <span
            ref={menuRefs.goto}
            style={{ cursor: 'pointer' }}
            onClick={() => handleMenuClick('goto')}
          >
            {t('menu.goto')}
          </span>
          <span
            ref={menuRefs.help}
            style={{ cursor: 'pointer' }}
            onClick={() => handleMenuClick('help')}
          >
            {t('menu.help')}
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
