import type { StoryNode } from '../models'
import type { ProofreadResult, CreateNodeInput } from '../../../preload/index'

export type BeforeSaveCallback = (
  content: string,
  node: StoryNode
) => string | false | void

export type AfterLoadCallback = (
  content: string,
  node: StoryNode
) => string | void

export type ProofreadCallback = (
  text: string
) => ProofreadResult | Promise<ProofreadResult>

export type FileOpenCallback = (
  node: StoryNode,
  content: string
) => void | string

export type ExportCallback = (
  format: string,
  data: unknown
) => unknown | Promise<unknown>

export type NodeCreateCallback = (
  input: CreateNodeInput
) => CreateNodeInput | false | void

export type NodeDeleteCallback = (
  nodeId: string,
  node: StoryNode
) => boolean | void

export type NodeRenameCallback = (
  nodeId: string,
  newName: string,
  node: StoryNode
) => string | false | void

export type NodeMoveCallback = (
  nodeId: string,
  newParentId: string | null,
  node: StoryNode
) => boolean | void

export type ContentChangeCallback = (content: string) => void

export type TabChangeCallback = (tabId: string | null, tab: unknown) => void

export type HookCallback =
  | BeforeSaveCallback
  | AfterLoadCallback
  | ProofreadCallback
  | FileOpenCallback
  | ExportCallback
  | NodeCreateCallback
  | NodeDeleteCallback
  | NodeRenameCallback
  | NodeMoveCallback
  | ContentChangeCallback
  | TabChangeCallback
  | ((...args: unknown[]) => unknown)

export interface HookEvent {
  name: string
  description: string
}

export const HookEvents: HookEvent[] = [
  { name: 'content:beforeSave', description: '保存前，可修改内容或阻止保存' },
  { name: 'content:afterLoad', description: '加载后，可转换内容' },
  { name: 'content:onEdit', description: '编辑时触发' },
  { name: 'proofread:process', description: '校对处理，可替换校对引擎' },
  { name: 'file:open', description: '文件打开时' },
  { name: 'file:beforeCreate', description: '创建前，可修改输入或阻止' },
  { name: 'file:beforeDelete', description: '删除前，可阻止删除' },
  { name: 'file:beforeRename', description: '重命名前，可修改名称或阻止' },
  { name: 'file:beforeMove', description: '移动前，可阻止移动' },
  { name: 'export:format', description: '导出格式处理' },
  { name: 'tab:change', description: 'Tab 切换时' }
]

class HookSystem {
  private hooks = new Map<string, Set<HookCallback>>()

  on(event: string, callback: HookCallback): () => void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, new Set())
    }
    this.hooks.get(event)!.add(callback)

    return () => {
      this.hooks.get(event)?.delete(callback)
    }
  }

  off(event: string, callback: HookCallback): void {
    this.hooks.get(event)?.delete(callback)
  }

  emit(event: string, ...args: unknown[]): void {
    const callbacks = this.hooks.get(event)
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          ;(cb as (...a: unknown[]) => void)(...args)
        } catch (e) {
          console.error(`Hook ${event} error:`, e)
        }
      })
    }
  }

  async emitAsync(event: string, ...args: unknown[]): Promise<void> {
    const callbacks = this.hooks.get(event)
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          await (cb as (...a: unknown[]) => Promise<void> | void)(...args)
        } catch (e) {
          console.error(`Hook ${event} error:`, e)
        }
      }
    }
  }

  async waterfall<T>(event: string, initial: T): Promise<T> {
    const callbacks = Array.from(this.hooks.get(event) || [])
    let result = initial

    for (const cb of callbacks) {
      try {
        const newResult = await (cb as (input: T) => T | Promise<T> | void)(result)
        if (newResult !== undefined) {
          result = newResult
        }
      } catch (e) {
        console.error(`Hook ${event} error:`, e)
      }
    }

    return result
  }

  async intercept<T>(
    event: string,
    input: T
  ): Promise<{ proceed: boolean; result?: T }> {
    const callbacks = Array.from(this.hooks.get(event) || [])

    for (const cb of callbacks) {
      try {
        const result = await (cb as (input: T) => T | boolean | void)(input)
        if (result === false) {
          return { proceed: false }
        }
        if (result !== undefined && result !== true) {
          input = result as T
        }
      } catch (e) {
        console.error(`Hook ${event} error:`, e)
      }
    }

    return { proceed: true, result: input }
  }

  has(event: string): boolean {
    const callbacks = this.hooks.get(event)
    return callbacks !== undefined && callbacks.size > 0
  }

  getCallbacks(event: string): HookCallback[] {
    return Array.from(this.hooks.get(event) || [])
  }

  clear(event?: string): void {
    if (event) {
      this.hooks.delete(event)
    } else {
      this.hooks.clear()
    }
  }
}

export const hookSystem = new HookSystem()
export type HookSystemType = typeof hookSystem
