import React, { useState, useEffect } from 'react'
import './MobileServerPanel.scss'

interface ServerStatus {
  isRunning: boolean
  port: number
  token: string
}

export const MobileServerPanel: React.FC = () => {
  const [status, setStatus] = useState<ServerStatus>({
    isRunning: false,
    port: 0,
    token: ''
  })
  const [loading, setLoading] = useState(false)
  const [localIP, setLocalIP] = useState('127.0.0.1')

  useEffect(() => {
    loadStatus()
    loadLocalIP()
  }, [])

  const loadStatus = async () => {
    const result = await window.api.mobileServer.getStatus()
    setStatus(result)
  }

  const loadLocalIP = async () => {
    const ip = await window.api.mobileServer.getLocalIP()
    setLocalIP(ip)
  }

  const handleStart = async () => {
    setLoading(true)
    try {
      const result = await window.api.mobileServer.start()
      if (result.success) {
        setStatus({
          isRunning: true,
          port: result.port!,
          token: result.token!
        })
      } else {
        alert(`启动失败: ${result.error}`)
      }
    } catch (error) {
      alert(`启动失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    setLoading(true)
    try {
      const result = await window.api.mobileServer.stop()
      if (result.success) {
        setStatus({
          isRunning: false,
          port: 0,
          token: ''
        })
      } else {
        alert(`停止失败: ${result.error}`)
      }
    } catch (error) {
      alert(`停止失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mobile-server-panel">
      <div className="panel-header">
        <h3>移动服务器</h3>
        <span className={`status-badge ${status.isRunning ? 'running' : 'stopped'}`}>
          {status.isRunning ? '运行中' : '已停止'}
        </span>
      </div>

      <div className="panel-content">
        {status.isRunning ? (
          <div className="server-info">
            <div className="info-row">
              <span className="label">服务器地址:</span>
              <span className="value">http://{localIP}:{status.port}</span>
            </div>
            <div className="info-row">
              <span className="label">端口:</span>
              <span className="value">{status.port}</span>
            </div>
            <div className="info-row">
              <span className="label">Token:</span>
              <span className="value token">{status.token.substring(0, 8)}...</span>
            </div>
            <div className="info-tip">
              在手机端打开应用，将自动发现此服务器
            </div>
          </div>
        ) : (
          <div className="server-stopped">
            <p>启动移动服务器后，手机端可以访问此电脑上的项目</p>
            <ul>
              <li>自动发现局域网服务器</li>
              <li>查看和编辑章节内容</li>
              <li>实时同步修改</li>
            </ul>
          </div>
        )}

        <div className="panel-actions">
          {status.isRunning ? (
            <button
              className="btn-stop"
              onClick={handleStop}
              disabled={loading}
            >
              {loading ? '停止中...' : '停止服务器'}
            </button>
          ) : (
            <button
              className="btn-start"
              onClick={handleStart}
              disabled={loading}
            >
              {loading ? '启动中...' : '启动服务器'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
