# Story Studio World 插件系统设计方案

## 一、项目架构分析

项目是一个 Electron 应用，架构清晰：

| 层级 | 技术 | 关键模块 |
|------|------|----------|
| 主进程 | Node.js | IPC处理、文件操作、数据库 |
| 渲染进程 | React + Zustand | UI组件、状态管理 |
| 通信层 | Preload | 类型安全的 IPC API |

**已有的扩展基础**：
- `commandService.ts` - 命令注册系统（类似 VS Code）
- `ActivityType` / `RightActivityType` - 活动类型定义
- 完整的 IPC API 层

---

## 二、插件 API 设计

### 2.1 插件清单 (manifest.json)

```typescript
interface PluginManifest {
  id: string                    // 唯一标识
  name: string                  // 显示名称
  version: string
  description?: string
  author?: string
  main: string                  // 入口文件
  contributes?: {
    commands?: CommandContribution[]
    activityBar?: ActivityBarContribution[]
    rightActivityBar?: RightActivityBarContribution[]
    panels?: PanelContribution[]
    menus?: MenuContribution[]
    hooks?: HookContribution[]
  }
}
```

### 2.2 核心 Plugin API

```typescript
interface PluginAPI {
  // === 命令系统 ===
  commands: {
    register(id: string, handler: (...args: any[]) => void): () => void
    execute(id: string, ...args: any[]): Promise<void>
    getCommands(): string[]
  }
  
  // === UI 扩展 ===
  ui: {
    addActivityItem(item: ActivityItem): () => void
    addRightActivityItem(item: RightActivityItem): () => void
    addPanel(id: string, component: React.ComponentType): () => void
    addStatusBarItem(item: StatusBarItem): () => void
    showNotification(message: string, type?: 'info' | 'warning' | 'error'): void
    showModal(options: ModalOptions): Promise<any>
  }
  
  // === 内容访问 ===
  editor: {
    getActiveContent(): string | null
    setContent(content: string): void
    getSelection(): { start: number; end: number; text: string } | null
    onContentChange(callback: (content: string) => void): () => void
    getActiveTab(): Tab | null
    openTab(options: OpenTabOptions): void
    closeTab(tabId: string): void
  }
  
  // === 项目访问 ===
  project: {
    getCurrent(): ProjectData | null
    getNodes(): StoryNode[]
    getNodeById(nodeId: string): StoryNode | undefined
    createNode(input: CreateNodeInput): Promise<StoryNode[]>
    deleteNode(nodeId: string): Promise<void>
    renameNode(nodeId: string, newName: string): Promise<void>
    moveNode(nodeId: string, newParentId: string | null): Promise<void>
    readNodeContent(nodeId: string): Promise<string | null>
    writeNodeContent(nodeId: string, content: string): Promise<void>
  }
  
  // === 钩子系统 ===
  hooks: {
    beforeSave(callback: BeforeSaveCallback): () => void
    afterLoad(callback: AfterLoadCallback): () => void
    onProofread(callback: ProofreadCallback): () => void
    onFileOpen(callback: FileOpenCallback): () => void
    onExport(callback: ExportCallback): () => void
    onNodeCreate(callback: NodeCreateCallback): () => void
    onNodeDelete(callback: NodeDeleteCallback): () => void
  }
  
  // === 插件存储 ===
  storage: {
    get<T>(key: string): T | undefined
    set<T>(key: string, value: T): void
    delete(key: string): void
    clear(): void
  }
  
  // === 工具函数 ===
  utils: {
    showInputBox(options: InputBoxOptions): Promise<string | undefined>
    showQuickPick(items: string[], options?: QuickPickOptions): Promise<string | undefined>
    log(message: string, level?: 'info' | 'warn' | 'error'): void
  }
}
```

---

## 三、钩子系统（修改逻辑的核心）

### 3.1 钩子类型定义

```typescript
type BeforeSaveCallback = (content: string, node: StoryNode) => string | false | void
// 返回 string: 使用修改后的内容保存
// 返回 false: 阻止保存
// 返回 void: 使用原始内容保存

type AfterLoadCallback = (content: string, node: StoryNode) => string | void
// 返回 string: 显示修改后的内容
// 返回 void: 显示原始内容

type ProofreadCallback = (text: string) => ProofreadResult | Promise<ProofreadResult>

type FileOpenCallback = (node: StoryNode, content: string) => void | string

type ExportCallback = (format: string, data: any) => any | Promise<any>

type NodeCreateCallback = (input: CreateNodeInput) => CreateNodeInput | false | void

type NodeDeleteCallback = (nodeId: string) => boolean | void
// 返回 false: 阻止删除
```

### 3.2 钩子系统实现

```typescript
class HookSystem {
  private hooks = new Map<string, Set<Function>>()
  
  // 注册钩子
  on<T extends Function>(event: string, callback: T): () => void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, new Set())
    }
    this.hooks.get(event)!.add(callback)
    return () => this.hooks.get(event)?.delete(callback)
  }
  
  // 触发事件（不等待返回值）
  emit(event: string, ...args: any[]): void {
    const callbacks = this.hooks.get(event)
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(...args)
        } catch (e) {
          console.error(`Hook ${event} error:`, e)
        }
      })
    }
  }
  
  // 执行瀑布流（依次执行，传递结果）
  async waterfall<T>(event: string, initial: T): Promise<T> {
    const callbacks = Array.from(this.hooks.get(event) || [])
    let result = initial
    for (const cb of callbacks) {
      const newResult = await cb(result)
      if (newResult !== undefined) {
        result = newResult
      }
    }
    return result
  }
  
  // 执行拦截器（可被阻止）
  async intercept<T>(event: string, input: T): Promise<{ proceed: boolean; result?: T }> {
    const callbacks = Array.from(this.hooks.get(event) || [])
    for (const cb of callbacks) {
      const result = await cb(input)
      if (result === false) {
        return { proceed: false }
      }
      if (result !== undefined && result !== true) {
        input = result
      }
    }
    return { proceed: true, result: input }
  }
}
```

### 3.3 关键钩子点

| 钩子名称 | 触发时机 | 用途 |
|---------|---------|------|
| `content:beforeSave` | 保存前 | 自动格式化、添加元数据、验证内容 |
| `content:afterLoad` | 加载后 | 内容转换、解析自定义格式 |
| `content:onEdit` | 编辑时 | 实时分析、自动补全 |
| `proofread:process` | 校对时 | 自定义校对引擎、添加校对规则 |
| `file:beforeCreate` | 创建前 | 验证、设置默认内容 |
| `file:beforeDelete` | 删除前 | 确认、清理关联数据 |
| `file:beforeRename` | 重命名前 | 验证名称、更新引用 |
| `export:format` | 导出时 | 支持新导出格式 |
| `ui:renderTab` | 渲染 Tab | 自定义 Tab 渲染 |
| `ui:contextMenu` | 右键菜单 | 添加菜单项 |

---

## 四、UI 扩展点

### 4.1 左侧活动栏扩展

```typescript
interface ActivityItem {
  id: string
  icon: React.ReactNode | string  // SVG 字符串或图标名
  title: string
  panel?: string  // 关联的面板 ID
  onClick?: () => void
  order?: number  // 排序权重
}
```

**实现方式**：修改 `ActivityBar.tsx`，从插件系统读取额外项

### 4.2 右侧活动栏扩展

```typescript
interface RightActivityItem {
  id: string
  icon: React.ReactNode | string
  title: string
  panel: React.ComponentType<{ api: PluginAPI }>  // 面板组件
  order?: number
}
```

**实现方式**：修改 `RightActivityBar.tsx` 和 `RightPanel.tsx`

### 4.3 Tab 类型扩展

```typescript
interface TabContribution {
  type: string  // 自定义 tab type
  component: React.ComponentType<{ tab: Tab; api: PluginAPI }>
  icon?: React.ReactNode
  toolbar?: React.ComponentType<{ tab: Tab; api: PluginAPI }>
}
```

**实现方式**：修改 `TabContentRenderer.tsx`

### 4.4 状态栏扩展

```typescript
interface StatusBarItem {
  id: string
  alignment: 'left' | 'right'
  priority: number  // 排序
  render: () => React.ReactNode
  tooltip?: string
  onClick?: () => void
}
```

**实现方式**：修改 `StatusBar.tsx`

### 4.5 右键菜单扩展

```typescript
interface MenuContribution {
  context: 'treeNode' | 'editor' | 'tab'
  items: MenuItem[]
}

interface MenuItem {
  id: string
  label: string
  icon?: string
  order?: number
  when?: (context: any) => boolean  // 条件显示
  action: (context: any) => void
}
```

---

## 五、插件加载机制

### 5.1 目录结构

```
{userData}/plugins/
├── plugin-a/
│   ├── manifest.json    # 插件清单
│   ├── index.js         # 入口文件（编译后）
│   ├── src/             # 源码（可选）
│   └── assets/          # 资源文件
├── plugin-b/
│   └── ...
└── plugin-settings.json # 插件配置
```

### 5.2 插件加载器

```typescript
// src/main/pluginLoader.ts

import { app } from 'electron'
import { join } from 'path'
import { readFileSync, readdirSync, existsSync } from 'fs'

interface Plugin {
  manifest: PluginManifest
  path: string
  enabled: boolean
}

class PluginLoader {
  private plugins: Map<string, Plugin> = new Map()
  private pluginDir: string
  
  constructor() {
    this.pluginDir = join(app.getPath('userData'), 'plugins')
  }
  
  async discoverPlugins(): Promise<Plugin[]> {
    if (!existsSync(this.pluginDir)) {
      return []
    }
    
    const dirs = readdirSync(this.pluginDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
    
    const plugins: Plugin[] = []
    
    for (const dir of dirs) {
      const pluginPath = join(this.pluginDir, dir)
      const manifestPath = join(pluginPath, 'manifest.json')
      
      if (existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
          plugins.push({
            manifest,
            path: pluginPath,
            enabled: true
          })
        } catch (e) {
          console.error(`Failed to load plugin ${dir}:`, e)
        }
      }
    }
    
    return plugins
  }
  
  getPluginAPI(pluginId: string): PluginAPI {
    // 创建插件专属的 API 实例
    return createPluginAPI(pluginId)
  }
}

export const pluginLoader = new PluginLoader()
```

### 5.3 渲染进程插件管理

```typescript
// src/renderer/src/services/pluginService.ts

import { createContextBridge } from './contextBridge'

interface PluginState {
  id: string
  name: string
  enabled: boolean
  loaded: boolean
  error?: string
}

class PluginService {
  private plugins: Map<string, PluginState> = new Map()
  private hooks: HookSystem
  private commands: CommandService
  
  constructor() {
    this.hooks = new HookSystem()
    this.commands = commandService
  }
  
  async loadPlugins(): Promise<void> {
    const pluginList = await window.api.getPlugins()
    
    for (const plugin of pluginList) {
      try {
        await this.loadPlugin(plugin)
      } catch (e) {
        console.error(`Failed to load plugin ${plugin.id}:`, e)
      }
    }
  }
  
  private async loadPlugin(plugin: PluginInfo): Promise<void> {
    const api = this.createPluginAPI(plugin.id)
    
    // 动态加载插件代码
    const pluginModule = await import(/* webpackIgnore: true */ plugin.mainPath)
    
    if (typeof pluginModule.activate === 'function') {
      await pluginModule.activate(api)
    }
    
    this.plugins.set(plugin.id, {
      id: plugin.id,
      name: plugin.name,
      enabled: true,
      loaded: true
    })
  }
  
  private createPluginAPI(pluginId: string): PluginAPI {
    const storage = new PluginStorage(pluginId)
    
    return {
      commands: {
        register: (id, handler) => {
          const fullId = `${pluginId}.${id}`
          return this.commands.registerCommand(fullId, handler, pluginId)
        },
        execute: (id, ...args) => this.commands.executeCommand(id, ...args),
        getCommands: () => Array.from(this.commands.getAllCommands())
      },
      
      hooks: {
        beforeSave: (cb) => this.hooks.on('content:beforeSave', cb),
        afterLoad: (cb) => this.hooks.on('content:afterLoad', cb),
        onProofread: (cb) => this.hooks.on('proofread:process', cb),
        onFileOpen: (cb) => this.hooks.on('file:open', cb),
        onExport: (cb) => this.hooks.on('export:format', cb),
        onNodeCreate: (cb) => this.hooks.on('node:create', cb),
        onNodeDelete: (cb) => this.hooks.on('node:delete', cb)
      },
      
      storage: {
        get: (key) => storage.get(key),
        set: (key, value) => storage.set(key, value),
        delete: (key) => storage.delete(key),
        clear: () => storage.clear()
      },
      
      // ... 其他 API
    }
  }
  
  // 暴露给组件使用
  getHooks() {
    return this.hooks
  }
  
  getPlugins() {
    return Array.from(this.plugins.values())
  }
}

export const pluginService = new PluginService()
```

---

## 六、IPC 扩展

### 6.1 主进程新增

```typescript
// src/main/index.ts 新增

ipcMain.handle('get-plugins', async () => {
  return pluginLoader.discoverPlugins()
})

ipcMain.handle('get-plugin-settings', async () => {
  return pluginLoader.getSettings()
})

ipcMain.handle('set-plugin-enabled', async (_, pluginId: string, enabled: boolean) => {
  return pluginLoader.setPluginEnabled(pluginId, enabled)
})
```

### 6.2 Preload 新增

```typescript
// src/preload/index.ts 新增

getPlugins: (): Promise<PluginInfo[]> => ipcRenderer.invoke('get-plugins'),
getPluginSettings: (): Promise<PluginSettings> => ipcRenderer.invoke('get-plugin-settings'),
setPluginEnabled: (pluginId: string, enabled: boolean): Promise<void> =>
  ipcRenderer.invoke('set-plugin-enabled', pluginId, enabled)
```

---

## 七、实现计划

### Phase 1: 核心框架 (P0)

1. **钩子系统** (`src/renderer/src/services/hookService.ts`)
   - HookSystem 类实现
   - 基础钩子点集成

2. **插件服务** (`src/renderer/src/services/pluginService.ts`)
   - 插件加载
   - API 创建
   - 插件状态管理

3. **命令扩展**
   - 扩展现有 commandService 支持插件

### Phase 2: 内容 API (P1)

1. **Editor API**
   - 内容读写
   - 选区管理
   - 事件监听

2. **Project API**
   - 节点操作
   - 项目信息

### Phase 3: UI 扩展 (P1-P2)

1. **右侧面板扩展**
   - 修改 RightActivityBar
   - 修改 RightPanel

2. **左侧活动栏扩展**
   - 修改 ActivityBar
   - 修改 Explorer

3. **Tab 扩展**
   - 修改 TabContentRenderer

### Phase 4: 存储与工具 (P3)

1. **插件存储**
   - localStorage 封装
   - 或独立数据库表

2. **工具函数**
   - 输入框
   - 选择器
   - 通知

---

## 八、示例插件

### 8.1 字数统计插件

```json
// manifest.json
{
  "id": "word-counter",
  "name": "字数统计",
  "version": "1.0.0",
  "description": "统计文档字数",
  "main": "index.js",
  "contributes": {
    "rightActivityBar": [{
      "id": "word-counter",
      "title": "统计"
    }]
  }
}
```

```javascript
// index.js
import React from 'react'

function WordCounterPanel({ api }) {
  const [stats, setStats] = React.useState(null)
  
  React.useEffect(() => {
    const updateStats = (content) => {
      if (content) {
        setStats({
          chars: content.length,
          charsNoSpace: content.replace(/\s/g, '').length,
          words: content.split(/\s+/).filter(Boolean).length,
          lines: content.split('\n').length
        })
      }
    }
    
    const content = api.editor.getActiveContent()
    if (content) updateStats(content)
    
    return api.editor.onContentChange(updateStats)
  }, [api])
  
  if (!stats) return <div>请打开文档</div>
  
  return (
    <div style={{ padding: '12px' }}>
      <h3>字数统计</h3>
      <div>字符数: {stats.chars}</div>
      <div>字符(不含空格): {stats.charsNoSpace}</div>
      <div>词数: {stats.words}</div>
      <div>行数: {stats.lines}</div>
    </div>
  )
}

export function activate(api) {
  api.ui.addRightActivityItem({
    id: 'word-counter',
    icon: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>',
    title: '字数统计',
    panel: WordCounterPanel
  })
  
  api.commands.register('showWordCount', () => {
    const content = api.editor.getActiveContent()
    if (content) {
      api.ui.showNotification(`当前字数: ${content.length}`)
    }
  })
}
```

### 8.2 自动保存时间戳插件

```javascript
// index.js
export function activate(api) {
  api.hooks.beforeSave((content, node) => {
    if (node.kind === 'story') {
      // 移除旧的时间戳
      const cleaned = content.replace(/\n\n<!-- 最后编辑: .*? -->\s*$/, '')
      // 添加新的时间戳
      return cleaned + `\n\n<!-- 最后编辑: ${new Date().toLocaleString('zh-CN')} -->`
    }
    return content
  })
}
```

### 8.3 自定义校对插件

```javascript
// index.js
export function activate(api) {
  api.hooks.onProofread(async (text) => {
    // 自定义校对规则
    const issues = []
    
    // 检查重复词
    const duplicatePattern = /(\b\w+\b)\s+\1/g
    let match
    while ((match = duplicatePattern.exec(text)) !== null) {
      issues.push({
        id: `dup-${match.index}`,
        type: 'duplicate',
        message: `重复词: "${match[1]}"`,
        suggestion: `删除重复的 "${match[1]}"`,
        start: match.index,
        end: match.index + match[0].length,
        line: text.substring(0, match.index).split('\n').length,
        column: match.index - text.lastIndexOf('\n', match.index),
        severity: 'warning'
      })
    }
    
    return {
      issues,
      stats: {
        totalIssues: issues.length,
        errorCount: 0,
        warningCount: issues.length,
        infoCount: 0
      }
    }
  })
}
```

---

## 九、插件管理界面

在左侧活动栏的"插件"项中显示：

```typescript
// 插件管理面板
function PluginManagerPanel() {
  const plugins = usePluginService(s => s.plugins)
  
  return (
    <div className="plugin-manager">
      <div className="plugin-header">
        <h3>已安装插件</h3>
        <button onClick={() => openPluginsFolder()}>打开插件目录</button>
      </div>
      
      <div className="plugin-list">
        {plugins.map(plugin => (
          <div key={plugin.id} className="plugin-item">
            <div className="plugin-info">
              <span className="plugin-name">{plugin.name}</span>
              <span className="plugin-version">{plugin.version}</span>
            </div>
            <div className="plugin-desc">{plugin.description}</div>
            <div className="plugin-actions">
              <Toggle 
                checked={plugin.enabled} 
                onChange={(enabled) => togglePlugin(plugin.id, enabled)}
              />
              <button onClick={() => showPluginSettings(plugin.id)}>设置</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 十、注意事项

1. **热重载**：开发时支持插件热重载，生产环境需重启应用
2. **错误处理**：插件错误不应影响主应用
3. **性能**：大量插件时注意性能影响
4. **版本兼容**：manifest 中可声明兼容的应用版本
5. **依赖管理**：插件可声明 npm 依赖（需打包或运行时安装）
