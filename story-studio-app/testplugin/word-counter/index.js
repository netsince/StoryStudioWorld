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

  // 初始加载
  refreshStats();

  // 监听内容变化
  this.unsubscribeContent = this.api.editor.onContentChange(updateStats);
  
  // 监听 Tab 切换
  this.unsubscribeTab = this.api.editor.onTabChange(function(tab) {
    refreshStats();
  });

  this.updateDisplay();
  return this.container;
};

WordCounterPanel.prototype.destroy = function() {
  if (this.unsubscribeContent) {
    this.unsubscribeContent();
  }
  if (this.unsubscribeTab) {
    this.unsubscribeTab();
  }
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
      if (currentPanel) {
        currentPanel.destroy();
      }
      currentPanel = new WordCounterPanel(api);
      return currentPanel.render();
    }
  });

  api.commands.register('wordCounter.showStats', function() {
    api.editor.getActiveContent().then(function(content) {
      if (content) {
        var chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
        api.ui.showNotification(
          '当前文档: ' + content.length + ' 字符, ' + chineseChars + ' 中文字',
          'info'
        );
      } else {
        api.ui.showNotification('请先打开一个文档', 'warning');
      }
    });
  });

  console.log('[Word Counter] Plugin ready!');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activate: activate };
} else {
  exports.activate = activate;
}
