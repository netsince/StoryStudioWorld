import React, { useState } from 'react'

export interface CreateProjectInput {
  projectName: string
  description: string
  projectPath: string
}

const CreateProjectForm: React.FC<{
  onCreateProject: (input: CreateProjectInput) => Promise<void>
  onPickProjectPath: () => Promise<string | null>
}> = ({ onCreateProject, onPickProjectPath }) => {
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
      <div className="create-project-shell">
        <div className="create-project-title">新建项目</div>
        <div className="create-project-subtitle">
          填写项目名、简介和项目路径。创建后会自动生成{' '}
          <code>storystudioworld.sswprojectsetting</code> 项目文件。
        </div>

        <form className="create-project-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="form-field">
            <span>项目名</span>
            <input
              value={form.projectName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, projectName: event.target.value }))
              }
              placeholder="例如：长夜群星"
            />
          </label>

          <label className="form-field">
            <span>项目简介</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="简单描述这个故事项目。"
              rows={5}
            />
          </label>

          <label className="form-field">
            <span>路径</span>
            <div className="path-picker-row">
              <input
                value={form.projectPath}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, projectPath: event.target.value }))
                }
                placeholder="选择一个空文件夹路径"
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
                选择
              </button>
            </div>
          </label>

          <div className="create-project-actions">
            <button type="submit" className="action-button" disabled={isSubmittingProject}>
              {isSubmittingProject ? '创建中...' : '创建项目'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateProjectForm
