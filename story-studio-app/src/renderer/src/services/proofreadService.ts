import type { ProofreadResult } from '../../../preload'

export type { ProofreadResult }

export interface ProofreadIssue {
  id: string
  type: 'spelling' | 'grammar' | 'style' | 'duplicate' | 'punctuation'
  message: string
  suggestion: string
  start: number
  end: number
  line: number
  column: number
  severity: 'error' | 'warning' | 'info'
}

class ProofreadService {
  // 通过 IPC 调用主进程进行校对
  public async proofread(text: string): Promise<ProofreadResult> {
    if (!text || text.trim().length === 0) {
      return {
        issues: [],
        stats: {
          totalIssues: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0
        }
      }
    }

    try {
      // 通过 IPC 调用主进程
      const result = await window.api.proofreadText(text)
      return result
    } catch (error) {
      console.error('Proofread check failed:', error)
      return {
        issues: [],
        stats: {
          totalIssues: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0
        }
      }
    }
  }
}

export const proofreadService = new ProofreadService()
