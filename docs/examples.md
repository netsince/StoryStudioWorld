# 示例插件

本文档包含多个完整的插件示例，帮助您快速上手插件开发。

## 目录

1. [字数统计插件](#1-字数统计插件)
2. [AI 助手示例插件](#2-ai-助手示例插件)
3. [WebView 演示插件](#3-webview-演示插件)
4. [语言包插件](#4-语言包插件)
5. [自动保存时间戳插件](#5-自动保存时间戳插件)
6. [自定义校对插件](#6-自定义校对插件)

---

## 1. 字数统计插件

一个简单但实用的插件，实时统计文档字数。

### manifest.json

```json
{
  "id": "word-counter",
  "name": "字数统计",
  "version": "1.0.0",
  "description": "实时统计文档字数，支持中文字数统计",
  "author": "Story Studio World",
  "main": "index.js",
  "contributes": {
    "rightActivityBar": [
      {
        "id": "word-counter",
        "title": "字数统计",
        "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M4 7V4h16v3M9 20h6M12 4v16\"/></svg>"
      }
    ]
  }
}
```

### index.js

```javascript
var savedApi = null;

var WordCounterPanel = function(api) {
  this.api = api;
  this.stats = {
    chars: 0,
    charsNoSpace: 0,
    words: 0,
    lines: 0,
    chineseChars: 0
  };
  this.container = null;
  this.unsubscribeContent = null;
  this.unsubscribeTab = null;
};

WordCounterPanel.prototype.render = function() {
  var self = this;
  this.container = document.createElement('div');
  this.container.style.cssText = 'padding: 12px; font-size: 13px;';

  var updateStats = function(content) {
    if (!content) {
      self.stats = { chars: 0, charsNoSpace: 0, words: 0, lines: 0, chineseChars: 0 };
    } else {
      self.stats = {
        chars: content.length,
        charsNoSpace: content.replace(/\s/g, '').length,
        words: content.split(/\s+/).filter(Boolean).length,
        lines: content.split('\n').length,
        chineseChars: (content.match(/[\u4e00-\u9fa5]/g) || []).length
      };
    }
    self.updateDisplay();
  };

  var refreshStats = function() {
    self.api.editor.getActiveContent().then(function(content) {
      updateStats(content);
    });
  };

  refreshStats();

  this.unsubscribeContent = this.api.editor.onContentChange(updateStats);
  this.unsubscribeTab = this.api.editor.onTabChange(function(tab) {
    refreshStats();
  });

  this.updateDisplay();
  return this.container;
};

WordCounterPanel.prototype.destroy = function() {
  if (this.unsubscribeContent) this.unsubscribeContent();
  if (this.unsubscribeTab) this.unsubscribeTab();
};

WordCounterPanel.prototype.updateDisplay = function() {
  var stats = this.stats;
  if (!this.container) return;
  
  this.container.innerHTML = '\
    <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 500;">字数统计</h3>\
    <div style="display: grid; gap: 8px;">\
      <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--panel-bg); border-radius: 4px;">\
        <span>总字符数</span>\
        <span style="font-weight: 500; color: var(--accent);">' + stats.chars + '</span>\
      </div>\
      <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--panel-bg); border-radius: 4px;">\
        <span>字符(不含空格)</span>\
        <span style="font-weight: 500; color: var(--accent);">' + stats.charsNoSpace + '</span>\
      </div>\
      <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--panel-bg); border-radius: 4px;">\
        <span>中文字数</span>\
        <span style="font-weight: 500; color: var(--accent);">' + stats.chineseChars + '</span>\
      </div>\
      <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--panel-bg); border-radius: 4px;">\
        <span>词数(英文)</span>\
        <span style="font-weight: 500; color: var(--accent);">' + stats.words + '</span>\
      </div>\
      <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--panel-bg); border-radius: 4px;">\
        <span>行数</span>\
        <span style="font-weight: 500; color: var(--accent);">' + stats.lines + '</span>\
      </div>\
    </div>\
    <div style="margin-top: 16px; padding: 12px; background: var(--panel-bg); border-radius: 4px; font-size: 12px; color: var(--foreground-muted);">\
      <p style="margin: 0 0 4px 0;">提示：打开文档后可实时统计</p>\
      <p style="margin: 0;">中文字数 = 中文字符数量</p>\
    </div>\
  ';
};

var currentPanel = null;

function activate(api) {
  console.log('[Word Counter] Plugin activated');
  savedApi = api;

  api.ui.addRightActivityItem({
    id: 'word-counter',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',
    title: '字数统计',
    panel: function(props) {
      if (currentPanel) currentPanel.destroy();
      currentPanel = new WordCounterPanel(api);
      return currentPanel.render();
    }
  });

  api.commands.register('wordCounter.showStats', function() {
    api.editor.getActiveContent().then(function(content) {
      if (content) {
        var chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
        api.ui.showNotification('当前文档: ' + content.length + ' 字符, ' + chineseChars + ' 中文字', 'info');
      } else {
        api.ui.showNotification('请先打开一个文档', 'warning');
      }
    });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activate: activate };
} else {
  exports.activate = activate;
}
```

---

## 2. AI 助手示例插件

演示如何使用 native API 调用外部接口。

### manifest.json

```json
{
  "id": "ai-assistant-demo",
  "name": "AI 助手示例",
  "version": "1.0.0",
  "description": "演示如何使用 native API 调用外部 AI 接口",
  "author": "Story Studio World",
  "main": "index.js",
  "contributes": {
    "rightActivityBar": [
      {
        "id": "ai-assistant",
        "title": "AI 助手",
        "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M8 14s1.5 2 4 2 4-2 4-2\"/><line x1=\"9\" y1=\"9\" x2=\"9.01\" y2=\"9\"/><line x1=\"15\" y1=\"9\" x2=\"15.01\" y2=\"9\"/></svg>"
      }
    ]
  }
}
```

### index.js

```javascript
var savedApi = null;

var AIAssistantPanel = function(api) {
  this.api = api;
  this.container = null;
  this.currentStream = null;
};

AIAssistantPanel.prototype.render = function() {
  var self = this;
  this.container = document.createElement('div');
  this.container.style.cssText = 'padding: 12px; font-size: 13px;';

  this.container.innerHTML = '\
    <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 500;">AI 助手示例</h3>\
    <p style="margin: 0 0 12px 0; color: var(--foreground-muted); font-size: 12px;">\
      演示 native API 能力：网络请求、流式传输、文件操作\
    </p>\
    <div style="display: grid; gap: 8px; margin-bottom: 16px;">\
      <button id="btn-fetch" style="padding: 8px 12px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">测试网络请求</button>\
      <button id="btn-stream" style="padding: 8px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">测试流式传输</button>\
      <button id="btn-file" style="padding: 8px 12px; background: var(--panel-bg); border: 1px solid var(--border); border-radius: 4px; cursor: pointer;">测试文件操作</button>\
    </div>\
    <div id="result-area" style="padding: 12px; background: var(--panel-bg); border-radius: 4px; min-height: 100px; font-family: monospace; font-size: 11px; white-space: pre-wrap;">点击上方按钮测试功能...</div>\
  ';

  var resultArea = this.container.querySelector('#result-area');

  this.container.querySelector('#btn-fetch').onclick = function() {
    self.testFetch(resultArea);
  };

  this.container.querySelector('#btn-stream').onclick = function() {
    self.testStream(resultArea);
  };

  this.container.querySelector('#btn-file').onclick = function() {
    self.testFile(resultArea);
  };

  return this.container;
};

AIAssistantPanel.prototype.testFetch = function(resultArea) {
  resultArea.textContent = '正在请求 https://httpbin.org/get ...';

  this.api.native.fetch('https://httpbin.org/get', {
    method: 'GET',
    timeout: 10000
  }).then(function(response) {
    if (response.ok) {
      var data = JSON.parse(response.body);
      resultArea.textContent = '请求成功!\n\n' + JSON.stringify(data, null, 2);
    } else {
      resultArea.textContent = '请求失败: ' + response.status;
    }
  }).catch(function(err) {
    resultArea.textContent = '请求错误: ' + err.message;
  });
};

AIAssistantPanel.prototype.testStream = function(resultArea) {
  var fullContent = '';
  resultArea.textContent = '正在发起流式请求...\n';

  this.currentStream = this.api.native.fetchStream(
    'https://httpbin.org/stream/5',
    {
      onStart: function(info) {
        resultArea.textContent += '流已开始! 状态: ' + info.status + '\n\n';
      },
      onChunk: function(chunk) {
        fullContent += chunk;
        resultArea.textContent = '已接收 ' + fullContent.length + ' 字节\n\n' + fullContent.substring(0, 500);
      },
      onError: function(error) {
        resultArea.textContent += '\n\n错误: ' + error.message;
      },
      onEnd: function() {
        resultArea.textContent = '流式传输完成!\n\n' + fullContent;
      }
    }
  );
};

AIAssistantPanel.prototype.testFile = function(resultArea) {
  var self = this;
  resultArea.textContent = '正在测试文件操作...';

  this.api.native.getAppPath('userData').then(function(userDataPath) {
    var testPath = userDataPath.replace(/\\/g, '/') + '/plugins/test-file.txt';
    resultArea.textContent = '测试路径: ' + testPath + '\n\n正在写入文件...';

    return self.api.native.writeFile(testPath, 'Hello from Plugin! ' + new Date().toISOString());
  }).then(function(writeResult) {
    if (!writeResult.success) {
      resultArea.textContent = '写入失败: ' + writeResult.error;
      return;
    }
    resultArea.textContent += '\n写入成功!';
  }).catch(function(err) {
    resultArea.textContent = '错误: ' + err.message;
  });
};

AIAssistantPanel.prototype.destroy = function() {
  if (this.currentStream) {
    this.currentStream.abort();
    this.currentStream = null;
  }
};

var currentPanel = null;

function activate(api) {
  console.log('[AI Assistant Demo] Plugin activated');
  savedApi = api;

  api.ui.addRightActivityItem({
    id: 'ai-assistant-demo',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><circle cx="12\" cy="12" r="10"/></svg>',
    title: 'AI 助手示例',
    panel: function(props) {
      if (currentPanel) currentPanel.destroy();
      currentPanel = new AIAssistantPanel(api);
      return currentPanel.render();
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activate: activate };
} else {
  exports.activate = activate;
}
```

---

## 3. WebView 演示插件

演示如何创建独立的 WebView 面板。

### manifest.json

```json
{
  "id": "webview-demo",
  "name": "WebView 演示",
  "version": "1.0.0",
  "description": "演示 WebView 面板功能",
  "author": "Story Studio World",
  "main": "index.js",
  "contributes": {
    "rightActivityBar": [
      {
        "id": "webview-demo",
        "title": "WebView 演示",
        "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/></svg>"
      }
    ]
  }
}
```

### index.js

```javascript
var savedApi = null;
var webView = null;

function activate(api) {
  console.log('[WebView Demo] Plugin activated');
  savedApi = api;

  var html = '\
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 16px;">\
      <h2 style="margin: 0 0 16px 0; font-size: 16px;">WebView 面板演示</h2>\
      <p style="margin: 0 0 12px 0; color: #666; font-size: 13px;">这是一个独立的 WebView 面板</p>\
      <input id="message-input" type="text" placeholder="输入消息..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; margin-bottom: 8px;">\
      <button id="send-btn" style="width: 100%; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">发送消息</button>\
      <div id="result" style="margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px; min-height: 60px; font-size: 12px;">等待操作...</div>\
    </div>\
  ';

  var script = '\
    document.getElementById("send-btn").addEventListener("click", function() {\
      var input = document.getElementById("message-input");\
      var message = input.value.trim();\
      if (message) {\
        window.postMessageToPlugin({ type: "user-message", content: message });\
        input.value = "";\
      }\
    });\
    window.addEventListener("plugin-message", function(event) {\
      var data = event.detail;\
      document.getElementById("result").textContent = "收到: " + JSON.stringify(data);\
    });\
  ';

  webView = api.ui.addWebViewPanel({
    id: 'webview-demo',
    title: 'WebView 演示',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
    html: html,
    scripts: [],
    styles: [],
    onMessage: function(message) {
      console.log('[WebView Demo] Received:', message);
      
      if (message.type === 'user-message') {
        api.ui.showNotification('WebView 消息: ' + message.content, 'info');
        webView.postMessage({ type: 'ack', message: '收到: ' + message.content });
      }
    }
  });
}

function deactivate() {
  if (webView) {
    webView.dispose();
    webView = null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activate: activate, deactivate: deactivate };
} else {
  exports.activate = activate;
  exports.deactivate = deactivate;
}
```

---

## 4. 语言包插件

演示如何添加多语言支持。

### manifest.json

```json
{
  "id": "japanese-language",
  "name": "日本語言語パック",
  "version": "1.0.0",
  "description": "日本語言語パック",
  "author": "Story Studio World",
  "main": "index.js"
}
```

### languages/ja.json

```json
{
  "languageMetadata": {
    "code": "ja",
    "name": "Japanese",
    "nativeName": "日本語"
  },
  "translations": {
    "common": {
      "save": "保存",
      "cancel": "キャンセル",
      "delete": "削除",
      "edit": "編集",
      "close": "閉じる"
    },
    "menu": {
      "file": "ファイル",
      "edit": "編集",
      "view": "表示"
    }
  }
}
```

### index.js

```javascript
function activate(api) {
  console.log('[Japanese Language Pack] Plugin activated');

  var languages = api.i18n.getAvailableLanguages();
  var jaExists = languages.some(function(lang) {
    return lang.code === 'ja';
  });

  if (jaExists) {
    console.log('[Japanese Language Pack] 日本語言語パックが正常に読み込まれました！');
  }

  api.commands.register('japaneseLanguage.switchToJapanese', function() {
    api.i18n.setLanguage('ja');
    api.ui.showNotification('言語を日本語に切り替えました', 'info');
  });
}

function deactivate() {
  console.log('[Japanese Language Pack] Plugin deactivated');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activate: activate, deactivate: deactivate };
} else {
  exports.activate = activate;
  exports.deactivate = deactivate;
}
```

---

## 5. 自动保存时间戳插件

演示如何使用钩子系统在保存时自动添加时间戳。

### manifest.json

```json
{
  "id": "auto-timestamp",
  "name": "自动时间戳",
  "version": "1.0.0",
  "description": "保存时自动添加时间戳",
  "author": "Story Studio World",
  "main": "index.js"
}
```

### index.js

```javascript
var disposables = [];

function activate(api) {
  console.log('[Auto Timestamp] Plugin activated');

  disposables.push(
    api.hooks.beforeSave(function(content, node) {
      if (node.kind === 'story') {
        var timestamp = new Date().toLocaleString('zh-CN');
        var cleaned = content.replace(/\n\n<!-- 最后编辑: .*? -->\s*$/, '');
        var result = cleaned + '\n\n<!-- 最后编辑: ' + timestamp + ' -->';
        api.utils.log('已添加时间戳: ' + timestamp, 'info');
        return result;
      }
      return content;
    })
  );
}

function deactivate() {
  disposables.forEach(function(dispose) {
    dispose();
  });
  disposables = [];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activate: activate, deactivate: deactivate };
} else {
  exports.activate = activate;
  exports.deactivate = deactivate;
}
```

---

## 6. 自定义校对插件

演示如何实现自定义校对规则。

### manifest.json

```json
{
  "id": "custom-proofread",
  "name": "自定义校对",
  "version": "1.0.0",
  "description": "添加自定义校对规则",
  "author": "Story Studio World",
  "main": "index.js"
}
```

### index.js

```javascript
var disposables = [];

function activate(api) {
  console.log('[Custom Proofread] Plugin activated');

  disposables.push(
    api.hooks.onProofread(function(text) {
      var issues = [];

      // 检查重复词
      var duplicatePattern = /(\b\w+\b)\s+\1/gi;
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

      // 检查连续多个空格
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

      // 检查中英文之间是否缺少空格
      var chineseEnglish = /([\u4e00-\u9fa5])([a-zA-Z])/g;
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
          warningCount: issues.filter(function(i) { return i.severity === 'warning'; }).length,
          infoCount: issues.filter(function(i) { return i.severity === 'info'; }).length
        }
      };
    })
  );
}

function deactivate() {
  disposables.forEach(function(dispose) {
    dispose();
  });
  disposables = [];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activate: activate, deactivate: deactivate };
} else {
  exports.activate = activate;
  exports.deactivate = deactivate;
}
```

---

## 插件开发技巧

### 1. 使用立即执行函数避免全局污染

```javascript
(function() {
  var privateVar = 'private';
  
  function activate(api) {
    // ...
  }
  
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { activate: activate };
  } else {
    exports.activate = activate;
  }
})();
```

### 2. 正确处理异步操作

```javascript
function activate(api) {
  api.commands.register('myPlugin.asyncAction', async function() {
    try {
      var content = await api.editor.getActiveContent();
      if (!content) {
        api.ui.showNotification('没有打开文档', 'warning');
        return;
      }
      
      var response = await api.native.fetch('https://api.example.com/process', {
        method: 'POST',
        body: JSON.stringify({ text: content })
      });
      
      if (response.ok) {
        var result = JSON.parse(response.body);
        api.ui.showNotification('处理成功', 'info');
      }
    } catch (error) {
      api.utils.log('操作失败: ' + error.message, 'error');
      api.ui.showNotification('操作失败', 'error');
    }
  });
}
```

### 3. 使用存储保存用户设置

```javascript
function activate(api) {
  // 加载设置
  var settings = api.storage.get('settings') || {
    enabled: true,
    threshold: 100
  };
  
  // 保存设置
  function saveSettings(newSettings) {
    settings = Object.assign(settings, newSettings);
    api.storage.set('settings', settings);
  }
  
  // 使用设置
  if (settings.enabled) {
    // ...
  }
}
```

### 4. 提供配置界面

```javascript
function activate(api) {
  api.ui.addRightActivityItem({
    id: 'my-plugin-settings',
    icon: '<svg>...</svg>',
    title: '插件设置',
    panel: function(props) {
      var container = document.createElement('div');
      container.style.padding = '12px';
      
      var settings = api.storage.get('settings') || { enabled: true };
      
      container.innerHTML = '\
        <h3>插件设置</h3>\
        <label>\
          <input type="checkbox" id="enabled" ' + (settings.enabled ? 'checked' : '') + '>\
          启用功能\
        </label>\
      ';
      
      container.querySelector('#enabled').onchange = function(e) {
        settings.enabled = e.target.checked;
        api.storage.set('settings', settings);
        api.ui.showNotification('设置已保存', 'info');
      };
      
      return container;
    }
  });
}
```

### 5. 错误边界处理

```javascript
function activate(api) {
  // 全局错误处理
  window.addEventListener('error', function(event) {
    api.utils.log('插件错误: ' + event.message, 'error');
  });
  
  // 安全执行函数
  function safeExecute(fn) {
    try {
      return fn();
    } catch (error) {
      api.utils.log('执行错误: ' + error.message, 'error');
      return null;
    }
  }
  
  // 使用
  safeExecute(function() {
    // 可能出错的代码
  });
}
```
