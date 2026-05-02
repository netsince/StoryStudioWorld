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
  /** 标记用户是否已经明确配置过插件（用于首次启动判断） */
  hasExplicitConsent: boolean
}

class PluginLoader {
  private plugins: Map<string, PluginInfo> = new Map()
  private pluginDir: string
  private settingsPath: string
  private settings: PluginSettings

  constructor() {
    this.pluginDir = join(app.getPath('userData'), 'plugins')
    this.settingsPath = join(this.pluginDir, 'plugin-settings.json')
    this.settings = { enabledPlugins: [], disabledPlugins: [], hasExplicitConsent: false }
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
        const parsed = JSON.parse(content) as Partial<PluginSettings>
        this.settings = {
          enabledPlugins: parsed.enabledPlugins ?? [],
          disabledPlugins: parsed.disabledPlugins ?? [],
          hasExplicitConsent: parsed.hasExplicitConsent ?? true // 如果文件存在但没有该字段，视为旧版本，认为用户已配置
        }
      } catch (e) {
        console.error('Failed to load plugin settings:', e)
        this.settings = { enabledPlugins: [], disabledPlugins: [], hasExplicitConsent: false }
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

          // 安全策略：只有在用户明确同意启用，或插件被明确添加到 enabledPlugins 时才启用
          // 首次启动时（hasExplicitConsent=false）默认禁用所有插件
          const isExplicitlyEnabled = this.settings.enabledPlugins.includes(manifest.id)
          const isExplicitlyDisabled = this.settings.disabledPlugins.includes(manifest.id)

          // 插件启用的安全规则：
          // 1. 如果用户明确禁用 -> 禁用
          // 2. 如果用户明确启用 -> 启用
          // 3. 如果用户未配置过（首次启动）-> 默认禁用（安全优先）
          let enabled: boolean
          if (isExplicitlyDisabled) {
            enabled = false
          } else if (isExplicitlyEnabled) {
            enabled = true
          } else {
            // 用户未明确配置过此插件，默认禁用（安全优先）
            enabled = false
          }

          const pluginInfo: PluginInfo = {
            manifest,
            path: pluginPath,
            mainPath,
            enabled
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

    // 标记用户已明确配置过插件
    if (!this.settings.hasExplicitConsent) {
      this.settings.hasExplicitConsent = true
    }

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
