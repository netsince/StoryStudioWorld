# 插件 API 参考

本文档详细描述了插件可用的所有 API。

## API 对象

插件通过 `activate` 函数接收 API 对象：

```javascript
function activate(api) {
  // 使用 api 对象
}
```

## 目录

- [commands - 命令系统](#commands---命令系统)
- [tools - 工具系统](#tools---工具系统)
- [ui - UI 扩展](#ui---ui-扩展)
- [editor - 编辑器](#editor---编辑器)
- [project - 项目](#project---项目)
- [story - 故事文件](#story---故事文件)
- [worldsetting - 世界设定](#worldsetting---世界设定)
- [hooks - 钩子系统](#hooks---钩子系统)
- [storage - 本地存储](#storage---本地存储)
- [utils - 工具函数](#utils---工具函数)
- [native - 原生能力](#native---原生能力)
- [i18n - 国际化](#i18n---国际化)

---

## commands - 命令系统

命令系统允许插件注册和执行命令。

### commands.register(id, handler)

注册一个命令。

**参数：**
- `id` (string): 命令标识符（不含插件前缀）
- `handler` (function): 命令处理函数

**返回：** 
- `function`: 取消注册的函数

**示例：**

```javascript
var dispose = api.commands.register('sayHello', function(name) {
  console.log('Hello, ' + name);
});

// 取消注册
dispose();
```

完整命令 ID 为 `{pluginId}.{commandId}`，如 `my-plugin.sayHello`。

### commands.execute(id, ...args)

执行一个命令。

**参数：**
- `id` (string): 完整命令 ID
- `...args` (any): 命令参数

**返回：**
- `Promise<void>`

**示例：**

```javascript
await api.commands.execute('my-plugin.sayHello', 'World');
```

### commands.getCommands()

获取所有已注册的命令。

**返回：**
- `string[]`: 命令 ID 列表

**示例：**

```javascript
var commands = api.commands.getCommands();
console.log(commands); // ['my-plugin.sayHello', ...]
```

---

## tools - 工具系统

工具系统允许插件注册可被其他插件调用的工具函数。

### tools.register(tool)

注册一个工具。

**参数：**
- `tool` (ToolDefinition): 工具定义对象

```typescript
interface ToolDefinition {
  id: string           // 工具标识符
  name: string         // 工具名称
  description: string  // 工具描述
  schema?: object      // 参数 Schema（可选）
  handler: (...args: unknown[]) => unknown | Promise<unknown>
}
```

**返回：**
- `function`: 取消注册的函数

**示例：**

```javascript
var dispose = api.tools.register({
  id: 'translate',
  name: '翻译工具',
  description: '将文本翻译为目标语言',
  handler: function(text, targetLang) {
    // 翻译逻辑
    return translatedText;
  }
});
```

### tools.getAll()

获取所有已注册的工具。

**返回：**
- `ToolInfo[]`: 工具信息列表

```typescript
interface ToolInfo {
  pluginId: string
  id: string
  name: string
  description: string
  schema?: object
}
```

### tools.invoke(fullId, ...args)

调用一个工具。

**参数：**
- `fullId` (string): 完整工具 ID（格式：`{pluginId}.{toolId}`）
- `...args` (any): 工具参数

**返回：**
- `Promise<unknown>`: 工具执行结果

**示例：**

```javascript
var result = await api.tools.invoke('my-plugin.translate', 'Hello', 'zh');
```

---

## ui - UI 扩展

UI 扩展 API 允许插件添加界面元素。

### ui.addActivityItem(item)

在左侧活动栏添加项目。

**参数：**
- `item` (object): 活动栏项目

```typescript
interface ActivityItem {
  id: string
  icon: React.ReactNode | string  // SVG 字符串
  title: string
  panel?: React.ComponentType     // 关联的面板组件
  onClick?: () => void
  order?: number
}
```

**返回：**
- `function`: 移除项目的函数

**示例：**

```javascript
var dispose = api.ui.addActivityItem({
  id: 'my-explorer',
  icon: '<svg viewBox="0 0 24 24">...</svg>',
  title: '我的资源管理器',
  onClick: function() {
    console.log('点击了');
  }
});
```

### ui.addRightActivityItem(item)

在右侧活动栏添加面板。

**参数：**
- `item` (object): 右侧活动栏项目

```typescript
interface RightActivityItem {
  id: string
  icon: React.ReactNode | string
  title: string
  panel?: (props: { api: PluginAPI }) => React.ReactNode | HTMLElement
  webViewId?: string
  order?: number
}
```

**返回：**
- `function`: 移除项目的函数

**示例：**

```javascript
var dispose = api.ui.addRightActivityItem({
  id: 'my-panel',
  icon: '<svg viewBox="0 0 24 24">...</svg>',
  title: '我的面板',
  panel: function(props) {
    var container = document.createElement('div');
    container.innerHTML = '<h3>面板内容</h3>';
    return container;
  }
});
```

### ui.addStatusBarItem(item)

在状态栏添加项目。

**参数：**
- `item` (object): 状态栏项目

```typescript
interface StatusBarItem {
  id: string
  alignment: 'left' | 'right'
  priority: number
  render: () => React.ReactNode
  tooltip?: string
  onClick?: () => void
}
```

**返回：**
- `function`: 移除项目的函数

### ui.showNotification(message, type?)

显示通知消息。

**参数：**
- `message` (string): 通知内容
- `type` (string, 可选): 通知类型，默认 `'info'`
  - `'info'`: 信息
  - `'warning'`: 警告
  - `'error'`: 错误

**示例：**

```javascript
api.ui.showNotification('操作成功', 'info');
api.ui.showNotification('请注意', 'warning');
api.ui.showNotification('发生错误', 'error');
```

### ui.createWebView(options)

创建一个 WebView。

**参数：**
- `options` (object): WebView 配置

```typescript
interface WebViewOptions {
  id: string
  html: string
  scripts?: string[]
  styles?: string[]
  onMessage?: (message: unknown) => void
}
```

**返回：**
- `object`: WebView 控制对象

```typescript
{
  postMessage: (message: unknown) => void
  dispose: () => void
}
```

**示例：**

```javascript
var webView = api.ui.createWebView({
  id: 'my-webview',
  html: '<div id="content">Hello WebView</div>',
  onMessage: function(message) {
    console.log('收到 WebView 消息:', message);
  }
});

// 发送消息到 WebView
webView.postMessage({ type: 'update', data: 'new content' });

// 销毁 WebView
webView.dispose();
```

### ui.addWebViewPanel(options)

添加一个 WebView 面板到右侧活动栏。

**参数：**
- `options` (object): WebView 面板配置

```typescript
interface WebViewPanelOptions {
  id: string
  title: string
  icon: React.ReactNode | string
  html: string
  scripts?: string[]
  styles?: string[]
  onMessage?: (message: unknown) => void
}
```

**返回：**
- `object`: WebView 控制对象

**示例：**

```javascript
var webView = api.ui.addWebViewPanel({
  id: 'my-webview-panel',
  title: 'WebView 面板',
  icon: '<svg viewBox="0 0 24 24">...</svg>',
  html: '<div id="app"></div>',
  onMessage: function(message) {
    if (message.type === 'action') {
      // 处理消息
    }
  }
});
```

---

## editor - 编辑器

编辑器 API 允许插件访问和操作编辑器内容。

### editor.getActiveContent()

获取当前活动编辑器的内容。

**返回：**
- `Promise<string | null>`: 编辑器内容，如果没有打开文件则返回 null

**示例：**

```javascript
var content = await api.editor.getActiveContent();
if (content) {
  console.log('当前内容:', content);
}
```

### editor.getActiveTab()

获取当前活动的 Tab。

**返回：**
- `Tab | null`: 当前 Tab 信息

```typescript
interface Tab {
  id: string
  title: string
  type: 'file' | 'settings' | string
  nodeId?: string
  kind?: 'story' | 'setting'
}
```

### editor.openTab(options)

打开一个 Tab。

**参数：**
- `options` (object): Tab 配置

```typescript
interface OpenTabOptions {
  id: string
  title: string
  type: string
  nodeId?: string
  kind?: 'story' | 'setting'
}
```

**示例：**

```javascript
api.editor.openTab({
  id: 'my-custom-tab',
  title: '自定义 Tab',
  type: 'custom'
});
```

### editor.closeTab(tabId)

关闭指定的 Tab。

**参数：**
- `tabId` (string): Tab ID

### editor.onContentChange(callback)

监听编辑器内容变化。

**参数：**
- `callback` (function): 内容变化回调

**返回：**
- `function`: 取消监听的函数

**示例：**

```javascript
var dispose = api.editor.onContentChange(function(content) {
  console.log('内容已变化:', content.length, '字符');
});

// 取消监听
dispose();
```

### editor.onTabChange(callback)

监听 Tab 切换。

**参数：**
- `callback` (function): Tab 变化回调

**返回：**
- `function`: 取消监听的函数

**示例：**

```javascript
var dispose = api.editor.onTabChange(function(tab) {
  if (tab) {
    console.log('切换到:', tab.title);
  }
});
```

---

## project - 项目

项目 API 允许插件访问项目数据。

### project.getCurrent()

获取当前项目信息。

**返回：**
- `ProjectData | null`: 项目信息

```typescript
interface ProjectData {
  projectSettingsPath: string
  projectName: string
  // ...其他项目信息
}
```

### project.getNodes()

获取所有故事节点。

**返回：**
- `StoryNode[]`: 节点列表

```typescript
interface StoryNode {
  id: string
  name: string
  type: 'file' | 'folder'
  kind: 'story' | 'setting'
  parentId: string | null
}
```

### project.getNodeById(nodeId)

根据 ID 获取节点。

**参数：**
- `nodeId` (string): 节点 ID

**返回：**
- `StoryNode | undefined`: 节点信息

### project.createNode(input)

创建新节点。

**参数：**
- `input` (CreateNodeInput): 创建参数

```typescript
interface CreateNodeInput {
  projectSettingsPath: string
  parentId: string | null
  name: string
  type: 'file' | 'folder'
  kind: 'story' | 'setting'
}
```

**返回：**
- `Promise<StoryNode[]>`: 创建的节点列表

**示例：**

```javascript
var project = api.project.getCurrent();
var nodes = await api.project.createNode({
  projectSettingsPath: project.projectSettingsPath,
  parentId: null,
  name: '新章节',
  type: 'folder',
  kind: 'story'
});
```

### project.deleteNode(nodeId)

删除节点。

**参数：**
- `nodeId` (string): 节点 ID

**返回：**
- `Promise<void>`

### project.renameNode(nodeId, newName)

重命名节点。

**参数：**
- `nodeId` (string): 节点 ID
- `newName` (string): 新名称

**返回：**
- `Promise<void>`

### project.moveNode(nodeId, newParentId)

移动节点。

**参数：**
- `nodeId` (string): 节点 ID
- `newParentId` (string | null): 新父节点 ID

**返回：**
- `Promise<void>`

### project.readNodeContent(nodeId)

读取节点内容。

**参数：**
- `nodeId` (string): 节点 ID

**返回：**
- `Promise<string | null>`: 节点内容

### project.writeNodeContent(nodeId, content)

写入节点内容。

**参数：**
- `nodeId` (string): 节点 ID
- `content` (string): 内容

**返回：**
- `Promise<void>`

### project.getNodeSummaryAndOutline(nodeId)

获取节点的摘要和大纲。

**参数：**
- `nodeId` (string): 节点 ID

**返回：**
- `Promise<{ summary: string | null; outline: string | null }>`

### project.updateNodeSummaryAndOutline(nodeId, summary, outline)

更新节点的摘要和大纲。

**参数：**
- `nodeId` (string): 节点 ID
- `summary` (string): 摘要
- `outline` (string): 大纲

**返回：**
- `Promise<void>`

---

## story - 故事文件

故事文件 API 提供对故事文件的抽象访问。

### story.getContent(path)

获取故事文件内容。

**参数：**
- `path` (string): 文件路径（相对路径，如 `章节1/场景1`）

**返回：**
- `Promise<string | null>`: 文件内容

### story.setContent(path, content)

设置故事文件内容。

**参数：**
- `path` (string): 文件路径
- `content` (string): 文件内容

**返回：**
- `Promise<void>`

### story.list(path)

列出目录内容。

**参数：**
- `path` (string): 目录路径（空字符串表示根目录）

**返回：**
- `Array<{ name: string; type: 'file' | 'folder'; path: string }>`

**示例：**

```javascript
var items = api.story.list('');
// [{ name: '第一章', type: 'folder', path: '第一章' }, ...]
```

### story.rename(path, newPath)

重命名故事文件或文件夹。

**参数：**
- `path` (string): 原路径
- `newPath` (string): 新路径

**返回：**
- `Promise<void>`

### story.delete(path)

删除故事文件或文件夹。

**参数：**
- `path` (string): 路径

**返回：**
- `Promise<void>`

### story.create(path, type)

创建故事文件或文件夹。

**参数：**
- `path` (string): 路径
- `type` (string): `'file'` 或 `'folder'`

**返回：**
- `Promise<void>`

### story.archive(path)

归档故事文件或文件夹。

**参数：**
- `path` (string): 路径

**返回：**
- `Promise<void>`

---

## worldsetting - 世界设定

世界设定 API 提供对设定文件的访问（JSON 格式）。

### worldsetting.getContent(path)

获取设定文件内容。

**参数：**
- `path` (string): 文件路径

**返回：**
- `Promise<Record<string, string> | null>`: JSON 对象

### worldsetting.setContent(path, content)

设置设定文件内容。

**参数：**
- `path` (string): 文件路径
- `content` (Record<string, string>): JSON 对象

**返回：**
- `Promise<void>`

### worldsetting.list(path)

列出设定目录内容。

**返回：**
- `Array<{ name: string; type: 'file' | 'folder'; path: string }>`

### worldsetting.getCategories()

获取所有设定分类（一级目录）。

**返回：**
- `string[]`: 分类名称列表

**示例：**

```javascript
var categories = api.worldsetting.getCategories();
// ['人物', '地点', '物品', ...]
```

### worldsetting.getFieldConfig(path)

获取设定文件的字段配置。

**参数：**
- `path` (string): 文件路径

**返回：**
- `{ single: string[]; multi: string[] }`: 字段配置

**示例：**

```javascript
var config = api.worldsetting.getFieldConfig('人物/主角');
// { single: ['name', 'gender', 'age'], multi: ['background', 'motivation'] }
```

### worldsetting.rename(path, newPath)

重命名设定文件或文件夹。

### worldsetting.delete(path)

删除设定文件或文件夹。

### worldsetting.create(path, type)

创建设定文件或文件夹。

**返回：**
- `Promise<string | null>`: 错误消息，成功时返回 null

**注意：** 设定文件有创建限制，不能在根目录或分类目录下直接创建文件。

### worldsetting.archive(path)

归档设定文件或文件夹。

---

## hooks - 钩子系统

钩子系统允许插件拦截和处理应用事件。详见 [钩子系统文档](./hooks.md)。

### hooks.beforeSave(callback)

在内容保存前触发。

**参数：**
- `callback` (function): 回调函数

```typescript
type BeforeSaveCallback = (
  content: string, 
  node: StoryNode
) => string | false | void
```

**返回值：**
- `string`: 使用修改后的内容保存
- `false`: 阻止保存
- `void`: 使用原始内容保存

**示例：**

```javascript
var dispose = api.hooks.beforeSave(function(content, node) {
  if (node.kind === 'story') {
    // 添加时间戳
    return content + '\n\n<!-- 保存于: ' + new Date().toISOString() + ' -->';
  }
  return content;
});
```

### hooks.afterLoad(callback)

在内容加载后触发。

**参数：**
- `callback` (function): 回调函数

```typescript
type AfterLoadCallback = (
  content: string, 
  node: StoryNode
) => string | void
```

**返回值：**
- `string`: 显示修改后的内容
- `void`: 显示原始内容

### hooks.onProofread(callback)

在校对时触发。

**参数：**
- `callback` (function): 回调函数

```typescript
type ProofreadCallback = (
  text: string
) => ProofreadResult | Promise<ProofreadResult>
```

**示例：**

```javascript
var dispose = api.hooks.onProofread(function(text) {
  var issues = [];
  
  // 检查重复词
  var duplicatePattern = /(\b\w+\b)\s+\1/g;
  var match;
  while ((match = duplicatePattern.exec(text)) !== null) {
    issues.push({
      id: 'dup-' + match.index,
      type: 'duplicate',
      message: '重复词: "' + match[1] + '"',
      suggestion: '删除重复的 "' + match[1] + '"',
      start: match.index,
      end: match.index + match[0].length,
      line: text.substring(0, match.index).split('\n').length,
      column: match.index - text.lastIndexOf('\n', match.index),
      severity: 'warning'
    });
  }
  
  return {
    issues: issues,
    stats: {
      totalIssues: issues.length,
      errorCount: 0,
      warningCount: issues.length,
      infoCount: 0
    }
  };
});
```

### hooks.onFileOpen(callback)

在文件打开时触发。

**参数：**
- `callback` (function): 回调函数

```typescript
type FileOpenCallback = (
  node: StoryNode, 
  content: string
) => void | string
```

### hooks.onNodeCreate(callback)

在节点创建前触发。

**参数：**
- `callback` (function): 回调函数

```typescript
type NodeCreateCallback = (
  input: CreateNodeInput
) => CreateNodeInput | false | void
```

**返回值：**
- `CreateNodeInput`: 使用修改后的输入创建
- `false`: 阻止创建
- `void`: 使用原始输入创建

### hooks.onNodeDelete(callback)

在节点删除前触发。

**参数：**
- `callback` (function): 回调函数

```typescript
type NodeDeleteCallback = (
  nodeId: string, 
  node: StoryNode
) => boolean | void
```

**返回值：**
- `false`: 阻止删除
- `void` 或 `true`: 允许删除

---

## storage - 本地存储

每个插件有独立的本地存储空间，数据存储在 localStorage 中。

### storage.get(key)

获取存储的值。

**参数：**
- `key` (string): 键名

**返回：**
- `T | undefined`: 存储的值

**示例：**

```javascript
var settings = api.storage.get('settings');
if (settings) {
  console.log('用户设置:', settings);
}
```

### storage.set(key, value)

存储值。

**参数：**
- `key` (string): 键名
- `value` (T): 要存储的值

**示例：**

```javascript
api.storage.set('settings', {
  theme: 'dark',
  fontSize: 14
});
```

### storage.delete(key)

删除存储的值。

**参数：**
- `key` (string): 键名

### storage.clear()

清空插件的所有存储数据。

---

## utils - 工具函数

### utils.log(message, level?)

输出日志消息。

**参数：**
- `message` (string): 日志消息
- `level` (string, 可选): 日志级别，默认 `'info'`
  - `'info'`: 信息
  - `'warn'`: 警告
  - `'error'`: 错误

**示例：**

```javascript
api.utils.log('插件已加载');
api.utils.log('配置缺失', 'warn');
api.utils.log('发生错误', 'error');
```

---

## native - 原生能力

原生能力 API 提供对 Node.js 和系统功能的访问。

### native.fetch(url, options?)

发起网络请求。

**参数：**
- `url` (string): 请求 URL
- `options` (PluginFetchOptions, 可选): 请求选项

```typescript
interface PluginFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: string
  timeout?: number
}
```

**返回：**
- `Promise<PluginFetchResponse>`

```typescript
interface PluginFetchResponse {
  ok: boolean
  status: number
  statusText: string
  body: string
}
```

**示例：**

```javascript
var response = await api.native.fetch('https://api.example.com/data', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer token'
  }
});

if (response.ok) {
  var data = JSON.parse(response.body);
  console.log(data);
}
```

### native.fetchStream(url, callbacks, options?)

发起流式网络请求。

**参数：**
- `url` (string): 请求 URL
- `callbacks` (object): 回调函数
- `options` (PluginFetchStreamOptions, 可选): 请求选项

```typescript
interface PluginFetchStreamCallbacks {
  onStart?: (info: { status: number }) => void
  onChunk?: (chunk: string) => void
  onError?: (error: Error) => void
  onEnd?: () => void
}
```

**返回：**
- `{ abort: () => void; streamId: string }`: 控制对象

**示例：**

```javascript
var stream = api.native.fetchStream(
  'https://api.example.com/stream',
  {
    onStart: function(info) {
      console.log('流开始, 状态:', info.status);
    },
    onChunk: function(chunk) {
      console.log('收到数据块:', chunk);
    },
    onError: function(error) {
      console.error('错误:', error.message);
    },
    onEnd: function() {
      console.log('流结束');
    }
  }
);

// 中止流
stream.abort();
```

### native.readFile(path, encoding?)

读取文件。

**参数：**
- `path` (string): 文件路径
- `encoding` (BufferEncoding, 可选): 编码，默认 `'utf-8'`

**返回：**
- `Promise<{ success: boolean; content?: string; error?: string }>`

### native.writeFile(path, content)

写入文件。

**参数：**
- `path` (string): 文件路径
- `content` (string): 文件内容

**返回：**
- `Promise<{ success: boolean; error?: string }>`

### native.exists(path)

检查文件或目录是否存在。

**参数：**
- `path` (string): 路径

**返回：**
- `Promise<boolean>`

### native.mkdir(path)

创建目录。

**参数：**
- `path` (string): 目录路径

**返回：**
- `Promise<{ success: boolean; error?: string }>`

### native.readdir(path)

读取目录内容。

**参数：**
- `path` (string): 目录路径

**返回：**
- `Promise<{ success: boolean; entries?: string[]; error?: string }>`

### native.unlink(path)

删除文件。

**参数：**
- `path` (string): 文件路径

**返回：**
- `Promise<{ success: boolean; error?: string }>`

### native.exec(command, cwd?)

执行系统命令。

**参数：**
- `command` (string): 命令
- `cwd` (string, 可选): 工作目录

**返回：**
- `Promise<PluginExecResult>`

```typescript
interface PluginExecResult {
  stdout: string
  stderr: string
  error?: string
}
```

**示例：**

```javascript
var result = await api.native.exec('echo Hello');
console.log(result.stdout); // "Hello"
```

### native.getAppPath(name)

获取应用路径。

**参数：**
- `name` (string): 路径名称
  - `'home'`: 用户主目录
  - `'appData'`: 应用数据目录
  - `'userData'`: 用户数据目录
  - `'temp'`: 临时目录
  - `'desktop'`: 桌面目录
  - `'documents'`: 文档目录

**返回：**
- `Promise<string>`: 路径

**示例：**

```javascript
var userDataPath = await api.native.getAppPath('userData');
console.log('用户数据目录:', userDataPath);
```

---

## i18n - 国际化

国际化 API 允许插件支持多语言。

### i18n.addLanguage(languageFile)

添加语言包。

**参数：**
- `languageFile` (LanguageFile): 语言文件对象

```typescript
interface LanguageFile {
  languageMetadata: {
    code: string
    name: string
    nativeName: string
  }
  translations: Record<string, string | Record<string, string>>
}
```

**返回：**
- `boolean`: 是否添加成功

**示例：**

```javascript
api.i18n.addLanguage({
  languageMetadata: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語'
  },
  translations: {
    'common.save': '保存',
    'common.cancel': 'キャンセル'
  }
});
```

### i18n.getAvailableLanguages()

获取可用语言列表。

**返回：**
- `LanguageMetadata[]`

```typescript
interface LanguageMetadata {
  code: string
  name: string
  nativeName: string
}
```

### i18n.getCurrentLanguage()

获取当前语言代码。

**返回：**
- `string`: 语言代码（如 `'zh-CN'`, `'en'`）

### i18n.setLanguage(langCode)

切换语言。

**参数：**
- `langCode` (string): 语言代码

**示例：**

```javascript
api.i18n.setLanguage('en');
```

### i18n.t(key, options?)

翻译文本。

**参数：**
- `key` (string): 翻译键
- `options` (Record<string, unknown>, 可选): 插值参数

**返回：**
- `string`: 翻译后的文本

**示例：**

```javascript
var text = api.i18n.t('common.welcome', { name: 'User' });
// "Welcome, User!"
```

---

## 完整类型定义

```typescript
interface PluginAPI {
  commands: {
    register: (id: string, handler: (...args: unknown[]) => void) => () => void
    execute: (id: string, ...args: unknown[]) => Promise<void>
    getCommands: () => string[]
  }
  tools: {
    register: (tool: ToolDefinition) => () => void
    getAll: () => ToolInfo[]
    invoke: (fullId: string, ...args: unknown[]) => Promise<unknown>
  }
  ui: {
    addActivityItem: (item: Omit<ActivityItem, 'pluginId'>) => () => void
    addRightActivityItem: (item: Omit<RightActivityItem, 'pluginId'>) => () => void
    addStatusBarItem: (item: Omit<StatusBarItem, 'pluginId'>) => () => void
    showNotification: (message: string, type?: 'info' | 'warning' | 'error') => void
    createWebView: (options: WebViewOptions) => { postMessage: (message: unknown) => void; dispose: () => void }
    addWebViewPanel: (options: WebViewPanelOptions) => { postMessage: (message: unknown) => void; dispose: () => void }
  }
  editor: {
    getActiveContent: () => Promise<string | null>
    getActiveTab: () => Tab | null
    openTab: (options: OpenTabOptions) => void
    closeTab: (tabId: string) => void
    onContentChange: (callback: (content: string) => void) => () => void
    onTabChange: (callback: (tab: Tab | null) => void) => () => void
  }
  project: {
    getCurrent: () => ProjectData | null
    getNodes: () => StoryNode[]
    getNodeById: (nodeId: string) => StoryNode | undefined
    createNode: (input: CreateNodeInput) => Promise<StoryNode[]>
    deleteNode: (nodeId: string) => Promise<void>
    renameNode: (nodeId: string, newName: string) => Promise<void>
    moveNode: (nodeId: string, newParentId: string | null) => Promise<void>
    readNodeContent: (nodeId: string) => Promise<string | null>
    writeNodeContent: (nodeId: string, content: string) => Promise<void>
    getNodeSummaryAndOutline: (nodeId: string) => Promise<{ summary: string | null; outline: string | null }>
    updateNodeSummaryAndOutline: (nodeId: string, summary: string, outline: string) => Promise<void>
  }
  story: {
    getContent: (path: string) => Promise<string | null>
    setContent: (path: string, content: string) => Promise<void>
    list: (path: string) => Array<{ name: string; type: 'file' | 'folder'; path: string }>
    rename: (path: string, newPath: string) => Promise<void>
    delete: (path: string) => Promise<void>
    create: (path: string, type: 'file' | 'folder') => Promise<void>
    archive: (path: string) => Promise<void>
  }
  worldsetting: {
    getContent: (path: string) => Promise<Record<string, string> | null>
    setContent: (path: string, content: Record<string, string>) => Promise<void>
    list: (path: string) => Array<{ name: string; type: 'file' | 'folder'; path: string }>
    getCategories: () => string[]
    getFieldConfig: (path: string) => { single: string[]; multi: string[] }
    rename: (path: string, newPath: string) => Promise<void>
    delete: (path: string) => Promise<void>
    create: (path: string, type: 'file' | 'folder') => Promise<string | null>
    archive: (path: string) => Promise<void>
  }
  hooks: {
    beforeSave: (callback: (content: string, node: StoryNode) => string | false | void) => () => void
    afterLoad: (callback: (content: string, node: StoryNode) => string | void) => () => void
    onProofread: (callback: (text: string) => ProofreadResult | Promise<ProofreadResult>) => () => void
    onFileOpen: (callback: (node: StoryNode, content: string) => void | string) => () => void
    onNodeCreate: (callback: (input: CreateNodeInput) => CreateNodeInput | false | void) => () => void
    onNodeDelete: (callback: (nodeId: string, node: StoryNode) => boolean | void) => () => void
  }
  storage: {
    get: <T>(key: string) => T | undefined
    set: <T>(key: string, value: T) => void
    delete: (key: string) => void
    clear: () => void
  }
  utils: {
    log: (message: string, level?: 'info' | 'warn' | 'error') => void
  }
  native: {
    fetch: (url: string, options?: PluginFetchOptions) => Promise<PluginFetchResponse>
    fetchStream: (url: string, callbacks: PluginFetchStreamCallbacks, options?: PluginFetchStreamOptions) => { abort: () => void; streamId: string }
    readFile: (path: string, encoding?: BufferEncoding) => Promise<{ success: boolean; content?: string; error?: string }>
    writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>
    exists: (path: string) => Promise<boolean>
    mkdir: (path: string) => Promise<{ success: boolean; error?: string }>
    readdir: (path: string) => Promise<{ success: boolean; entries?: string[]; error?: string }>
    unlink: (path: string) => Promise<{ success: boolean; error?: string }>
    exec: (command: string, cwd?: string) => Promise<PluginExecResult>
    getAppPath: (name: 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents') => Promise<string>
  }
  i18n: {
    addLanguage: (languageFile: LanguageFile) => boolean
    getAvailableLanguages: () => LanguageMetadata[]
    getCurrentLanguage: () => string
    setLanguage: (langCode: string) => void
    t: (key: string, options?: Record<string, unknown>) => string
  }
}
```
