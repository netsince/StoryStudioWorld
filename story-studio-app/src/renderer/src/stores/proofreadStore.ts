import { create } from 'zustand'
import { proofreadService, type ProofreadResult } from '../services/proofreadService'

interface ProofreadState {
  // 当前检查结果
  result: ProofreadResult | null
  // 是否正在检查
  isChecking: boolean
  // 当前选中的问题
  selectedIssueId: string | null
  // 自动检查开关
  autoCheck: boolean
  // 最后检查时间
  lastCheckTime: number | null
  // 忽略的词汇列表
  ignoredWords: string[]

  // Actions
  checkText: (text: string) => void
  checkTextAsync: (text: string) => Promise<void>
  selectIssue: (issueId: string | null) => void
  clearResult: () => void
  setAutoCheck: (enabled: boolean) => void
  toggleAutoCheck: () => void
  addIgnoredWord: (word: string) => void
  removeIgnoredWord: (word: string) => void
  refreshCheck: (getCurrentText: () => string) => void
}

export const useProofreadStore = create<ProofreadState>((set, get) => ({
  result: null,
  isChecking: false,
  selectedIssueId: null,
  autoCheck: true,
  lastCheckTime: null,
  ignoredWords: [],

  checkText: (text: string) => {
    if (!text || text.trim().length === 0) {
      set({
        result: {
          issues: [],
          stats: {
            totalIssues: 0,
            errorCount: 0,
            warningCount: 0,
            infoCount: 0
          }
        },
        lastCheckTime: Date.now()
      })
      return
    }

    set({ isChecking: true })

    try {
      const result = proofreadService.proofread(text)

      // 过滤掉被忽略的词汇相关的问题
      const { ignoredWords } = get()
      const filteredIssues = result.issues.filter((issue) => {
        const issueText = text.substring(issue.start, issue.end)
        return !ignoredWords.includes(issueText.toLowerCase())
      })

      const filteredResult: ProofreadResult = {
        issues: filteredIssues,
        stats: {
          totalIssues: filteredIssues.length,
          errorCount: filteredIssues.filter((i) => i.severity === 'error').length,
          warningCount: filteredIssues.filter((i) => i.severity === 'warning').length,
          infoCount: filteredIssues.filter((i) => i.severity === 'info').length
        }
      }

      set({
        result: filteredResult,
        isChecking: false,
        lastCheckTime: Date.now()
      })
    } catch (error) {
      console.error('Proofread check failed:', error)
      set({ isChecking: false })
    }
  },

  checkTextAsync: async (text: string) => {
    get().checkText(text)
  },

  selectIssue: (issueId: string | null) => {
    set({ selectedIssueId: issueId })
  },

  clearResult: () => {
    set({
      result: null,
      selectedIssueId: null,
      lastCheckTime: null
    })
  },

  setAutoCheck: (enabled: boolean) => {
    set({ autoCheck: enabled })
  },

  toggleAutoCheck: () => {
    set((state) => ({ autoCheck: !state.autoCheck }))
  },

  addIgnoredWord: (word: string) => {
    set((state) => ({
      ignoredWords: [...state.ignoredWords, word.toLowerCase()]
    }))
  },

  removeIgnoredWord: (word: string) => {
    set((state) => ({
      ignoredWords: state.ignoredWords.filter((w) => w !== word.toLowerCase())
    }))
  },

  refreshCheck: (getCurrentText: () => string) => {
    const { autoCheck } = get()
    if (autoCheck) {
      const text = getCurrentText()
      get().checkText(text)
    }
  }
}))
