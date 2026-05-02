// 简单的命令服务，类似 VS Code 的 CommandsRegistry

type CommandHandler = (...args: unknown[]) => void | Promise<void>

interface Command {
  id: string
  groupId: string
  handler: CommandHandler
}

class CommandService {
  private commands = new Map<string, Command[]>()
  private activeGroupId: string | null = null

  // 设置当前活动组
  setActiveGroup(groupId: string | null): void {
    this.activeGroupId = groupId
  }

  registerCommand(id: string, handler: CommandHandler, groupId: string = 'default'): () => void {
    const command: Command = { id, groupId, handler }

    if (!this.commands.has(id)) {
      this.commands.set(id, [])
    }

    const commandList = this.commands.get(id)!
    commandList.push(command)

    return () => {
      const list = this.commands.get(id)
      if (list) {
        const index = list.findIndex((cmd) => cmd.groupId === groupId)
        if (index !== -1) {
          list.splice(index, 1)
        }
        if (list.length === 0) {
          this.commands.delete(id)
        }
      }
    }
  }

  executeCommand(id: string, ...args: unknown[]): Promise<void> {
    const commandList = this.commands.get(id)
    if (!commandList || commandList.length === 0) {
      console.warn(`Command '${id}' not found`)
      return Promise.resolve()
    }

    // 如果有活动组，优先执行活动组的命令
    if (this.activeGroupId) {
      const activeCommand = commandList.find((cmd) => cmd.groupId === this.activeGroupId)
      if (activeCommand) {
        try {
          const result = activeCommand.handler(...args)
          return result instanceof Promise ? result : Promise.resolve()
        } catch (error) {
          console.error(`Command '${id}' failed:`, error)
          return Promise.reject(error)
        }
      }

      // 活动组没有该命令，发出警告
      console.warn(
        `Command '${id}' not found in active group '${this.activeGroupId}', falling back to first available`
      )
    }

    // 如果没有活动组或活动组没有该命令，执行第一个可用的命令
    const command = commandList[0]
    try {
      const result = command.handler(...args)
      return result instanceof Promise ? result : Promise.resolve()
    } catch (error) {
      console.error(`Command '${id}' failed:`, error)
      return Promise.reject(error)
    }
  }

  hasCommand(id: string): boolean {
    const list = this.commands.get(id)
    return list !== undefined && list.length > 0
  }

  getAllCommands(): string[] {
    return Array.from(this.commands.keys())
  }

  getCommandsByGroup(groupId: string): string[] {
    const result: string[] = []
    this.commands.forEach((list, id) => {
      if (list.some((cmd) => cmd.groupId === groupId)) {
        result.push(id)
      }
    })
    return result
  }

  unregisterByGroup(groupId: string): void {
    this.commands.forEach((list, id) => {
      const filtered = list.filter((cmd) => cmd.groupId !== groupId)
      if (filtered.length === 0) {
        this.commands.delete(id)
      } else if (filtered.length !== list.length) {
        this.commands.set(id, filtered)
      }
    })
  }
}

export const commandService = new CommandService()

// 常用命令 ID
export const Commands = {
  // 编辑
  UNDO: 'editor.undo',
  REDO: 'editor.redo',
  CUT: 'editor.cut',
  COPY: 'editor.copy',
  PASTE: 'editor.paste',
  SELECT_ALL: 'editor.selectAll',
  FIND: 'editor.find',

  // 选择
  EXPAND_SELECTION: 'editor.expandSelection',
  SHRINK_SELECTION: 'editor.shrinkSelection',
  SELECT_PARAGRAPH: 'editor.selectParagraph',
  CURSOR_UP: 'editor.cursorUp',
  CURSOR_DOWN: 'editor.cursorDown',
  CURSOR_LEFT: 'editor.cursorLeft',
  CURSOR_RIGHT: 'editor.cursorRight',

  // 文件
  SAVE: 'file.save',
  NEW_FOLDER: 'file.newFolder',
  NEW_CHAPTER: 'file.newChapter',

  // 导航
  NAV_BACK: 'navigation.back',
  NAV_FORWARD: 'navigation.forward',

  // 视图
  ZEN_MODE: 'view.zenMode',

  // 快速打开
  QUICK_OPEN: 'workbench.quickOpen'
} as const
