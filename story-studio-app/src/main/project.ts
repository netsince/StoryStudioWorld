import { mkdir, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { basename, dirname, extname, join, normalize } from 'path'
import { randomUUID } from 'crypto'

export const PROJECT_SETTINGS_FILE = 'storystudioworld.sswprojectsetting'
const PROJECT_VERSION = 1

export interface StoryChapter {
  id: string
  name: string
  fileName: string
}

export interface StoryVolume {
  id: string
  name: string
  folderName: string
  collapsed: boolean
  chapters: StoryChapter[]
}

export interface ProjectData {
  version: number
  projectName: string
  description: string
  projectPath: string
  projectSettingsPath: string
  storyVolumes: StoryVolume[]
}

interface PersistedProjectData {
  version: number
  projectName: string
  description: string
  storyVolumes: StoryVolume[]
}

export interface CreateProjectInput {
  projectName: string
  description: string
  projectPath: string
}

export interface ReorderVolumeInput {
  projectSettingsPath: string
  draggedVolumeId: string
  targetVolumeId: string
}

export interface MoveChapterInput {
  projectSettingsPath: string
  chapterId: string
  targetVolumeId: string
}

export interface RenameStoryNodeInput {
  projectSettingsPath: string
  nodeType: 'volume' | 'chapter'
  nodeId: string
  nextName: string
}

export interface CreateStoryNodeInput {
  projectSettingsPath: string
  nodeType: 'volume' | 'chapter'
  parentVolumeId?: string
}

export interface ToggleVolumeInput {
  projectSettingsPath: string
  volumeId: string
}

function normalizeProjectPath(projectPath: string): string {
  return normalize(projectPath.trim())
}

function normalizeProjectSettingsPath(projectSettingsPath: string): string {
  return normalize(projectSettingsPath.trim())
}

function cleanSegmentName(name: string, fallback: string): string {
  const cleaned = Array.from(name.trim().replace(/[<>:"/\\|?*]/g, ' '))
    .map((char) => (char.charCodeAt(0) < 32 ? ' ' : char))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || fallback
}

function stripMd(name: string): string {
  return name.replace(/\.md$/i, '').trim()
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath)
    return true
  } catch {
    return false
  }
}

async function ensureDirectoryEmpty(projectPath: string): Promise<void> {
  if (!(await pathExists(projectPath))) {
    await mkdir(projectPath, { recursive: true })
    return
  }

  const state = await stat(projectPath)
  if (!state.isDirectory()) {
    throw new Error('项目路径必须是一个文件夹。')
  }

  const fs = await import('fs/promises')
  const entries = await fs.readdir(projectPath)
  if (entries.length > 0) {
    throw new Error('项目路径必须为空文件夹。')
  }
}

function getSettingsPath(projectPath: string): string {
  return join(projectPath, PROJECT_SETTINGS_FILE)
}

function getStoryRoot(projectPath: string): string {
  return join(projectPath, 'story')
}

async function writeProject(project: ProjectData): Promise<ProjectData> {
  const persisted: PersistedProjectData = {
    version: project.version,
    projectName: project.projectName,
    description: project.description,
    storyVolumes: project.storyVolumes
  }

  await writeFile(getSettingsPath(project.projectPath), JSON.stringify(persisted, null, 2), 'utf-8')
  return project
}

async function readProjectSettings(projectPath: string): Promise<PersistedProjectData> {
  const settingsPath = getSettingsPath(projectPath)
  if (!(await pathExists(settingsPath))) {
    throw new Error('当前文件夹不是有效的 Story Studio World 项目。')
  }

  const raw = await readFile(settingsPath, 'utf-8')
  return JSON.parse(raw) as PersistedProjectData
}

function withProjectPath(projectPath: string, data: PersistedProjectData): ProjectData {
  return {
    version: data.version ?? PROJECT_VERSION,
    projectName: data.projectName ?? basename(projectPath),
    description: data.description ?? '',
    projectPath,
    projectSettingsPath: getSettingsPath(projectPath),
    storyVolumes: Array.isArray(data.storyVolumes) ? data.storyVolumes : []
  }
}

async function findUniqueVolumeFolderName(
  projectPath: string,
  preferredName: string
): Promise<string> {
  const storyRoot = getStoryRoot(projectPath)
  const baseName = cleanSegmentName(preferredName, '新卷')
  let candidate = baseName
  let index = 1

  while (await pathExists(join(storyRoot, candidate))) {
    candidate = `${baseName} (${index})`
    index += 1
  }

  return candidate
}

async function findUniqueChapterFileName(
  projectPath: string,
  volumeFolderName: string,
  preferredBaseName: string
): Promise<string> {
  const volumePath = join(getStoryRoot(projectPath), volumeFolderName)
  const baseName = cleanSegmentName(stripMd(preferredBaseName), '新章')
  let candidate = `${baseName}.md`
  let index = 1

  while (await pathExists(join(volumePath, candidate))) {
    candidate = `${baseName} (${index}).md`
    index += 1
  }

  return candidate
}

function getVolumeDisplayName(volume: StoryVolume, index: number): string {
  return volume.name.trim() ? `第${index}卷 ${volume.name.trim()}` : `第${index}卷`
}

function getNextChapterDefaultName(volume: StoryVolume): string {
  return `第${volume.chapters.length + 1}章`
}

export async function createProject(input: CreateProjectInput): Promise<ProjectData> {
  const projectPath = normalizeProjectPath(input.projectPath)
  const projectName = input.projectName.trim()

  if (!projectName) {
    throw new Error('请填写项目名。')
  }

  await ensureDirectoryEmpty(projectPath)
  await mkdir(join(projectPath, 'character'), { recursive: true })
  await mkdir(join(projectPath, 'worldviewsetting'), { recursive: true })
  await mkdir(join(projectPath, 'story'), { recursive: true })

  const defaultVolumeFolderName = await findUniqueVolumeFolderName(projectPath, '第0卷')
  await mkdir(join(getStoryRoot(projectPath), defaultVolumeFolderName), { recursive: true })

  const project: ProjectData = {
    version: PROJECT_VERSION,
    projectName,
    description: input.description.trim(),
    projectPath,
    projectSettingsPath: getSettingsPath(projectPath),
    storyVolumes: [
      {
        id: randomUUID(),
        name: '',
        folderName: defaultVolumeFolderName,
        collapsed: false,
        chapters: []
      }
    ]
  }

  return writeProject(project)
}

export async function loadProject(projectPathInput: string): Promise<ProjectData> {
  const projectSettingsPath = normalizeProjectSettingsPath(projectPathInput)
  if (basename(projectSettingsPath) !== PROJECT_SETTINGS_FILE) {
    throw new Error(`请选择 ${PROJECT_SETTINGS_FILE} 文件。`)
  }

  const projectPath = dirname(projectSettingsPath)
  const settings = await readProjectSettings(projectPath)
  return withProjectPath(projectPath, settings)
}

export async function createStoryNode(input: CreateStoryNodeInput): Promise<ProjectData> {
  const project = await loadProject(input.projectSettingsPath)

  if (input.nodeType === 'volume') {
    const nextIndex = project.storyVolumes.length
    const folderName = await findUniqueVolumeFolderName(project.projectPath, `第${nextIndex}卷`)
    await mkdir(join(getStoryRoot(project.projectPath), folderName), { recursive: true })
    project.storyVolumes.push({
      id: randomUUID(),
      name: '',
      folderName,
      collapsed: false,
      chapters: []
    })
    return writeProject(project)
  }

  const targetVolume =
    project.storyVolumes.find((volume) => volume.id === input.parentVolumeId) ??
    project.storyVolumes[0]

  if (!targetVolume) {
    throw new Error('请先创建一个卷，再添加章。')
  }

  const nextChapterName = getNextChapterDefaultName(targetVolume)
  const fileName = await findUniqueChapterFileName(
    project.projectPath,
    targetVolume.folderName,
    nextChapterName
  )

  await writeFile(
    join(getStoryRoot(project.projectPath), targetVolume.folderName, fileName),
    '',
    'utf-8'
  )
  targetVolume.chapters.push({
    id: randomUUID(),
    name: stripMd(fileName),
    fileName
  })

  return writeProject(project)
}

export async function renameStoryNode(input: RenameStoryNodeInput): Promise<ProjectData> {
  const project = await loadProject(input.projectSettingsPath)
  const nextName = input.nextName.trim()

  if (!nextName) {
    throw new Error('名称不能为空。')
  }

  if (input.nodeType === 'volume') {
    const volume = project.storyVolumes.find((item) => item.id === input.nodeId)
    if (!volume) {
      throw new Error('未找到要重命名的卷。')
    }

    const nextFolderName = await findUniqueVolumeFolderName(project.projectPath, nextName)
    await rename(
      join(getStoryRoot(project.projectPath), volume.folderName),
      join(getStoryRoot(project.projectPath), nextFolderName)
    )

    volume.folderName = nextFolderName
    volume.name = nextName
    return writeProject(project)
  }

  const volume = project.storyVolumes.find((item) =>
    item.chapters.some((chapter) => chapter.id === input.nodeId)
  )
  const chapter = volume?.chapters.find((item) => item.id === input.nodeId)

  if (!volume || !chapter) {
    throw new Error('未找到要重命名的章。')
  }

  const nextFileName = await findUniqueChapterFileName(
    project.projectPath,
    volume.folderName,
    nextName
  )
  await rename(
    join(getStoryRoot(project.projectPath), volume.folderName, chapter.fileName),
    join(getStoryRoot(project.projectPath), volume.folderName, nextFileName)
  )

  chapter.name = stripMd(nextFileName)
  chapter.fileName = nextFileName
  return writeProject(project)
}

export async function toggleVolumeCollapsed(input: ToggleVolumeInput): Promise<ProjectData> {
  const project = await loadProject(input.projectSettingsPath)
  const volume = project.storyVolumes.find((item) => item.id === input.volumeId)
  if (!volume) {
    throw new Error('未找到卷。')
  }

  volume.collapsed = !volume.collapsed
  return writeProject(project)
}

export async function reorderVolumes(input: ReorderVolumeInput): Promise<ProjectData> {
  const project = await loadProject(input.projectSettingsPath)
  const draggedIndex = project.storyVolumes.findIndex((item) => item.id === input.draggedVolumeId)
  const targetIndex = project.storyVolumes.findIndex((item) => item.id === input.targetVolumeId)

  if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
    return project
  }

  const [dragged] = project.storyVolumes.splice(draggedIndex, 1)
  project.storyVolumes.splice(targetIndex, 0, dragged)
  return writeProject(project)
}

export async function moveChapterToVolume(input: MoveChapterInput): Promise<ProjectData> {
  const project = await loadProject(input.projectSettingsPath)
  const sourceVolume = project.storyVolumes.find((volume) =>
    volume.chapters.some((chapter) => chapter.id === input.chapterId)
  )
  const targetVolume = project.storyVolumes.find((volume) => volume.id === input.targetVolumeId)

  if (!sourceVolume || !targetVolume) {
    throw new Error('移动章失败，未找到目标卷。')
  }

  const chapterIndex = sourceVolume.chapters.findIndex((chapter) => chapter.id === input.chapterId)
  if (chapterIndex === -1) {
    throw new Error('未找到要移动的章。')
  }

  const [chapter] = sourceVolume.chapters.splice(chapterIndex, 1)
  const nextFileName = await findUniqueChapterFileName(
    project.projectPath,
    targetVolume.folderName,
    stripMd(chapter.fileName)
  )

  await rename(
    join(getStoryRoot(project.projectPath), sourceVolume.folderName, chapter.fileName),
    join(getStoryRoot(project.projectPath), targetVolume.folderName, nextFileName)
  )

  chapter.fileName = nextFileName
  chapter.name = stripMd(nextFileName)
  targetVolume.chapters.push(chapter)

  return writeProject(project)
}

export function getChapterAbsolutePath(project: ProjectData, chapterId: string): string | null {
  for (const volume of project.storyVolumes) {
    const chapter = volume.chapters.find((item) => item.id === chapterId)
    if (chapter) {
      return join(getStoryRoot(project.projectPath), volume.folderName, chapter.fileName)
    }
  }

  return null
}

export function getVolumeLabel(project: ProjectData, volumeId: string): string | null {
  const index = project.storyVolumes.findIndex((item) => item.id === volumeId)
  if (index === -1) {
    return null
  }

  return getVolumeDisplayName(project.storyVolumes[index], index)
}

export async function clearProjectDirectory(projectPath: string): Promise<void> {
  if (await pathExists(projectPath)) {
    await rm(projectPath, { recursive: true, force: true })
  }
}

export function getChapterBaseName(fileName: string): string {
  return stripMd(basename(fileName, extname(fileName)))
}
