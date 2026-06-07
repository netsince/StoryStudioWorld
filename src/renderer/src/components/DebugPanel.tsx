import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { useProjectStore } from '../stores/projectStore'
import { APP_NAME } from '../constants/config'
import { DEFAULT_SETTINGS, applyAppSettings } from './editor/PreferencesPage'
import { InputBox, InputBoxRef } from './ui/InputBox'

interface DebugAction {
  id: string
  label: string
  description?: string
  shortcut?: string
  requireConfirm?: boolean
  confirmText?: string
  onExecute: () => void | Promise<void>
}

const DebugPanel: React.FC = () => {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [confirmAction, setConfirmAction] = useState<DebugAction | null>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const inputRef = useRef<InputBoxRef>(null)
  const confirmInputRef = useRef<InputBoxRef>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const currentProject = useProjectStore((s) => s.currentProject)
  const storyNodes = useProjectStore((s) => s.storyNodes)
  const refreshStoryNodes = useProjectStore((s) => s.refreshStoryNodes)

  // 调试动作列表
  const debugActions: DebugAction[] = [
    {
      id: 'reload-window',
      label: t('debugPanel.reloadWindow', '重载窗口'),
      description: t('debugPanel.reloadWindowDesc', '重新加载整个应用窗口'),
      shortcut: 'Ctrl+R',
      onExecute: () => {
        window.location.reload()
      }
    },
    {
      id: 'toggle-devtools',
      label: t('debugPanel.toggleDevTools', '切换开发者工具'),
      description: t('debugPanel.toggleDevToolsDesc', '打开或关闭 Chrome DevTools'),
      shortcut: 'Ctrl+Shift+I',
      onExecute: () => {
        window.api.toggleDevTools()
      }
    },
    {
      id: 'reload-plugins',
      label: t('debugPanel.reloadPlugins', '重载插件'),
      description: t('debugPanel.reloadPluginsDesc', '重新扫描并加载插件'),
      onExecute: async () => {
        // 触发自定义事件通知插件服务重载
        window.dispatchEvent(new CustomEvent('ssw:reload-plugins'))
      }
    },
    {
      id: 'open-plugins-folder',
      label: t('debugPanel.openPluginsFolder', '打开插件文件夹'),
      description: t('debugPanel.openPluginsFolderDesc', '在文件管理器中打开插件目录'),
      onExecute: () => {
        window.api.openPluginsFolder()
      }
    },
    {
      id: 'refresh-nodes',
      label: t('debugPanel.refreshNodes', '刷新节点列表'),
      description: t('debugPanel.refreshNodesDesc', '重新从数据库加载故事节点'),
      onExecute: async () => {
        await refreshStoryNodes()
      }
    },
    {
      id: 'clear-local-storage',
      label: t('debugPanel.clearLocalStorage', '清除本地存储'),
      description: t('debugPanel.clearLocalStorageDesc', '清除浏览器的 localStorage 数据'),
      requireConfirm: true,
      confirmText: t('debugPanel.confirmText', '确认清除'),
      onExecute: () => {
        localStorage.clear()
        window.alert(t('debugPanel.localStorageCleared', '本地存储已清除，请重启应用'))
      }
    },
    {
      id: 'show-system-info',
      label: t('debugPanel.showSystemInfo', '显示系统信息'),
      description: t('debugPanel.showSystemInfoDesc', '显示应用和系统的详细信息'),
      onExecute: async () => {
        const info = await window.api.getAppVersion()
        const projectInfo = currentProject
          ? `\n\nProject: ${currentProject.projectName}\nPath: ${currentProject.projectPath}`
          : '\n\nNo project loaded'
        const nodesInfo = `\nNodes: ${storyNodes.length} total`
        window.alert(
          `${APP_NAME} v${info.version}\n` +
            `Electron: ${info.electron}\n` +
            `Chrome: ${info.chrome}\n` +
            `Node: ${info.node}\n` +
            `Platform: ${info.platform}${projectInfo}${nodesInfo}`
        )
      }
    },
    {
      id: 'reset-preferences',
      label: t('debugPanel.resetPreferences', '重置首选项'),
      description: t('debugPanel.resetPreferencesDesc', '将所有首选项恢复为默认值'),
      requireConfirm: true,
      confirmText: t('debugPanel.confirmReset', '确认重置'),
      onExecute: () => {
        localStorage.setItem('ssw:app-settings', JSON.stringify(DEFAULT_SETTINGS))
        applyAppSettings(DEFAULT_SETTINGS)
        window.dispatchEvent(new CustomEvent('app-settings-changed'))
        window.alert(t('debugPanel.preferencesReset', '首选项已重置为默认值'))
      }
    }
  ]

  // 过滤动作
  const filteredActions = debugActions.filter(
    (action) =>
      action.label.toLowerCase().includes(searchText.toLowerCase()) ||
      action.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      action.id.toLowerCase().includes(searchText.toLowerCase())
  )

  // 监听 Ctrl+Shift+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setIsVisible((prev) => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 聚焦输入框
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 10)
    }
  }, [isVisible])

  // 聚焦确认输入框
  useEffect(() => {
    if (confirmAction) {
      setTimeout(() => {
        confirmInputRef.current?.focus()
      }, 10)
    }
  }, [confirmAction])

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      switch (e.key) {
        case 'Escape':
          setIsVisible(false)
          setSearchText('')
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1 < filteredActions.length ? prev + 1 : prev))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
          break
        case 'Enter':
          if (filteredActions[selectedIndex]) {
            void handleExecute(filteredActions[selectedIndex])
          }
          break
      }
    },
    [filteredActions, selectedIndex]
  )

  // 执行动作
  const handleExecute = useCallback(async (action: DebugAction): Promise<void> => {
    if (action.requireConfirm) {
      setConfirmAction(action)
      setConfirmInput('')
      return
    }

    try {
      await action.onExecute()
    } catch (error) {
      console.error(`Debug action ${action.id} failed:`, error)
    }
    setIsVisible(false)
    setSearchText('')
    setSelectedIndex(0)
  }, [])

  // 处理确认
  const handleConfirm = useCallback(() => {
    if (!confirmAction) return

    if (confirmInput === confirmAction.confirmText) {
      try {
        confirmAction.onExecute()
      } catch (error) {
        console.error(`Debug action ${confirmAction.id} failed:`, error)
      }
      setConfirmAction(null)
      setConfirmInput('')
      setIsVisible(false)
      setSearchText('')
      setSelectedIndex(0)
    } else {
      window.alert(t('debugPanel.confirmFailed', '确认文本不匹配，操作已取消'))
      setConfirmAction(null)
      setConfirmInput('')
    }
  }, [confirmAction, confirmInput, t])

  // 取消确认
  const handleCancelConfirm = useCallback(() => {
    setConfirmAction(null)
    setConfirmInput('')
  }, [])

  // 滚动选中项到视图
  useEffect(() => {
    if (resultsRef.current && filteredActions.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex, filteredActions.length])

  // 重置选中索引当过滤结果变化时
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchText])

  if (!isVisible) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 999999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '80px'
      }}
      onClick={() => {
        if (!confirmAction) {
          setIsVisible(false)
          setSearchText('')
        }
      }}
    >
      <div
        style={{
          width: '600px',
          maxWidth: '95vw',
          backgroundColor: 'var(--panel-bg, #252526)',
          borderRadius: '4px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索输入框 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-color, #454545)',
            flexShrink: 0
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginRight: '8px', color: 'var(--foreground-muted, #858585)', flexShrink: 0 }}
          >
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          <InputBox
            ref={inputRef}
            value={searchText}
            onChange={setSearchText}
            onKeyDown={handleKeyDown}
            placeholder={t('debugPanel.placeholder', '输入命令... (Ctrl+Shift+P)')}
            className="debug-panel-input"
            style={{
              flex: 1,
            }}
          />
        </div>

        {/* 动作列表 */}
        <div
          ref={resultsRef}
          style={{
            overflow: 'auto',
            flex: 1,
            minHeight: 0,
            position: 'relative'
          }}
        >
          {filteredActions.length === 0 && (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                color: 'var(--foreground-muted, #858585)',
                fontSize: '12px'
              }}
            >
              {t('debugPanel.noCommands', '未找到命令')}
            </div>
          )}

          {filteredActions.map((action, index) => (
            <div
              key={action.id}
              onClick={() => void handleExecute(action)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor:
                  index === selectedIndex
                    ? 'var(--list-active-selection-bg, #04395e)'
                    : 'transparent',
                color:
                  index === selectedIndex
                    ? 'var(--list-active-selection-fg, #fff)'
                    : 'var(--foreground, #ccc)',
                borderBottom: '1px solid var(--border-subtle, #2a2a2a)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {/* 动作名称和快捷键 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {action.label}
                </span>
                {action.shortcut && (
                  <kbd
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--badge-secondary-bg, #4a4a4a)',
                      color: '#fff',
                      fontFamily: 'monospace',
                      flexShrink: 0
                    }}
                  >
                    {action.shortcut}
                  </kbd>
                )}
              </div>

              {/* 动作描述 */}
              {action.description && (
                <div
                  style={{
                    fontSize: '11px',
                    color:
                      index === selectedIndex
                        ? 'var(--list-active-selection-fg-muted, #b0b0b0)'
                        : 'var(--foreground-muted, #858585)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {action.description}
                </div>
              )}
            </div>
          ))}

          {/* 确认对话框覆盖层 */}
          {confirmAction && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(37, 37, 38, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px',
                gap: '12px',
                justifyContent: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--foreground, #ccc)'
                }}
              >
                {t('debugPanel.confirmTitle', '确认执行')}: {confirmAction.label}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--foreground-muted, #858585)'
                }}
              >
                {t('debugPanel.confirmInstruction', '请输入 "{{text}}" 以确认此操作', {
                  text: confirmAction.confirmText
                })}
              </div>
              <InputBox
                ref={confirmInputRef}
                value={confirmInput}
                onChange={setConfirmInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirm()
                  } else if (e.key === 'Escape') {
                    handleCancelConfirm()
                  }
                }}
                placeholder={confirmAction.confirmText}
                className="debug-panel-confirm-input"
                style={{
                  background: 'var(--input-bg, #3c3c3c)',
                  border: '1px solid var(--border-color, #454545)',
                  borderRadius: '3px',
                  padding: '6px 10px',
                  color: 'var(--foreground, #ccc)',
                  fontSize: '13px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleCancelConfirm}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: '1px solid var(--border-color, #454545)',
                    borderRadius: '3px',
                    color: 'var(--foreground, #ccc)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {t('common.cancel', '取消')}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={confirmInput !== confirmAction.confirmText}
                  style={{
                    padding: '6px 12px',
                    background:
                      confirmInput === confirmAction.confirmText
                        ? 'var(--button-primary-bg, #0e639c)'
                        : 'var(--button-disabled-bg, #4a4a4a)',
                    border: 'none',
                    borderRadius: '3px',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: confirmInput === confirmAction.confirmText ? 'pointer' : 'not-allowed'
                  }}
                >
                  {t('common.confirm', '确认')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div
          style={{
            padding: '6px 12px',
            backgroundColor: 'var(--panel-bg-secondary, #1e1e1e)',
            borderTop: '1px solid var(--border-color, #454545)',
            display: 'flex',
            gap: '12px',
            fontSize: '11px',
            color: 'var(--foreground-muted, #858585)',
            flexShrink: 0
          }}
        >
          <span>↑↓ {t('debugPanel.navigate', '导航')}</span>
          <span>↵ {t('debugPanel.execute', '执行')}</span>
          <span>Esc {t('debugPanel.close', '关闭')}</span>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default DebugPanel
