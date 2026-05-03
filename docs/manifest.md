# 插件清单 (manifest.json)

每个插件必须在根目录包含一个 `manifest.json` 文件，用于描述插件的基本信息和贡献点。

## 完整示例

```json
{
  "id": "my-awesome-plugin",
  "name": "我的超棒插件",
  "version": "1.0.0",
  "description": "这是一个功能强大的插件",
  "author": "开发者名称",
  "main": "index.js",
  "contributes": {
    "commands": [
      {
        "id": "sayHello",
        "title": "打招呼"
      }
    ],
    "activityBar": [
      {
        "id": "my-explorer",
        "title": "我的资源管理器",
        "icon": "<svg>...</svg>"
      }
    ],
    "rightActivityBar": [
      {
        "id": "my-panel",
        "title": "我的面板",
        "icon": "<svg>...</svg>"
      }
    ]
  }
}
```

## 必需字段

### id

- **类型**: `string`
- **必需**: 是
- **描述**: 插件的唯一标识符

规则：
- 只能包含小写字母、数字和连字符
- 必须以字母开头
- 建议使用反向域名格式，如 `com.example.my-plugin`

```json
{
  "id": "word-counter"
}
```

### name

- **类型**: `string`
- **必需**: 是
- **描述**: 插件的显示名称

这是用户在插件管理界面看到的名称。

```json
{
  "name": "字数统计"
}
```

### version

- **类型**: `string`
- **必需**: 是
- **描述**: 插件版本号

使用语义化版本号 (SemVer)：`MAJOR.MINOR.PATCH`

```json
{
  "version": "1.0.0"
}
```

### main

- **类型**: `string`
- **必需**: 是
- **描述**: 插件入口文件的相对路径

```json
{
  "main": "index.js"
}
```

也可以使用子目录：

```json
{
  "main": "dist/index.js"
}
```

## 可选字段

### description

- **类型**: `string`
- **必需**: 否
- **描述**: 插件功能的详细描述

```json
{
  "description": "统计文档字数，支持中文字数统计、字符统计等功能"
}
```

### author

- **类型**: `string`
- **必需**: 否
- **描述**: 插件作者名称

```json
{
  "author": "Story Studio World Team"
}
```

## contributes 字段

`contributes` 对象定义了插件对应用的贡献点。

### commands

注册命令，用户可以通过命令面板或快捷键执行。

```json
{
  "contributes": {
    "commands": [
      {
        "id": "countWords",
        "title": "统计字数"
      },
      {
        "id": "exportPdf",
        "title": "导出为 PDF"
      }
    ]
  }
}
```

命令对象属性：

| 属性 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `id` | string | ✓ | 命令标识符（不含插件前缀） |
| `title` | string | ✓ | 命令显示名称 |

完整命令 ID 格式：`{pluginId}.{commandId}`

例如：`word-counter.countWords`

### activityBar

在左侧活动栏添加项目。

```json
{
  "contributes": {
    "activityBar": [
      {
        "id": "my-explorer",
        "title": "我的资源管理器",
        "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/></svg>"
      }
    ]
  }
}
```

活动栏项目属性：

| 属性 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `id` | string | ✓ | 项目标识符 |
| `title` | string | ✓ | 鼠标悬停时显示的标题 |
| `icon` | string | | SVG 图标字符串 |

### rightActivityBar

在右侧活动栏添加面板。

```json
{
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

右侧活动栏项目属性：

| 属性 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `id` | string | ✓ | 面板标识符 |
| `title` | string | ✓ | 面板标题 |
| `icon` | string | | SVG 图标字符串 |

## 图标格式

图标使用 SVG 字符串格式：

```json
{
  "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"10\"/></svg>"
}
```

建议：
- 使用 `viewBox="0 0 24 24"` 确保图标大小一致
- 使用 `currentColor` 使图标颜色跟随主题
- 保持 SVG 简洁，避免过于复杂的路径

## 完整类型定义

```typescript
interface PluginManifest {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  main: string
  contributes?: {
    commands?: Array<{
      id: string
      title: string
    }>
    activityBar?: Array<{
      id: string
      title: string
      icon?: string
    }>
    rightActivityBar?: Array<{
      id: string
      title: string
      icon?: string
    }>
  }
}
```

## 验证清单

在发布插件前，请检查：

- [ ] `id` 唯一且符合命名规范
- [ ] `name` 清晰易懂
- [ ] `version` 使用正确的语义化版本
- [ ] `main` 指向存在的入口文件
- [ ] 所有 `contributes` 中的 ID 不重复
- [ ] SVG 图标格式正确
- [ ] JSON 格式有效（无语法错误）

## 常见问题

### Q: 插件 ID 已经被占用怎么办？

A: 使用更具唯一性的 ID，如添加作者前缀：`author-word-counter`

### Q: 可以使用外部图标库吗？

A: 目前只支持内联 SVG。您可以从图标库复制 SVG 代码。

### Q: contributes 是必需的吗？

A: 不是。如果插件只需要通过代码动态添加功能，可以省略 contributes。

### Q: 如何支持多语言？

A: 在 `languages/` 目录下添加语言文件，插件系统会自动加载。详见 [API 参考 - 国际化](./api-reference.md#i18n)。
