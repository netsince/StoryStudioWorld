// 简单的命令服务，类似 VS Code 的 CommandsRegistry

type CommandHandler = (...args: unknown[]) => void | Promise<void>

interface Command {
  id: string
  handler: CommandHandler
}

class CommandService {
  private commands = new Map<string, Command>()

  registerCommand(id: string, handler: CommandHandler): () => void {
    this.commands.set(id, { id, handler })
    return () => {
      this.commands.delete(id)
    }
  }

  executeCommand(id: string, ...args: unknown[]): Promise<void> {
    const command = this.commands.get(id)
    if (command) {
      try {
        const result = command.handler(...args)
        return result instanceof Promise ? result : Promise.resolve()
      } catch (error) {
        console.error(`Command '${id}' failed:`, error)
        return Promise.reject(error)
      }
    } else {
      console.warn(`Command '${id}' not found`)
      return Promise.resolve()
    }
  }

  hasCommand(id: string): boolean {
    return this.commands.has(id)
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
} as const
