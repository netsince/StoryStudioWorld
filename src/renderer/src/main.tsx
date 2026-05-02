import './assets/main.scss'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyAppSettings, getAppSettings } from './components/editor/PreferencesPage'
import { usePluginService } from './services/pluginService'
import './i18n'

const settings = getAppSettings()
applyAppSettings(settings)

// 初始加载插件
void usePluginService.getState().loadPlugins()

// 监听插件重载事件
window.addEventListener('ssw:reload-plugins', () => {
  console.log('[Main] Reloading plugins...')
  void usePluginService.getState().reloadPlugins()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
