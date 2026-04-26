import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const ssworldSvg = new URL('../../assets/ssworld.svg', import.meta.url).href

interface VersionInfo {
  version: string
  electron: string
  chrome: string
  node: string
  v8: string
  platform: string
}

const AboutPage: React.FC = () => {
  const { t } = useTranslation()
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)

  useEffect(() => {
    window.api.getAppVersion().then(setVersionInfo)
  }, [])

  const getOSInfo = (platform: string): string => {
    switch (platform) {
      case 'win32':
        return 'Windows'
      case 'darwin':
        return 'macOS'
      case 'linux':
        return 'Linux'
      default:
        return platform
    }
  }

  const infoItems = versionInfo
    ? [
        { label: t('about.version'), value: versionInfo.version },
        { label: 'Electron', value: versionInfo.electron },
        { label: 'Chromium', value: versionInfo.chrome },
        { label: 'Node.js', value: versionInfo.node },
        { label: 'V8', value: versionInfo.v8 },
        { label: t('about.os'), value: getOSInfo(versionInfo.platform) }
      ]
    : []

  return (
    <div
      className="about-page"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        backgroundColor: 'var(--bg-color, #1e1e1e)',
        color: 'var(--text-color, #cccccc)',
        overflow: 'auto'
      }}
    >
      <div
        className="about-logo"
        style={{
          width: '120px',
          height: '120px',
          marginBottom: '24px'
        }}
      >
        <img
          src={ssworldSvg}
          alt="Story Studio World"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      </div>

      <h1
        style={{
          fontSize: '28px',
          fontWeight: 600,
          marginBottom: '32px',
          color: 'var(--text-color, #ffffff)'
        }}
      >
        Story Studio World
      </h1>

      <div
        className="about-info"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          minWidth: '280px'
        }}
      >
        {infoItems.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px'
            }}
          >
            <span
              style={{
                color: 'var(--text-muted, #858585)',
                marginRight: '24px'
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                color: 'var(--text-color, #cccccc)',
                fontFamily: 'var(--mono-font, monospace)'
              }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '48px',
          fontSize: '12px',
          color: 'var(--text-muted, #858585)',
          textAlign: 'center'
        }}
      >
        {t('about.copyright')}
      </div>
    </div>
  )
}

export default AboutPage
