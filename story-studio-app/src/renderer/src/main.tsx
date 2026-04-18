import './assets/main.scss'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyAppSettings, getAppSettings } from './components/editor/PreferencesPage'

const settings = getAppSettings()
applyAppSettings(settings)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
