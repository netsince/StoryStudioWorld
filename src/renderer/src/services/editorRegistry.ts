import type monaco from 'vs/editor/editor.api'

const editors = new Map<string, monaco.editor.IStandaloneCodeEditor>()

export const editorRegistry = {
  register(tabId: string, editor: monaco.editor.IStandaloneCodeEditor): void {
    editors.set(tabId, editor)
  },

  unregister(tabId: string): void {
    editors.delete(tabId)
  },

  get(tabId: string): monaco.editor.IStandaloneCodeEditor | undefined {
    return editors.get(tabId)
  },

  getActive(): monaco.editor.IStandaloneCodeEditor | undefined {
    return editors.values().next().value
  }
}
