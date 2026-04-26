var savedApi = null;

var AIAssistantPanel = function(api) {
  this.api = api;
  this.container = null;
  this.isLoading = false;
  this.lastResponse = '';
  this.currentStream = null;
};

AIAssistantPanel.prototype.render = function() {
  var self = this;
  this.container = document.createElement('div');
  this.container.style.cssText = 'padding: 12px; font-size: 13px;';

  this.container.innerHTML = '\
    <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 500;">AI 助手示例</h3>\
    <p style="margin: 0 0 12px 0; color: var(--foreground-muted); font-size: 12px;">\
      演示 native API 能力：网络请求、流式传输、文件操作、命令执行\
    </p>\
    \
    <div style="display: grid; gap: 8px; margin-bottom: 16px;">\
      <button id="btn-fetch" style="padding: 8px 12px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">\
        测试网络请求 (fetch)\
      </button>\
      <button id="btn-stream" style="padding: 8px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">\
        测试流式传输 (fetchStream)\
      </button>\
      <button id="btn-file" style="padding: 8px 12px; background: var(--panel-bg); border: 1px solid var(--border); border-radius: 4px; cursor: pointer;">\
        测试文件操作 (fs)\
      </button>\
      <button id="btn-path" style="padding: 8px 12px; background: var(--panel-bg); border: 1px solid var(--border); border-radius: 4px; cursor: pointer;">\
        获取应用路径\
      </button>\
      <button id="btn-exec" style="padding: 8px 12px; background: var(--panel-bg); border: 1px solid var(--border); border-radius: 4px; cursor: pointer;">\
        执行命令 (echo)\
      </button>\
    </div>\
    \
    <div id="result-area" style="padding: 12px; background: var(--panel-bg); border-radius: 4px; min-height: 100px; max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 11px; white-space: pre-wrap; word-break: break-all;">\
      点击上方按钮测试功能...\
    </div>\
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

  this.container.querySelector('#btn-path').onclick = function() {
    self.testPath(resultArea);
  };

  this.container.querySelector('#btn-exec').onclick = function() {
    self.testExec(resultArea);
  };

  return this.container;
};

AIAssistantPanel.prototype.testFetch = function(resultArea) {
  var self = this;
  resultArea.textContent = '正在请求 https://httpbin.org/get ...';

  this.api.native.fetch('https://httpbin.org/get', {
    method: 'GET',
    timeout: 10000
  }).then(function(response) {
    if (response.ok) {
      var data = JSON.parse(response.body);
      resultArea.textContent = '网络请求成功!\n\n状态: ' + response.status + '\n\n响应数据:\n' + JSON.stringify(data, null, 2);
    } else {
      resultArea.textContent = '请求失败: ' + response.status + ' ' + response.statusText;
    }
  }).catch(function(err) {
    resultArea.textContent = '请求错误: ' + err.message;
  });
};

AIAssistantPanel.prototype.testStream = function(resultArea) {
  var self = this;
  resultArea.textContent = '正在发起流式请求...\n';

  var fullContent = '';
  var startTime = Date.now();

  var stream = this.api.native.fetchStream(
    'https://httpbin.org/stream/5',
    {
      onStart: function(info) {
        resultArea.textContent += '流已开始! 状态: ' + info.status + '\n\n';
      },
      onChunk: function(chunk) {
        fullContent += chunk;
        resultArea.textContent = '流式传输中... (已接收 ' + fullContent.length + ' 字节)\n\n';
        resultArea.textContent += '最新数据块:\n' + chunk.substring(0, 200) + (chunk.length > 200 ? '...' : '') + '\n\n';
        resultArea.textContent += '累计接收:\n' + fullContent.substring(0, 500) + (fullContent.length > 500 ? '...' : '');
        resultArea.scrollTop = resultArea.scrollHeight;
      },
      onError: function(error) {
        resultArea.textContent += '\n\n错误: ' + error.message;
      },
      onEnd: function() {
        var duration = Date.now() - startTime;
        resultArea.textContent = '流式传输完成!\n\n';
        resultArea.textContent += '总耗时: ' + duration + 'ms\n';
        resultArea.textContent += '总字节数: ' + fullContent.length + '\n\n';
        resultArea.textContent += '完整响应:\n' + fullContent;
      }
    },
    {
      method: 'GET',
      timeout: 30000
    }
  );

  this.currentStream = stream;
  console.log('[AI Assistant] Stream started with ID:', stream.streamId);
};

AIAssistantPanel.prototype.testFile = function(resultArea) {
  var self = this;
  var testPath = '';

  resultArea.textContent = '正在测试文件操作...';

  this.api.native.getAppPath('userData').then(function(userDataPath) {
    testPath = userDataPath.replace(/\\/g, '/') + '/plugins/ai-assistant-demo-test.txt';

    resultArea.textContent = '测试路径: ' + testPath + '\n\n正在写入文件...';

    return self.api.native.writeFile(testPath, 'Hello from AI Assistant Plugin!\n时间: ' + new Date().toISOString());
  }).then(function(writeResult) {
    if (!writeResult.success) {
      resultArea.textContent = '写入失败: ' + writeResult.error;
      return;
    }

    resultArea.textContent += '\n写入成功!\n\n正在读取文件...';
    return self.api.native.readFile(testPath);
  }).then(function(readResult) {
    if (!readResult) return;

    if (!readResult.success) {
      resultArea.textContent += '\n读取失败: ' + readResult.error;
      return;
    }

    resultArea.textContent += '\n读取成功!\n\n文件内容:\n' + readResult.content;

    return self.api.native.unlink(testPath);
  }).then(function(deleteResult) {
    if (!deleteResult) return;

    if (deleteResult.success) {
      resultArea.textContent += '\n\n测试文件已删除!';
    }
  }).catch(function(err) {
    resultArea.textContent = '错误: ' + (err.message || err);
  });
};

AIAssistantPanel.prototype.testPath = function(resultArea) {
  var self = this;
  var paths = ['home', 'appData', 'userData', 'temp', 'desktop', 'documents'];
  var results = [];

  resultArea.textContent = '正在获取应用路径...';

  var promises = paths.map(function(name) {
    return self.api.native.getAppPath(name).then(function(path) {
      results.push(name + ': ' + path);
    });
  });

  Promise.all(promises).then(function() {
    resultArea.textContent = '应用路径:\n\n' + results.join('\n');
  }).catch(function(err) {
    resultArea.textContent = '错误: ' + (err.message || err);
  });
};

AIAssistantPanel.prototype.testExec = function(resultArea) {
  var self = this;
  var isWindows = navigator.platform.indexOf('Win') !== -1;
  var command = isWindows ? 'echo Hello from plugin!' : 'echo "Hello from plugin!"';

  resultArea.textContent = '正在执行命令: ' + command;

  this.api.native.exec(command).then(function(result) {
    var output = '命令执行完成!\n\n';
    output += 'stdout: ' + result.stdout + '\n';
    if (result.stderr) {
      output += 'stderr: ' + result.stderr + '\n';
    }
    if (result.error) {
      output += 'error: ' + result.error;
    }
    resultArea.textContent = output;
  }).catch(function(err) {
    resultArea.textContent = '执行错误: ' + (err.message || err);
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
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
    title: 'AI 助手示例',
    panel: function(props) {
      if (currentPanel) {
        currentPanel.destroy();
      }
      currentPanel = new AIAssistantPanel(api);
      return currentPanel.render();
    }
  });

  api.commands.register('aiAssistant.testFetch', function() {
    api.native.fetch('https://httpbin.org/get').then(function(response) {
      if (response.ok) {
        api.ui.showNotification('网络请求成功! 状态: ' + response.status, 'info');
      } else {
        api.ui.showNotification('网络请求失败: ' + response.status, 'warning');
      }
    }).catch(function(err) {
      api.ui.showNotification('请求错误: ' + err.message, 'error');
    });
  });

  api.commands.register('aiAssistant.testStream', function() {
    var fullContent = '';
    api.native.fetchStream(
      'https://httpbin.org/stream/3',
      {
        onStart: function(info) {
          console.log('[AI Assistant] Stream started:', info.status);
        },
        onChunk: function(chunk) {
          fullContent += chunk;
          console.log('[AI Assistant] Chunk received:', chunk.length, 'bytes');
        },
        onError: function(error) {
          api.ui.showNotification('流式请求错误: ' + error.message, 'error');
        },
        onEnd: function() {
          api.ui.showNotification('流式传输完成! 共 ' + fullContent.length + ' 字节', 'info');
        }
      }
    );
  });

  console.log('[AI Assistant Demo] Plugin ready!');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activate: activate };
} else {
  exports.activate = activate;
}
