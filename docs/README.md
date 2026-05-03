# Story Studio World 插件系统

欢迎使用 Story Studio World 插件开发文档。本插件系统允许您扩展 Story Studio World 的功能，包括添加新的 UI 面板、命令、钩子处理等。

## 目录

- [快速开始](#快速开始)
- [插件结构](#插件结构)
- [插件目录](#插件目录)
- [文档导航](#文档导航)

## 快速开始

### 1. 创建插件目录

在插件目录下创建一个新的文件夹：

```
{userData}/plugins/
└── my-plugin/
    ├── manifest.json    # 插件清单
    └── index.js         # 入口文件
```

### 2. 创建 manifest.json

```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "version": "1.0.0",
  "description": "一个简单的示例插件",
  "author": "Your Name",
  "main": "index.js",
  "contributes": {
    "rightActivityBar": [
      {
        "id": "my-panel",
        "title": "我的面板",
        "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"10\"/></svg>"
      }
    ]
  }
}
```

### 3. 创建 index.js

```javascript
function activate(api) {
  console.log('[My Plugin] 插件已激活');

  // 添加右侧活动栏面板
  api.ui.addRightActivityItem({
    id: 'my-panel',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"10\"/></svg>',
    title: '我的面板',
    panel: function(props) {
      var container = document.createElement('div');
      container.style.padding = '12px';
      container.innerHTML = '<h3>欢迎使用我的插件</h3>';
      return container;
    }
  });

  // 注册命令
  api.commands.register('myPlugin.hello', function() {
    api.ui.showNotification('你好，插件世界！', 'info');
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activate: activate };
} else {
  exports.activate = activate;
}
```

### 4. 启用插件

1. 打开 Story Studio World
2. 进入插件管理面板
3. 找到您的插件并启用

## 插件结构

### 文件结构

```
my-plugin/
├── manifest.json       # 必需：插件清单
├── index.js            # 必需：入口文件
├── assets/             # 可选：资源文件
│   ├── icons/
│   └── images/
└── languages/          # 可选：多语言支持
    ├── en.json
    └── zh-CN.json
```

### manifest.json 字段

| 字段 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `id` | string | ✓ | 插件唯一标识符（小写字母、数字、连字符） |
| `name` | string | ✓ | 插件显示名称 |
| `version` | string | ✓ | 语义化版本号 |
| `description` | string | | 插件描述 |
| `author` | string | | 作者名称 |
| `main` | string | ✓ | 入口文件路径（相对于插件目录） |
| `contributes` | object | | 贡献点配置 |

## 插件目录

插件存放在用户数据目录下：

| 平台 | 路径 |
|------|------|
| Windows | `%APPDATA%\story-studio-world\plugins\` |
| macOS | `~/Library/Application Support/story-studio-world/plugins/` |
| Linux | `~/.config/story-studio-world/plugins/` |

## 文档导航

- [插件清单格式](./manifest.md) - 详细的 manifest.json 配置说明
- [API 参考](./api-reference.md) - 完整的插件 API 文档
- [钩子系统](./hooks.md) - 钩子和生命周期
- [示例插件](./examples.md) - 实际插件示例

## 核心 API 概览

插件通过 `activate(api)` 函数接收 API 对象：

```javascript
function activate(api) {
  // 命令系统
  api.commands.register(id, handler)
  api.commands.execute(id, ...args)

  // UI 扩展
  api.ui.addRightActivityItem(item)
  api.ui.addActivityItem(item)
  api.ui.showNotification(message, type)
  api.ui.createWebView(options)

  // 编辑器访问
  api.editor.getActiveContent()
  api.editor.onContentChange(callback)

  // 项目访问
  api.project.getNodes()
  api.project.readNodeContent(nodeId)

  // 钩子系统
  api.hooks.beforeSave(callback)
  api.hooks.afterLoad(callback)

  // 本地存储
  api.storage.get(key)
  api.storage.set(key, value)

  // 原生能力
  api.native.fetch(url, options)
  api.native.readFile(path)
  api.native.writeFile(path, content)

  // 国际化
  api.i18n.t(key, options)
  api.i18n.addLanguage(languageFile)
}
```

## 安全策略

- **默认禁用**：首次安装的插件默认处于禁用状态，需要用户手动启用
- **沙盒环境**：插件运行在受限的 JavaScript 环境中
- **API 限制**：插件只能通过提供的 API 访问应用功能
- **存储隔离**：每个插件有独立的存储空间

## 最佳实践

1. **错误处理**：始终处理异步操作的错误
2. **资源清理**：在 `deactivate` 中清理事件监听器和资源
3. **性能优化**：避免频繁的 DOM 操作和大量数据处理
4. **用户体验**：提供清晰的错误提示和加载状态

## 调试插件

在开发环境中，可以通过以下方式调试：

1. 打开开发者工具（Ctrl/Cmd + Shift + I）
2. 在 Console 中查看插件日志
3. 使用 `api.utils.log()` 输出调试信息

```javascript
api.utils.log('调试信息', 'info');
api.utils.log('警告信息', 'warn');
api.utils.log('错误信息', 'error');
```
