import React, { useEffect, useRef, useCallback } from 'react'
import { usePluginService } from '../services/pluginService'

interface WebViewPanelProps {
  webViewId: string
}

const WebViewPanel: React.FC<WebViewPanelProps> = ({ webViewId }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const webView = usePluginService((s) => s.webViews.find((w) => w.id === webViewId))

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return

      if (event.data?.type === 'webview-message' && webView?.onMessage) {
        webView.onMessage(event.data.data)
      }
    },
    [webView]
  )

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [handleMessage])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !webView) return

    const doc = iframe.contentDocument
    if (!doc) return

    const scripts = webView.scripts.map((src) => `<script src="${src}"></script>`).join('\n')
    const styles = webView.styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          </style>
          ${styles}
        </head>
        <body>
          ${webView.html}
          <script>
            window.addEventListener('message', function(event) {
              if (event.data?.type === 'plugin-message') {
                window.dispatchEvent(new CustomEvent('plugin-message', { detail: event.data.data }));
              }
            });
            window.postMessageToPlugin = function(data) {
              window.parent.postMessage({ type: 'webview-message', data: data }, '*');
            };
          </script>
          ${scripts}
        </body>
      </html>
    `

    doc.open()
    doc.write(html)
    doc.close()
  }, [webView])

  if (!webView) {
    return <div style={{ padding: 12 }}>WebView not found: {webViewId}</div>
  }

  return (
    <iframe
      ref={iframeRef}
      data-webview-id={webViewId}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        background: 'transparent'
      }}
      sandbox="allow-scripts allow-forms allow-popups"
    />
  )
}

export default WebViewPanel
