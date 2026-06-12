import './assets/main.scss'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyAppSettings, getAppSettings } from './components/editor/PreferencesPage'
import { usePluginService } from './services/pluginService'
import './i18n'
import { APP_NAME } from './constants/config'

document.title = APP_NAME

const settings = getAppSettings()
applyAppSettings(settings)

// 初始加载插件
void usePluginService.getState().loadPlugins()

// 监听插件重载事件
window.addEventListener('ssw:reload-plugins', () => {
  console.log('[Main] Reloading plugins...')
  void usePluginService.getState().reloadPlugins()
})

// 解决 Electron/Chromium 在 Windows 下 alert/confirm 等原生弹窗关闭后导致窗口失去焦点、输入框无法输入及光标丢失的 Bug
const originalAlert = window.alert
window.alert = function (message?: any) {
  originalAlert(message)
  window.api.focusWindow?.()
}

const originalConfirm = window.confirm
window.confirm = function (message?: string): boolean {
  const result = originalConfirm(message)
  window.api.focusWindow?.()
  return result
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
