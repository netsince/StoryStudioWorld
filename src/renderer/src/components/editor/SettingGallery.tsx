import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import type { GalleryImageItem } from '../../../preload/index'

interface SettingGalleryProps {
  nodeId: string
}

const SettingGallery: React.FC<SettingGalleryProps> = ({ nodeId }) => {
  const { t } = useTranslation()
  const currentProject = useProjectStore((s) => s.currentProject)
  const [images, setImages] = useState<GalleryImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dragItemId, setDragItemId] = useState<string | null>(null)
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null)
  const [captionDraft, setCaptionDraft] = useState('')

  const loadImages = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const result = await window.api.gallery.getImages(currentProject.projectSettingsPath, nodeId)
      setImages(result)
    } catch (error) {
      console.error('Failed to load gallery:', error)
    } finally {
      setLoading(false)
    }
  }, [currentProject, nodeId])

  useEffect(() => {
    loadImages()
  }, [loadImages])

  const handleUpload = async (): Promise<void> => {
    if (!currentProject) return
    const result = await window.api.gallery.uploadImage(currentProject.projectSettingsPath, nodeId)
    if (result) {
      setImages((prev) => [...prev, result])
    }
  }

  const handleRemove = async (itemId: string): Promise<void> => {
    if (!currentProject) return
    await window.api.gallery.remove(currentProject.projectSettingsPath, itemId)
    setImages((prev) => prev.filter((img) => img.id !== itemId))
  }

  const handleSetTheme = async (itemId: string): Promise<void> => {
    if (!currentProject) return
    await window.api.gallery.setTheme(currentProject.projectSettingsPath, nodeId, itemId)
    setImages((prev) =>
      prev.map((img) => ({ ...img, isTheme: img.id === itemId }))
    )
  }

  const handleUnsetTheme = async (): Promise<void> => {
    if (!currentProject) return
    await window.api.gallery.unsetTheme(currentProject.projectSettingsPath, nodeId)
    setImages((prev) =>
      prev.map((img) => ({ ...img, isTheme: false }))
    )
  }

  const handleCaptionSave = async (itemId: string): Promise<void> => {
    if (!currentProject) return
    await window.api.gallery.updateCaption(currentProject.projectSettingsPath, itemId, captionDraft)
    setImages((prev) =>
      prev.map((img) => (img.id === itemId ? { ...img, caption: captionDraft } : img))
    )
    setEditingCaptionId(null)
    setCaptionDraft('')
  }

  const handleDragStart = (itemId: string): void => {
    setDragItemId(itemId)
  }

  const handleDragOver = (e: React.DragEvent, targetId: string): void => {
    e.preventDefault()
    if (!dragItemId || dragItemId === targetId) return

    const dragIdx = images.findIndex((img) => img.id === dragItemId)
    const targetIdx = images.findIndex((img) => img.id === targetId)
    if (dragIdx === -1 || targetIdx === -1) return

    const newImages = [...images]
    const [removed] = newImages.splice(dragIdx, 1)
    newImages.splice(targetIdx, 0, removed)
    setImages(newImages)
  }

  const handleDragEnd = async (): Promise<void> => {
    if (!currentProject || !dragItemId) return
    const itemIds = images.map((img) => img.id)
    await window.api.gallery.reorder(currentProject.projectSettingsPath, itemIds)
    setDragItemId(null)
  }

  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
  }

  return (
    <div className="setting-gallery">
      <div className="setting-gallery-toolbar">
        <button className="setting-gallery-upload-btn" onClick={handleUpload}>
          + {t('gallery.upload')}
        </button>
      </div>

      {images.length === 0 ? (
        <div className="setting-gallery-empty">
          <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: '12px' }}>🖼</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('gallery.empty')}</div>
        </div>
      ) : (
        <div className="setting-gallery-masonry">
          {images.map((img) => (
            <div
              key={img.id}
              className={`setting-gallery-item ${dragItemId === img.id ? 'dragging' : ''} ${img.isTheme ? 'is-theme' : ''}`}
              draggable
              onDragStart={() => handleDragStart(img.id)}
              onDragOver={(e) => handleDragOver(e, img.id)}
              onDragEnd={handleDragEnd}
            >
              <div className="setting-gallery-item-image">
                {img.dataUrl ? (
                  <img src={img.dataUrl} alt={img.caption || img.fileName} />
                ) : (
                  <div className="setting-gallery-item-broken">{t('gallery.imageBroken')}</div>
                )}
                {img.isTheme && (
                  <div className="setting-gallery-theme-badge">{t('gallery.themeImage')}</div>
                )}
              </div>
              {editingCaptionId === img.id ? (
                <div className="setting-gallery-caption-edit">
                  <input
                    type="text"
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCaptionSave(img.id)
                      if (e.key === 'Escape') setEditingCaptionId(null)
                    }}
                    onBlur={() => handleCaptionSave(img.id)}
                    autoFocus
                    placeholder={t('gallery.captionPlaceholder')}
                  />
                </div>
              ) : (
                <div
                  className="setting-gallery-caption"
                  onClick={() => {
                    setEditingCaptionId(img.id)
                    setCaptionDraft(img.caption || '')
                  }}
                >
                  <span className="setting-gallery-caption-text">
                    {img.caption || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('gallery.addCaption')}</span>}
                  </span>
                  <span className="setting-gallery-caption-actions">
                    {img.isTheme ? (
                      <button
                        className="setting-gallery-inline-btn theme-active"
                        onClick={(e) => { e.stopPropagation(); handleUnsetTheme() }}
                        title={t('gallery.unsetTheme')}
                      >
                        ★
                      </button>
                    ) : (
                      <button
                        className="setting-gallery-inline-btn"
                        onClick={(e) => { e.stopPropagation(); handleSetTheme(img.id) }}
                        title={t('gallery.setTheme')}
                      >
                        ★
                      </button>
                    )}
                    <button
                      className="setting-gallery-inline-btn delete"
                      onClick={(e) => { e.stopPropagation(); handleRemove(img.id) }}
                      title={t('gallery.remove')}
                    >
                      ✕
                    </button>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SettingGallery
