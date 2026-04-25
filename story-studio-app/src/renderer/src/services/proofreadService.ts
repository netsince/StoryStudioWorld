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

export interface ProofreadResult {
  issues: ProofreadIssue[]
  stats: {
    totalIssues: number
    errorCount: number
    warningCount: number
    infoCount: number
  }
}

// 常见英文拼写错误词典
const commonEnglishMisspellings: Record<string, string> = {
  teh: 'the',
  adn: 'and',
  nad: 'and',
  hte: 'the',
  wiht: 'with',
  tihs: 'this',
  ot: 'to',
  fro: 'for',
  yuo: 'you',
  ist: 'its',
  ti: 'it',
  waht: 'what',
  whehn: 'when',
  wherre: 'where',
  wehre: 'where',
  thier: 'their',
  recieve: 'receive',
  beleive: 'believe',
  ocurred: 'occurred',
  seprate: 'separate',
  definate: 'definite',
  gavernment: 'government',
  independent: 'independent',
  occasion: 'occasion',
  sucessful: 'successful',
  untill: 'until',
  writting: 'writing'
}

// 重复字符检测正则
const duplicatePatterns = [
  /([\u4e00-\u9fa5])\1{2,}/g, // 中文重复3次以上
  /(\w)\1{3,}/gi // 英文重复4次以上
]

// 常见错词检测
const commonMistakes = [
  { pattern: /[的得地]/g, message: '检查「的/得/地」使用是否正确', suggestion: '的+名词，地+动词，得+形容词' },
  { pattern: /[做作](?:法|为|业|事)/g, message: '检查「做/作」使用是否正确', suggestion: '做+具体动作，作+抽象行为' },
  { pattern: /[再在]见/g, message: '检查「再/在」使用是否正确', suggestion: '再见=再次见面，在见=正在见面' },
  { pattern: /以[经径]/g, message: '应该是「已经」', suggestion: '已经' },
  { pattern: /[坐座]位/g, message: '应该是「座位」', suggestion: '座位' },
  { pattern: /[那哪]里/g, message: '检查「那/哪」使用是否正确', suggestion: '那里=指示，哪里=疑问' }
]

// 标点符号检查
const punctuationIssues = [
  { pattern: /,{2,}/g, message: '多余的逗号', suggestion: '使用单个逗号' },
  { pattern: /。{2,}/g, message: '多余的句号', suggestion: '使用单个句号' },
  { pattern: /!{2,}/g, message: '多余的感叹号', suggestion: '使用单个感叹号' },
  { pattern: /\?{2,}/g, message: '多余的问号', suggestion: '使用单个问号' },
  { pattern: /,{2,}/g, message: '多余的逗号', suggestion: '使用单个逗号' },
  { pattern: /[\u4e00-\u9fa5][,.!?](?!\s)/g, message: '中文标点后面建议加空格', suggestion: '在标点后添加空格' },
  { pattern: /\s+[，。！？]/g, message: '标点符号前不应有空格', suggestion: '删除空格' }
]

class ProofreadService {
  private generateId(): string {
    return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getLineColumn(text: string, position: number): { line: number; column: number } {
    const lines = text.substring(0, position).split('\n')
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    }
  }

  private checkEnglishSpelling(text: string): ProofreadIssue[] {
    const issues: ProofreadIssue[] = []
    const words = text.match(/\b[a-zA-Z]+\b/g) || []

    words.forEach((word) => {
      const lowerWord = word.toLowerCase()
      if (commonEnglishMisspellings[lowerWord]) {
        const index = text.toLowerCase().indexOf(lowerWord)
        if (index !== -1) {
          const { line, column } = this.getLineColumn(text, index)
          issues.push({
            id: this.generateId(),
            type: 'spelling',
            message: `英文拼写错误: "${word}"`,
            suggestion: commonEnglishMisspellings[lowerWord],
            start: index,
            end: index + word.length,
            line,
            column,
            severity: 'error'
          })
        }
      }
    })

    return issues
  }

  private checkChineseErrors(text: string): ProofreadIssue[] {
    const issues: ProofreadIssue[] = []

    commonMistakes.forEach(({ pattern, message, suggestion }) => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const { line, column } = this.getLineColumn(text, match.index)
        issues.push({
          id: this.generateId(),
          type: 'grammar',
          message,
          suggestion,
          start: match.index,
          end: match.index + match[0].length,
          line,
          column,
          severity: 'warning'
        })
      }
    })

    return issues
  }

  private checkDuplicates(text: string): ProofreadIssue[] {
    const issues: ProofreadIssue[] = []

    duplicatePatterns.forEach((pattern) => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const { line, column } = this.getLineColumn(text, match.index)
        issues.push({
          id: this.generateId(),
          type: 'duplicate',
          message: `发现重复字符: "${match[0]}"`,
          suggestion: '删除多余的重复字符',
          start: match.index,
          end: match.index + match[0].length,
          line,
          column,
          severity: 'warning'
        })
      }
    })

    return issues
  }

  private checkPunctuation(text: string): ProofreadIssue[] {
    const issues: ProofreadIssue[] = []

    punctuationIssues.forEach(({ pattern, message, suggestion }) => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const { line, column } = this.getLineColumn(text, match.index)
        issues.push({
          id: this.generateId(),
          type: 'punctuation',
          message,
          suggestion,
          start: match.index,
          end: match.index + match[0].length,
          line,
          column,
          severity: 'info'
        })
      }
    })

    return issues
  }

  public proofread(text: string): ProofreadResult {
    const issues: ProofreadIssue[] = []

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

    // 执行各种检查
    issues.push(...this.checkEnglishSpelling(text))
    issues.push(...this.checkChineseErrors(text))
    issues.push(...this.checkDuplicates(text))
    issues.push(...this.checkPunctuation(text))

    // 按位置排序
    issues.sort((a, b) => a.start - b.start)

    // 统计
    const errorCount = issues.filter((i) => i.severity === 'error').length
    const warningCount = issues.filter((i) => i.severity === 'warning').length
    const infoCount = issues.filter((i) => i.severity === 'info').length

    return {
      issues,
      stats: {
        totalIssues: issues.length,
        errorCount,
        warningCount,
        infoCount
      }
    }
  }

  // 快速检查单行文本
  public quickCheck(line: string, lineNumber: number): ProofreadIssue[] {
    const issues: ProofreadIssue[] = []

    // 英文拼写检查
    const words = line.match(/\b[a-zA-Z]+\b/g) || []
    words.forEach((word) => {
      const lowerWord = word.toLowerCase()
      if (commonEnglishMisspellings[lowerWord]) {
        const index = line.toLowerCase().indexOf(lowerWord)
        issues.push({
          id: this.generateId(),
          type: 'spelling',
          message: `英文拼写错误: "${word}"`,
          suggestion: commonEnglishMisspellings[lowerWord],
          start: index,
          end: index + word.length,
          line: lineNumber,
          column: index + 1,
          severity: 'error'
        })
      }
    })

    // 中文检查
    commonMistakes.forEach(({ pattern, message, suggestion }) => {
      let match
      const linePattern = new RegExp(pattern.source, pattern.flags)
      while ((match = linePattern.exec(line)) !== null) {
        issues.push({
          id: this.generateId(),
          type: 'grammar',
          message,
          suggestion,
          start: match.index,
          end: match.index + match[0].length,
          line: lineNumber,
          column: match.index + 1,
          severity: 'warning'
        })
      }
    })

    // 重复字符检查
    duplicatePatterns.forEach((pattern) => {
      let match
      const linePattern = new RegExp(pattern.source, pattern.flags)
      while ((match = linePattern.exec(line)) !== null) {
        issues.push({
          id: this.generateId(),
          type: 'duplicate',
          message: `发现重复字符: "${match[0]}"`,
          suggestion: '删除多余的重复字符',
          start: match.index,
          end: match.index + match[0].length,
          line: lineNumber,
          column: match.index + 1,
          severity: 'warning'
        })
      }
    })

    return issues
  }
}

export const proofreadService = new ProofreadService()
