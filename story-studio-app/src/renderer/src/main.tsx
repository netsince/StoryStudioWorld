import './assets/main.scss'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyAppSettings, getAppSettings } from './components/editor/PreferencesPage'
import { usePluginService } from './services/pluginService'

const settings = getAppSettings()
applyAppSettings(settings)

void usePluginService.getState().loadPlugins()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
