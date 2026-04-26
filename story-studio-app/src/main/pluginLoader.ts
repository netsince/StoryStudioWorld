import { app } from 'electron'
import { join } from 'path'
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs'

export interface PluginManifest {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  main: string
  contributes?: {
    commands?: Array<{ id: string; title: string }>
    activityBar?: Array<{ id: string; title: string; icon?: string }>
    rightActivityBar?: Array<{ id: string; title: string; icon?: string }>
  }
}

export interface PluginInfo {
  manifest: PluginManifest
  path: string
  mainPath: string
  enabled: boolean
}

export interface PluginSettings {
  enabledPlugins: string[]
  disabledPlugins: string[]
}

class PluginLoader {
  private plugins: Map<string, PluginInfo> = new Map()
  private pluginDir: string
  private settingsPath: string
  private settings: PluginSettings

  constructor() {
    this.pluginDir = join(app.getPath('userData'), 'plugins')
    this.settingsPath = join(this.pluginDir, 'plugin-settings.json')
    this.settings = { enabledPlugins: [], disabledPlugins: [] }
  }

  init(): void {
    if (!existsSync(this.pluginDir)) {
      mkdirSync(this.pluginDir, { recursive: true })
    }
    this.loadSettings()
  }

  private loadSettings(): void {
    if (existsSync(this.settingsPath)) {
      try {
        const content = readFileSync(this.settingsPath, 'utf-8')
        this.settings = JSON.parse(content)
      } catch (e) {
        console.error('Failed to load plugin settings:', e)
        this.settings = { enabledPlugins: [], disabledPlugins: [] }
      }
    }
  }

  private saveSettings(): void {
    try {
      writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8')
    } catch (e) {
      console.error('Failed to save plugin settings:', e)
    }
  }

  getPluginDir(): string {
    return this.pluginDir
  }

  discoverPlugins(): PluginInfo[] {
    if (!existsSync(this.pluginDir)) {
      return []
    }

    const dirs = readdirSync(this.pluginDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    const plugins: PluginInfo[] = []

    for (const dir of dirs) {
      const pluginPath = join(this.pluginDir, dir)
      const manifestPath = join(pluginPath, 'manifest.json')

      if (existsSync(manifestPath)) {
        try {
          const content = readFileSync(manifestPath, 'utf-8')
          const manifest: PluginManifest = JSON.parse(content)

          if (!manifest.id || !manifest.name || !manifest.version || !manifest.main) {
            console.warn(`Invalid plugin manifest in ${dir}: missing required fields`)
            continue
          }

          const mainPath = join(pluginPath, manifest.main)
          const isDisabled = this.settings.disabledPlugins.includes(manifest.id)

          const pluginInfo: PluginInfo = {
            manifest,
            path: pluginPath,
            mainPath,
            enabled: !isDisabled
          }

          this.plugins.set(manifest.id, pluginInfo)
          plugins.push(pluginInfo)
        } catch (e) {
          console.error(`Failed to load plugin ${dir}:`, e)
        }
      }
    }

    return plugins
  }

  getPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values())
  }

  getPlugin(pluginId: string): PluginInfo | undefined {
    return this.plugins.get(pluginId)
  }

  setPluginEnabled(pluginId: string, enabled: boolean): boolean {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return false

    plugin.enabled = enabled

    if (enabled) {
      this.settings.disabledPlugins = this.settings.disabledPlugins.filter(
        (id) => id !== pluginId
      )
      if (!this.settings.enabledPlugins.includes(pluginId)) {
        this.settings.enabledPlugins.push(pluginId)
      }
    } else {
      this.settings.enabledPlugins = this.settings.enabledPlugins.filter(
        (id) => id !== pluginId
      )
      if (!this.settings.disabledPlugins.includes(pluginId)) {
        this.settings.disabledPlugins.push(pluginId)
      }
    }

    this.saveSettings()
    return true
  }

  getSettings(): PluginSettings {
    return { ...this.settings }
  }

  clearPluginData(pluginId: string): void {
    this.settings.enabledPlugins = this.settings.enabledPlugins.filter(
      (id) => id !== pluginId
    )
    this.settings.disabledPlugins = this.settings.disabledPlugins.filter(
      (id) => id !== pluginId
    )
    this.saveSettings()
  }
}

export const pluginLoader = new PluginLoader()
