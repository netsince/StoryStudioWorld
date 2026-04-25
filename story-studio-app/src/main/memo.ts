import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'

export interface Memo {
  id: string
  content: string
  createdAt: number
  updatedAt: number
}

interface MemoData {
  memos: Memo[]
}

const MEMO_FILE_NAME = 'memos.json'

function getMemoFilePath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, MEMO_FILE_NAME)
}

function generateId(): string {
  return `memo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await readFile(filePath, 'utf-8')
  } catch {
    const dir = filePath.substring(0, filePath.lastIndexOf('\\'))
    await mkdir(dir, { recursive: true })
    await writeFile(filePath, JSON.stringify({ memos: [] }, null, 2), 'utf-8')
  }
}

async function loadMemos(): Promise<MemoData> {
  const filePath = getMemoFilePath()
  await ensureFileExists(filePath)
  const content = await readFile(filePath, 'utf-8')
  return JSON.parse(content) as MemoData
}

async function saveMemos(data: MemoData): Promise<void> {
  const filePath = getMemoFilePath()
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export async function getAllMemos(): Promise<Memo[]> {
  const data = await loadMemos()
  return data.memos.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function createMemo(content: string = ''): Promise<Memo> {
  const data = await loadMemos()
  const now = Date.now()
  const newMemo: Memo = {
    id: generateId(),
    content,
    createdAt: now,
    updatedAt: now
  }
  data.memos.push(newMemo)
  await saveMemos(data)
  return newMemo
}

export async function updateMemo(id: string, content: string): Promise<Memo | null> {
  const data = await loadMemos()
  const memo = data.memos.find(m => m.id === id)
  if (!memo) return null
  
  memo.content = content
  memo.updatedAt = Date.now()
  await saveMemos(data)
  return memo
}

export async function deleteMemo(id: string): Promise<boolean> {
  const data = await loadMemos()
  const index = data.memos.findIndex(m => m.id === id)
  if (index === -1) return false
  
  data.memos.splice(index, 1)
  await saveMemos(data)
  return true
}
