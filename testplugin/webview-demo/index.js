var savedApi = null;
var webView = null;

function activate(api) {
  console.log('[WebView Demo] Plugin activated');
  savedApi = api;

  var html = '\
    <div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">\
      <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #333;">WebView 面板演示</h2>\
      \
      <p style="margin: 0 0 12px 0; color: #666; font-size: 13px;">\
        这是一个独立的 WebView 面板，拥有自己的 HTML/CSS/JS 环境。\
      </p>\
      \
      <div style="margin-bottom: 16px;">\
        <input \
          id="message-input" \
          type="text" \
          placeholder="输入消息发送给插件..." \
          style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; box-sizing: border-box;"\
        />\
      </div>\
      \
      <button id="send-btn" style="width: 100%; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; margin-bottom: 12px;">\
        发送消息到插件\
      </button>\
      \
      <button id="fetch-btn" style="width: 100%; padding: 10px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; margin-bottom: 16px;">\
        测试网络请求 (通过插件)\
      </button>\
      \
      <div id="result" style="padding: 12px; background: #f5f5f5; border-radius: 4px; min-height: 60px; font-size: 12px; color: #333;">\
        等待操作...\
      </div>\
      \
      <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 4px; font-size: 11px; color: #92400e;">\
        <strong>提示：</strong>\
        <ul style="margin: 8px 0 0 0; padding-left: 16px;">\
          <li>WebView 有独立的样式隔离</li>\
          <li>可以使用 postMessage 与插件通信</li>\
          <li>适合复杂的 UI 组件</li>\
        </ul>\
      </div>\
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
    \
    document.getElementById("fetch-btn").addEventListener("click", function() {\
      window.postMessageToPlugin({ type: "fetch-request" });\
      document.getElementById("result").textContent = "正在请求...";\
    });\
    \
    window.addEventListener("plugin-message", function(event) {\
      var data = event.detail;\
      if (data.type === "fetch-response") {\
        document.getElementById("result").textContent = "响应: " + JSON.stringify(data.content, null, 2);\
      } else if (data.type === "ack") {\
        document.getElementById("result").textContent = "插件确认: " + data.message;\
      }\
    });\
  ';

  webView = api.ui.addWebViewPanel({
    id: 'webview-demo',
    title: 'WebView 演示',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>',
    html: html,
    scripts: [],
    styles: [],
    onMessage: function(message) {
      console.log('[WebView Demo] Received from WebView:', message);

      if (message.type === 'user-message') {
        api.ui.showNotification('WebView 消息: ' + message.content, 'info');
        webView.postMessage({ type: 'ack', message: '收到消息: ' + message.content });
      }

      if (message.type === 'fetch-request') {
        api.native.fetch('https://httpbin.org/get').then(function(response) {
          if (response.ok) {
            var data = JSON.parse(response.body);
            webView.postMessage({ type: 'fetch-response', content: data });
          }
        }).catch(function(err) {
          webView.postMessage({ type: 'fetch-response', content: { error: err.message } });
        });
      }
    }
  });

  console.log('[WebView Demo] Plugin ready!');
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
