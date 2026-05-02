import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface CreateProjectInput {
  projectName: string
  description: string
  projectPath: string
  defaultStoryName?: string
}

const CreateProjectForm: React.FC<{
  onCreateProject: (input: CreateProjectInput) => Promise<void>
  onPickProjectPath: () => Promise<string | null>
}> = ({ onCreateProject, onPickProjectPath }) => {
  const { t } = useTranslation()
  const [isSubmittingProject, setIsSubmittingProject] = useState(false)
  const [form, setForm] = useState<CreateProjectInput>({
    projectName: '',
    description: '',
    projectPath: ''
  })

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (isSubmittingProject) return

    setIsSubmittingProject(true)
    try {
      await onCreateProject(form)
      setForm({ projectName: '', description: '', projectPath: '' })
    } finally {
      setIsSubmittingProject(false)
    }
  }

  return (
    <div key="create-project" className="editor-content create-project-page">
      <div className="project-title">{t('welcome.newProject')}</div>
      <form className="create-project-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="form-field">
          <span>{t('createProject.projectName')}</span>
          <input
            value={form.projectName}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, projectName: event.target.value }))
            }
            placeholder={t('createProject.projectNamePlaceholder')}
          />
        </label>

        <label className="form-field">
          <span>{t('createProject.projectDescription')}</span>
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder={t('createProject.projectDescriptionPlaceholder')}
            rows={5}
          />
        </label>

        <label className="form-field">
          <span>{t('createProject.path')}</span>
          <div className="path-picker-row">
            <input
              value={form.projectPath}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, projectPath: event.target.value }))
              }
              placeholder={t('createProject.pathPlaceholder')}
            />
            <button
              type="button"
              className="action-button secondary inline-button"
              onClick={async () => {
                const path = await onPickProjectPath()
                if (path) {
                  setForm((prev) => ({ ...prev, projectPath: path }))
                }
              }}
            >
              {t('welcome.selectLocation')}
            </button>
          </div>
        </label>

        <div className="create-project-actions">
          <button type="submit" className="action-button" disabled={isSubmittingProject}>
            {isSubmittingProject ? t('createProject.creating') : t('welcome.create')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateProjectForm
