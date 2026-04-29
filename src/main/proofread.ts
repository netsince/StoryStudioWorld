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

// 常见英文拼写错误映射表
const commonEnglishMisspellings: Record<string, string> = {
  tha: 'the',
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
  independant: 'independent',
  occasion: 'occasion',
  sucessful: 'successful',
  untill: 'until',
  writting: 'writing',
  elethion: 'election',
  micorosoft: 'microsoft',
  aple: 'apple',
  gogle: 'google',
  facebok: 'facebook',
  twiter: 'twitter',
  instgram: 'instagram'
}

// 中文错词检测规则
const commonMistakes = [
  { pattern: /[的得地]/g, message: '检查「的/得/地」使用是否正确', suggestion: '的+名词，地+动词，得+形容词' },
  { pattern: /[做作](?:法|为|业|事)/g, message: '检查「做/作」使用是否正确', suggestion: '做+具体动作，作+抽象行为' },
  { pattern: /[再在]见/g, message: '检查「再/在」使用是否正确', suggestion: '再见=再次见面，在见=正在见面' },
  { pattern: /以[经径]/g, message: '应该是「已经」', suggestion: '已经' },
  { pattern: /[坐座]位/g, message: '应该是「座位」', suggestion: '座位' },
  { pattern: /[那哪]里/g, message: '检查「那/哪」使用是否正确', suggestion: '那里=指示，哪里=疑问' },
  { pattern: /[在再]说/g, message: '检查「在/再」使用是否正确', suggestion: '再说=再一次说，在说=正在说' },
  { pattern: /[到道]理/g, message: '应该是「道理」', suggestion: '道理' },
  { pattern: /[对队]伍/g, message: '应该是「队伍」', suggestion: '队伍' },
  { pattern: /[长常]年/g, message: '检查「长/常」使用是否正确', suggestion: '常年=经常，长年=长期' }
]

// 重复字符检测正则
const duplicatePatterns = [
  /([\u4e00-\u9fa5])\1{2,}/g, // 中文重复3次以上
  /(\w)\1{3,}/gi // 英文重复4次以上
]

// 标点符号检查
const punctuationIssues = [
  { pattern: /,{2,}/g, message: '多余的逗号', suggestion: '使用单个逗号' },
  { pattern: /。{2,}/g, message: '多余的句号', suggestion: '使用单个句号' },
  { pattern: /!{2,}/g, message: '多余的感叹号', suggestion: '使用单个感叹号' },
  { pattern: /\?{2,}/g, message: '多余的问号', suggestion: '使用单个问号' },
  { pattern: /[\u4e00-\u9fa5][,.!?](?!\s)/g, message: '中文标点后面建议加空格', suggestion: '在标点后添加空格' },
  { pattern: /\s+[，。！？]/g, message: '标点符号前不应有空格', suggestion: '删除空格' }
]

// 常见英文单词列表（用于检测拼写错误）
const commonEnglishWords = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'is', 'are', 'was', 'were', 'been', 'has', 'had', 'did', 'does', 'doing',
  'done', 'apple', 'microsoft', 'google', 'amazon', 'facebook', 'twitter',
  'election', 'selection', 'collection', 'connection', 'protection', 'section'
])

function generateId(): string {
  return `issue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function getLineColumn(text: string, position: number): { line: number; column: number } {
  const lines = text.substring(0, position).split('\n')
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  }
}

// 编辑距离算法（Levenshtein Distance）
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

// 找最接近的单词
function findClosestWord(word: string): string | null {
  const lowerWord = word.toLowerCase()
  
  // 首先检查常见错误映射
  if (commonEnglishMisspellings[lowerWord]) {
    return commonEnglishMisspellings[lowerWord]
  }
  
  // 使用编辑距离找最接近的词
  let minDistance = Infinity
  let closestWord: string | null = null
  
  for (const dictWord of commonEnglishWords) {
    // 只比较长度相近的词
    if (Math.abs(dictWord.length - lowerWord.length) > 2) continue
    
    const distance = levenshteinDistance(lowerWord, dictWord)
    if (distance < minDistance && distance <= 2) {
      minDistance = distance
      closestWord = dictWord
    }
  }
  
  return closestWord
}

async function checkEnglishSpelling(text: string): Promise<ProofreadIssue[]> {
  const issues: ProofreadIssue[] = []
  
  // 提取所有英文单词
  const words = text.match(/\b[a-zA-Z]+\b/g) || []
  
  for (const word of words) {
    const lowerWord = word.toLowerCase()
    
    // 跳过常见单词
    if (commonEnglishWords.has(lowerWord)) continue
    
    // 检查是否是已知错误
    const suggestion = findClosestWord(word)
    
    if (suggestion) {
      const index = text.toLowerCase().indexOf(lowerWord)
      if (index !== -1) {
        const { line, column } = getLineColumn(text, index)
        issues.push({
          id: generateId(),
          type: 'spelling',
          message: `英文拼写错误: "${word}"`,
          suggestion: `建议改为: "${suggestion}"`,
          start: index,
          end: index + word.length,
          line,
          column,
          severity: 'error'
        })
      }
    }
  }

  return issues
}

function checkChineseErrors(text: string): ProofreadIssue[] {
  const issues: ProofreadIssue[] = []

  commonMistakes.forEach(({ pattern, message, suggestion }) => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const { line, column } = getLineColumn(text, match.index)
      issues.push({
        id: generateId(),
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

function checkDuplicates(text: string): ProofreadIssue[] {
  const issues: ProofreadIssue[] = []

  duplicatePatterns.forEach((pattern) => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const { line, column } = getLineColumn(text, match.index)
      issues.push({
        id: generateId(),
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

function checkPunctuation(text: string): ProofreadIssue[] {
  const issues: ProofreadIssue[] = []

  punctuationIssues.forEach(({ pattern, message, suggestion }) => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const { line, column } = getLineColumn(text, match.index)
      issues.push({
        id: generateId(),
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

export async function proofreadText(text: string): Promise<ProofreadResult> {
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
  const englishIssues = await checkEnglishSpelling(text)
  issues.push(...englishIssues)
  issues.push(...checkChineseErrors(text))
  issues.push(...checkDuplicates(text))
  issues.push(...checkPunctuation(text))

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
