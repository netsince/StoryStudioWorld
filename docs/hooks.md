# 钩子系统

钩子系统是插件系统的核心机制，允许插件拦截、修改或阻止应用的各种操作。

## 概述

钩子系统提供了三种执行模式：

| 模式 | 方法 | 描述 |
|------|------|------|
| 瀑布流 | `waterfall` | 依次执行，每个钩子的输出作为下一个钩子的输入 |
| 拦截器 | `intercept` | 依次执行，任何钩子可以阻止操作 |
| 事件 | `emit` | 依次执行，不等待返回值 |

## 可用钩子

### 内容钩子

#### content:beforeSave

在内容保存前触发。

**类型：** 瀑布流

**参数：**
- `content` (string): 当前内容

**返回值：**
- `string`: 修改后的内容（传递给下一个钩子）
- `false`: 阻止保存
- `void`: 使用当前内容

**示例：**

```javascript
api.hooks.beforeSave(function(content, node) {
  if (node.kind === 'story') {
    // 添加保存时间戳
    var timestamp = new Date().toLocaleString('zh-CN');
    var cleaned = content.replace(/\n\n<!-- 最后编辑: .*? -->\s*$/, '');
    return cleaned + '\n\n<!-- 最后编辑: ' + timestamp + ' -->';
  }
  return content;
});
```

#### content:afterLoad

在内容加载后触发。

**类型：** 瀑布流

**参数：**
- `content` (string): 加载的内容

**返回值：**
- `string`: 修改后的内容（传递给下一个钩子）
- `void`: 使用当前内容

**示例：**

```javascript
api.hooks.afterLoad(function(content, node) {
  // 解析自定义标记
  return content.replace(/\[\[([^\]]+)\]\]/g, function(match, link) {
    return '<a href="#' + link + '">' + link + '</a>';
  });
});
```

### 文件钩子

#### file:beforeCreate

在创建文件/文件夹前触发。

**类型：** 拦截器

**参数：**
- `input` (CreateNodeInput): 创建参数

**返回值：**
- `CreateNodeInput`: 修改后的参数
- `false`: 阻止创建
- `void`: 使用原始参数

**示例：**

```javascript
api.hooks.onNodeCreate(function(input) {
  // 为新文件添加默认内容
  if (input.type === 'file' && input.kind === 'story') {
    // 可以修改创建参数
    return input;
  }
  return input;
});
```

#### file:beforeDelete

在删除文件/文件夹前触发。

**类型：** 拦截器

**参数：**
- `nodeId` (string): 节点 ID
- `node` (StoryNode): 节点信息

**返回值：**
- `false`: 阻止删除
- `true` 或 `void`: 允许删除

**示例：**

```javascript
api.hooks.onNodeDelete(function(nodeId, node) {
  // 防止删除重要文件
  if (node.name === 'README.md') {
    api.ui.showNotification('不能删除 README 文件', 'warning');
    return false;
  }
  return true;
});
```

#### file:beforeRename

在重命名文件/文件夹前触发。

**类型：** 拦截器

**参数：**
- `nodeId` (string): 节点 ID
- `newName` (string): 新名称
- `node` (StoryNode): 节点信息

**返回值：**
- `{ newName: string }`: 修改后的名称
- `false`: 阻止重命名
- `void`: 使用原始名称

#### file:beforeMove

在移动文件/文件夹前触发。

**类型：** 拦截器

**参数：**
- `nodeId` (string): 节点 ID
- `newParentId` (string | null): 新父节点 ID
- `node` (StoryNode): 节点信息

**返回值：**
- `false`: 阻止移动
- `void`: 允许移动

#### file:open

在打开文件时触发。

**类型：** 事件

**参数：**
- `node` (StoryNode): 节点信息
- `content` (string): 文件内容

**返回值：**
- `string`: 替换显示的内容
- `void`: 使用原始内容

**示例：**

```javascript
api.hooks.onFileOpen(function(node, content) {
  console.log('打开文件:', node.name);
  // 可以返回修改后的内容用于显示
});
```

### 校对钩子

#### proofread:process

在校对时触发。

**类型：** 收集器

**参数：**
- `text` (string): 待校对的文本

**返回值：**
- `ProofreadResult`: 校对结果

**示例：**

```javascript
api.hooks.onProofread(function(text) {
  var issues = [];
  
  // 检查中文标点
  var chinesePunctuation = /，|。|！|？|；：|""|''|（）/g;
  var match;
  while ((match = chinesePunctuation.exec(text)) !== null) {
    // 检查是否有问题...
  }
  
  // 检查连续空格
  var multiSpace = /  +/g;
  while ((match = multiSpace.exec(text)) !== null) {
    issues.push({
      id: 'space-' + match.index,
      type: 'spacing',
      message: '连续多个空格',
      suggestion: '使用单个空格',
      start: match.index,
      end: match.index + match[0].length,
      line: text.substring(0, match.index).split('\n').length,
      column: match.index - text.lastIndexOf('\n', match.index),
      severity: 'info'
    });
  }
  
  return {
    issues: issues,
    stats: {
      totalIssues: issues.length,
      errorCount: 0,
      warningCount: 0,
      infoCount: issues.length
    }
  };
});
```

## 校对结果类型

```typescript
interface ProofreadResult {
  issues: ProofreadIssue[]
  stats: {
    totalIssues: number
    errorCount: number
    warningCount: number
    infoCount: number
  }
}

interface ProofreadIssue {
  id: string
  type: string              // 问题类型，如 'spelling', 'grammar', 'style'
  message: string           // 问题描述
  suggestion?: string       // 修改建议
  start: number             // 问题起始位置
  end: number               // 问题结束位置
  line: number              // 行号
  column: number            // 列号
  severity: 'error' | 'warning' | 'info'
}
```

## 钩子执行顺序

当多个插件注册了同一个钩子时，执行顺序如下：

1. **瀑布流钩子**：按注册顺序依次执行，前一个的输出作为后一个的输入
2. **拦截器钩子**：按注册顺序执行，任一钩子返回 `false` 则停止执行
3. **事件钩子**：按注册顺序执行，忽略返回值

## 最佳实践

### 1. 始终返回适当的值

```javascript
// 正确
api.hooks.beforeSave(function(content, node) {
  if (shouldModify) {
    return modifiedContent;
  }
  return content;  // 不修改时返回原内容
});

// 错误
api.hooks.beforeSave(function(content, node) {
  if (shouldModify) {
    return modifiedContent;
  }
  // 忘记返回值，可能导致问题
});
```

### 2. 正确处理异步操作

```javascript
api.hooks.onProofread(async function(text) {
  // 异步调用外部 API
  var response = await api.native.fetch('https://api.example.com/check', {
    method: 'POST',
    body: JSON.stringify({ text: text })
  });
  
  if (response.ok) {
    return JSON.parse(response.body);
  }
  
  return { issues: [], stats: { totalIssues: 0, errorCount: 0, warningCount: 0, infoCount: 0 } };
});
```

### 3. 清理钩子

保存取消订阅函数，在插件卸载时清理：

```javascript
var disposables = [];

function activate(api) {
  // 注册钩子并保存取消函数
  disposables.push(
    api.hooks.beforeSave(function(content) {
      // ...
    })
  );
  
  disposables.push(
    api.hooks.afterLoad(function(content) {
      // ...
    })
  );
}

function deactivate() {
  // 清理所有钩子
  disposables.forEach(function(dispose) {
    dispose();
  });
  disposables = [];
}
```

### 4. 错误处理

钩子中的错误不会影响其他钩子或主应用：

```javascript
api.hooks.beforeSave(function(content, node) {
  try {
    // 可能出错的操作
    return processContent(content);
  } catch (e) {
    api.utils.log('处理失败: ' + e.message, 'error');
    return content;  // 返回原内容，不影响保存
  }
});
```

## 完整示例：自动格式化插件

```javascript
var disposables = [];

function activate(api) {
  // 保存前自动格式化
  disposables.push(
    api.hooks.beforeSave(function(content, node) {
      if (node.kind !== 'story') {
        return content;
      }
      
      // 移除行尾空格
      var formatted = content.replace(/[ \t]+$/gm, '');
      
      // 确保文件以换行结束
      if (!formatted.endsWith('\n')) {
        formatted += '\n';
      }
      
      // 统一换行符
      formatted = formatted.replace(/\r\n/g, '\n');
      
      // 移除多余空行（超过2个连续空行）
      formatted = formatted.replace(/\n{3,}/g, '\n\n');
      
      if (formatted !== content) {
        api.utils.log('内容已自动格式化', 'info');
      }
      
      return formatted;
    })
  );
  
  // 加载后解析自定义标记
  disposables.push(
    api.hooks.afterLoad(function(content, node) {
      if (node.kind !== 'story') {
        return content;
      }
      
      // 解析 [[链接]] 语法
      return content.replace(/\[\[([^\]]+)\]\]/g, function(match, link) {
        var parts = link.split('|');
        var target = parts[0].trim();
        var text = parts[1] ? parts[1].trim() : target;
        return '[' + text + '](' + target + ')';
      });
    })
  );
  
  // 自定义校对规则
  disposables.push(
    api.hooks.onProofread(function(text) {
      var issues = [];
      
      // 检查中英文之间是否缺少空格
      var chineseEnglish = /([\u4e00-\u9fa5])([a-zA-Z])/g;
      var match;
      while ((match = chineseEnglish.exec(text)) !== null) {
        issues.push({
          id: 'spacing-' + match.index,
          type: 'spacing',
          message: '中英文之间建议添加空格',
          suggestion: match[1] + ' ' + match[2],
          start: match.index,
          end: match.index + match[0].length,
          line: text.substring(0, match.index).split('\n').length,
          column: match.index - text.lastIndexOf('\n', match.index),
          severity: 'info'
        });
      }
      
      return {
        issues: issues,
        stats: {
          totalIssues: issues.length,
          errorCount: 0,
          warningCount: 0,
          infoCount: issues.length
        }
      };
    })
  );
}

function deactivate() {
  disposables.forEach(function(dispose) {
    dispose();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activate: activate, deactivate: deactivate };
} else {
  exports.activate = activate;
  exports.deactivate = deactivate;
}
```

## 钩子参考表

| 钩子名称 | 触发时机 | 类型 | 用途 |
|---------|---------|------|------|
| `content:beforeSave` | 保存前 | 瀑布流 | 自动格式化、添加元数据、验证内容 |
| `content:afterLoad` | 加载后 | 瀑布流 | 内容转换、解析自定义格式 |
| `file:beforeCreate` | 创建前 | 拦截器 | 验证、设置默认内容 |
| `file:beforeDelete` | 删除前 | 拦截器 | 确认、清理关联数据 |
| `file:beforeRename` | 重命名前 | 拦截器 | 验证名称、更新引用 |
| `file:beforeMove` | 移动前 | 拦截器 | 验证移动操作 |
| `file:open` | 打开时 | 事件 | 记录、内容预处理 |
| `proofread:process` | 校对时 | 收集器 | 自定义校对规则 |
