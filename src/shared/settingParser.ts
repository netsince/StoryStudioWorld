export interface SettingSection {
  level: number
  title: string
  content: string
  id: string
}

export interface ParsedSetting {
  sections: SettingSection[]
  rawContent: string
}

let sectionIdCounter = 0

export function parseSettingSections(content: string): ParsedSetting {
  if (!content) {
    return { sections: [], rawContent: '' }
  }

  const lines = content.split('\n')
  const sections: SettingSection[] = []
  let currentSection: SettingSection | null = null
  let currentContent: string[] = []

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)$/)
    const h2Match = line.match(/^##\s+(.+)$/)

    if (h1Match || h2Match) {
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim()
        sections.push(currentSection)
      }

      const level = h1Match ? 1 : 2
      const title = (h1Match || h2Match)![1].trim()

      currentSection = {
        level,
        title,
        content: '',
        id: `section-${++sectionIdCounter}`
      }
      currentContent = []
    } else if (currentSection) {
      currentContent.push(line)
    }
  }

  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim()
    sections.push(currentSection)
  }

  return { sections, rawContent: content }
}

export function buildSettingFromSections(sections: SettingSection[]): string {
  return sections
    .map((section) => {
      const prefix = section.level === 1 ? '# ' : '## '
      return `${prefix}${section.title}\n${section.content}`
    })
    .join('\n\n')
}
