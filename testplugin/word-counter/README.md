# 字数统计插件

一个简单的测试插件，用于演示 Story Studio World 的插件系统。

## 功能

- 在右侧活动栏添加"字数统计"面板
- 实时统计当前文档的字符数、中文字数、词数、行数
- 注册命令 `wordCounter.showStats`
- 监听保存事件

## 安装

1. 将 `word-counter` 文件夹复制到插件目录：
   - Windows: `%APPDATA%/story-studio-world/plugins/`
   - macOS: `~/Library/Application Support/story-studio-world/plugins/`
   - Linux: `~/.config/story-studio-world/plugins/`

2. 重启应用，或在"插件"面板中启用插件

## 使用

1. 点击右侧活动栏的"统计"图标
2. 打开任意文档，面板会自动显示统计信息
3. 编辑文档时统计信息会实时更新

## API 使用示例

```javascript
// 注册命令
api.commands.register('myCommand', () => {
  console.log('Command executed!');
});

// 显示通知
api.ui.showNotification('Hello from plugin!', 'info');

// 获取当前内容
var content = api.editor.getActiveContent();

// 监听内容变化
api.editor.onContentChange(function(content) {
  console.log('Content changed:', content.length);
});

// 保存前钩子
api.hooks.beforeSave(function(content, node) {
  // 返回修改后的内容
  return content + '\n<!-- saved -->';
  // 或返回 false 阻止保存
});
```
