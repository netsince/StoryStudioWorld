import { writeFileSync, createWriteStream, mkdirSync, existsSync } from 'fs'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import PDFDocument from 'pdfkit'
import archiver from 'archiver'
import { randomBytes } from 'crypto'
import { join } from 'path'
import { platform } from 'os'

export interface ExportContent {
  title: string
  content: string
}

export interface ExportOptions {
  filePath: string
  contents: ExportContent[]
  projectName?: string
}

function parseMarkdownToParagraphs(markdown: string): Paragraph[] {
  const lines = markdown.split('\n')
  const paragraphs: Paragraph[] = []
  let inCodeBlock = false
  let codeBlockContent: string[] = []

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: codeBlockContent.join('\n'),
                font: 'Courier New',
                size: 20
              })
            ],
            spacing: { before: 120, after: 120 }
          })
        )
        codeBlockContent = []
      }
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    if (line.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 }
        })
      )
    } else if (line.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        })
      )
    } else if (line.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 }
        })
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(2),
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 }
        })
      )
    } else if (line.match(/^\d+\. /)) {
      paragraphs.push(
        new Paragraph({
          text: line.replace(/^\d+\. /, ''),
          numbering: { reference: 'default', level: 0 },
          spacing: { before: 60, after: 60 }
        })
      )
    } else if (line.trim()) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 24
            })
          ],
          spacing: { before: 60, after: 60 }
        })
      )
    }
  }

  return paragraphs
}

export async function exportToDocx(options: ExportOptions): Promise<void> {
  const { filePath, contents, projectName } = options

  const children: Paragraph[] = []

  if (projectName) {
    children.push(
      new Paragraph({
        text: projectName,
        heading: HeadingLevel.TITLE,
        spacing: { before: 0, after: 400 }
      })
    )
  }

  for (const item of contents) {
    children.push(
      new Paragraph({
        text: item.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        pageBreakBefore: children.length > 0
      })
    )

    const paragraphs = parseMarkdownToParagraphs(item.content)
    children.push(...paragraphs)
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children
      }
    ]
  })

  const buffer = await Packer.toBuffer(doc)
  writeFileSync(filePath, buffer)
}

// 系统字体文件路径（优先使用编辑器同款字体，按优先级排序）
function getSystemFontPaths(): string[] {
  const sysPlatform = platform()

  if (sysPlatform === 'win32') {
    return [
      'C:/Windows/Fonts/simsun.ttc',      // 宋体
      'C:/Windows/Fonts/simhei.ttf',      // 黑体
      'C:/Windows/Fonts/msyh.ttc',        // 微软雅黑
      'C:/Windows/Fonts/msyhl.ttc',       // 微软雅黑 Light
      'C:/Windows/Fonts/simkai.ttf',      // 楷体
      'C:/Windows/Fonts/simfang.ttf'      // 仿宋
    ]
  } else if (sysPlatform === 'darwin') {
    return [
      '/System/Library/Fonts/PingFang.ttc',           // 苹方
      '/System/Library/Fonts/STHeiti Light.ttc',      // 黑体
      '/System/Library/Fonts/STHeiti Medium.ttc',
      '/System/Library/Fonts/STSong Light.ttc',       // 宋体
      '/Library/Fonts/Arial Unicode.ttf',             // Arial Unicode
      '/System/Library/Fonts/Hiragino Sans GB.ttc'    // 冬青黑体
    ]
  } else {
    // Linux
    return [
      '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',     // 文泉驿正黑
      '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',   // 文泉驿微米黑
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',  // Noto Sans CJK
      '/usr/share/fonts/truetype/noto/NotoSerifCJK-Regular.ttc', // Noto Serif CJK
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    ]
  }
}

// 查找可用的中文字体
function findChineseFont(): string | null {
  const fontPaths = getSystemFontPaths()
  for (const fontPath of fontPaths) {
    if (existsSync(fontPath)) {
      return fontPath
    }
  }
  return null
}

export async function exportToPdf(options: ExportOptions): Promise<void> {
  const { filePath, contents, projectName } = options

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument()
    const stream = createWriteStream(filePath)

    stream.on('finish', () => resolve())
    stream.on('error', reject)
    doc.on('error', reject)

    doc.pipe(stream)

    // 注册中文字体
    const chineseFontPath = findChineseFont()
    if (chineseFontPath) {
      try {
        doc.registerFont('ChineseFont', chineseFontPath)
      } catch (e) {
        console.warn('Failed to register Chinese font:', e)
      }
    }

    // 设置默认字体（优先使用注册的中文字体，否则使用 Helvetica 兜底）
    const hasChineseFont = chineseFontPath !== null

    if (projectName) {
      doc.font(hasChineseFont ? 'ChineseFont' : 'Helvetica')
      doc.fontSize(24).text(projectName, { align: 'center' })
      doc.moveDown(2)
    }

    for (let i = 0; i < contents.length; i++) {
      const item = contents[i]

      if (i > 0) {
        doc.addPage()
      }

      doc.font(hasChineseFont ? 'ChineseFont' : 'Helvetica-Bold')
      doc.fontSize(18).text(item.title, { align: 'left' })
      doc.moveDown()

      doc.font(hasChineseFont ? 'ChineseFont' : 'Helvetica')
      const lines = item.content.split('\n')
      for (const line of lines) {
        if (line.startsWith('# ')) {
          doc.font(hasChineseFont ? 'ChineseFont' : 'Helvetica-Bold')
          doc.fontSize(16).text(line.slice(2), { align: 'left' })
          doc.font(hasChineseFont ? 'ChineseFont' : 'Helvetica')
          doc.moveDown(0.5)
        } else if (line.startsWith('## ')) {
          doc.font(hasChineseFont ? 'ChineseFont' : 'Helvetica-Bold')
          doc.fontSize(14).text(line.slice(3), { align: 'left' })
          doc.font(hasChineseFont ? 'ChineseFont' : 'Helvetica')
          doc.moveDown(0.5)
        } else if (line.startsWith('### ')) {
          doc.font(hasChineseFont ? 'ChineseFont' : 'Helvetica-Bold')
          doc.fontSize(12).text(line.slice(4), { align: 'left' })
          doc.font(hasChineseFont ? 'ChineseFont' : 'Helvetica')
          doc.moveDown(0.5)
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          doc.fontSize(11).text('  • ' + line.slice(2), { align: 'left' })
        } else if (line.match(/^\d+\. /)) {
          doc.fontSize(11).text('  ' + line, { align: 'left' })
        } else if (line.trim()) {
          doc.fontSize(11).text(line, { align: 'left', lineGap: 2 })
        } else {
          doc.moveDown(0.3)
        }
      }
    }

    doc.end()
  })
}

export async function exportToEpub(options: ExportOptions): Promise<void> {
  const { filePath, contents, projectName } = options
  const title = projectName || 'Exported Story'
  const uuid = randomBytes(16).toString('hex')

  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } })
    const output = createWriteStream(filePath)

    output.on('close', () => resolve())
    archive.on('error', reject)
    output.on('error', reject)

    archive.pipe(output)

    archive.append('application/epub+zip', { name: 'mimetype', store: true })

    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    archive.append(containerXml, { name: 'META-INF/container.xml' })

    let manifestItems = ''
    let spineItems = ''
    const chapters: { name: string; content: string }[] = []

    contents.forEach((item, index) => {
      const chapterId = `chapter${index + 1}`
      const chapterFile = `${chapterId}.xhtml`

      manifestItems += `    <item id="${chapterId}" href="${chapterFile}" media-type="application/xhtml+xml"/>\n`
      spineItems += `    <itemref idref="${chapterId}"/>\n`

      const htmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeHtml(item.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h1>${escapeHtml(item.title)}</h1>
  ${markdownToHtml(item.content)}
</body>
</html>`

      chapters.push({ name: `OEBPS/${chapterFile}`, content: htmlContent })
    })

    const opfContent = `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>zh-CN</dc:language>
    <dc:identifier id="BookId">urn:uuid:${uuid}</dc:identifier>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="styles.css" media-type="text/css"/>
${manifestItems}  </manifest>
  <spine>
    <itemref idref="toc"/>
${spineItems}  </spine>
</package>`

    archive.append(opfContent, { name: 'OEBPS/content.opf' })

    let tocNav = ''
    contents.forEach((item, index) => {
      tocNav += `    <li><a href="chapter${index + 1}.xhtml">${escapeHtml(item.title)}</a></li>\n`
    })

    const tocContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Table of Contents</title>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>目录</h1>
    <ol>
${tocNav}    </ol>
  </nav>
</body>
</html>`

    archive.append(tocContent, { name: 'OEBPS/toc.xhtml' })

    const cssContent = `body {
  font-family: serif;
  line-height: 1.6;
  margin: 1em;
}
h1 {
  font-size: 1.5em;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}
h2 {
  font-size: 1.3em;
  margin-top: 1.2em;
  margin-bottom: 0.5em;
}
h3 {
  font-size: 1.1em;
  margin-top: 1em;
  margin-bottom: 0.5em;
}
p {
  margin: 0.5em 0;
  text-indent: 2em;
}
pre {
  background: #f5f5f5;
  padding: 1em;
  overflow-x: auto;
  white-space: pre-wrap;
}`

    archive.append(cssContent, { name: 'OEBPS/styles.css' })

    for (const chapter of chapters) {
      archive.append(chapter.content, { name: chapter.name })
    }

    archive.finalize()
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeXml(text: string): string {
  return escapeHtml(text).replace(/'/g, '&apos;')
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n')
  let html = ''
  let inCodeBlock = false
  let codeBlockContent: string[] = []

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre><code>${escapeHtml(codeBlockContent.join('\n'))}</code></pre>\n`
        codeBlockContent = []
      }
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    if (line.startsWith('# ')) {
      html += `<h1>${escapeHtml(line.slice(2))}</h1>\n`
    } else if (line.startsWith('## ')) {
      html += `<h2>${escapeHtml(line.slice(3))}</h2>\n`
    } else if (line.startsWith('### ')) {
      html += `<h3>${escapeHtml(line.slice(4))}</h3>\n`
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      html += `<p>• ${escapeHtml(line.slice(2))}</p>\n`
    } else if (line.match(/^\d+\. /)) {
      html += `<p>${escapeHtml(line)}</p>\n`
    } else if (line.trim()) {
      html += `<p>${escapeHtml(line)}</p>\n`
    } else {
      html += '<br/>\n'
    }
  }

  return html
}

export function exportToTxt(filePath: string, contents: ExportContent[]): void {
  let text = ''

  for (const item of contents) {
    text += `${item.title}\n`
    text += '='.repeat(item.title.length) + '\n\n'
    text += item.content + '\n\n'
  }

  writeFileSync(filePath, text, 'utf-8')
}

export function exportToMarkdown(filePath: string, contents: ExportContent[]): void {
  let markdown = ''

  for (const item of contents) {
    markdown += `# ${item.title}\n\n`
    markdown += item.content + '\n\n'
  }

  writeFileSync(filePath, markdown, 'utf-8')
}

export interface WikiNode {
  id: string
  parentId: string | null
  name: string
  type: 'folder' | 'file'
  kind: 'story' | 'setting'
  content: string | null
  summary: string | null
  outline: string | null
  sortOrder: number
}

export interface WikiExportOptions {
  exportPath: string
  projectName: string
  nodes: WikiNode[]
  language: string
}

const WIKI_I18N: Record<string, Record<string, string>> = {
  'zh-CN': {
    tableOfContents: '目录',
    story: '故事',
    setting: '设定',
    backToIndex: '返回目录',
    summary: '简概',
    outline: '章纲',
    noContent: '暂无内容',
    projectWiki: '项目维基'
  },
  'en': {
    tableOfContents: 'Table of Contents',
    story: 'Story',
    setting: 'Setting',
    backToIndex: 'Back to Index',
    summary: 'Summary',
    outline: 'Outline',
    noContent: 'No content yet',
    projectWiki: 'Project Wiki'
  }
}

function getWikiI18n(lang: string): Record<string, string> {
  return WIKI_I18N[lang] || WIKI_I18N['en'] || WIKI_I18N['zh-CN']
}

function getWikiCss(): string {
  return `body {
  margin: 0;
  background: #1e1e1e;
  color: #ccc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
}
a { color: #3498db; text-decoration: none; }
a:hover { text-decoration: underline; }
ul { list-style: none; padding-left: 0; }
ul ul { padding-left: 24px; border-left: 1px solid #444; margin-left: 8px; }`
}

function buildWikiTreeHtml(
  nodes: WikiNode[],
  parentId: string | null,
  i18n: Record<string, string>
): string {
  const children = nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (children.length === 0) return ''

  let html = '<ul>\n'

  for (const node of children) {
    if (node.type === 'folder') {
      html += '<li>\n'
      html += `<div style="font-weight:bold;color:#aaa;font-size:13px;padding:4px 0">${escapeHtml(node.name)}</div>\n`
      const childHtml = buildWikiTreeHtml(nodes, node.id, i18n)
      if (childHtml) {
        html += childHtml
      }
      html += '</li>\n'
    } else {
      html += '<li>\n'
      html += `<a href="${node.id}.html" style="color:#3498db;font-size:14px">${escapeHtml(node.name)}</a>\n`
      html += '</li>\n'
    }
  }

  html += '</ul>\n'
  return html
}

function buildSettingPageHtml(
  node: WikiNode,
  nodes: WikiNode[],
  projectName: string,
  language: string,
  i18n: Record<string, string>
): string {
  let data: Record<string, string> = {}
  try {
    if (node.content) {
      data = JSON.parse(node.content)
    }
  } catch {
    data = {}
  }

  const FIELD_CONFIG: Record<string, { single: string[]; multi: string[] }> = {
    character: {
      single: ['name', 'gender', 'age'],
      multi: ['background', 'motivation', 'arc', 'appearance', 'personality', 'speech', 'skills', 'notes']
    },
    location: {
      single: [],
      multi: ['locationDescription', 'visual', 'auditory', 'olfactory', 'atmosphere', 'danger', 'notes']
    },
    item: {
      single: ['type', 'quality'],
      multi: ['description', 'stats', 'symbolism']
    },
    default: {
      single: [],
      multi: ['description', 'notes']
    }
  }

  const FIELD_LABELS: Record<string, Record<string, string>> = {
    'zh-CN': {
      name: '角色', gender: '性别', age: '年龄', background: '背景经历',
      motivation: '动机目标', arc: '成长弧线', appearance: '外貌描写',
      personality: '性格特征', speech: '说话风格', skills: '能力技能',
      notes: '其他备注', description: '设定描述', locationDescription: '地点描述',
      visual: '视觉', auditory: '听觉', olfactory: '嗅觉', atmosphere: '氛围',
      danger: '危险程度', type: '类型', quality: '品质', stats: '数值属性',
      symbolism: '象征意义'
    },
    'en': {
      name: 'Name', gender: 'Gender', age: 'Age', background: 'Background',
      motivation: 'Motivation', arc: 'Character Arc', appearance: 'Appearance',
      personality: 'Personality', speech: 'Speech Style', skills: 'Skills & Abilities',
      notes: 'Notes', description: 'Description', locationDescription: 'Location Description',
      visual: 'Visual', auditory: 'Auditory', olfactory: 'Olfactory', atmosphere: 'Atmosphere',
      danger: 'Danger Level', type: 'Type', quality: 'Quality', stats: 'Stats',
      symbolism: 'Symbolism'
    }
  }

  const labels = FIELD_LABELS[language] || FIELD_LABELS['en'] || FIELD_LABELS['zh-CN']

  let category = 'default'
  let current = node
  while (current.parentId) {
    const parent = nodes.find((n) => n.id === current.parentId)
    if (!parent) break
    current = parent
  }
  if (current && FIELD_CONFIG[current.name]) {
    category = current.name
  }
  const config = FIELD_CONFIG[category] || FIELD_CONFIG.default

  let infoboxHtml = ''
  if (config.single.length > 0) {
    infoboxHtml = `<aside style="width:280px;background:#2a2a2e;border:1px solid #54595d;padding:8px;font-size:13px;float:right;margin-left:24px;margin-bottom:20px">
      <div style="text-align:center;font-weight:bold;padding:8px;background:#3a3a3e;margin-bottom:8px;border:1px solid #54595d">${escapeHtml(node.name)}</div>
      <table style="width:100%;border-collapse:collapse">
        <tbody>
          ${config.single.map((field) => {
            const val = data[field]
            return `<tr style="border-bottom:1px solid #444">
              <th style="text-align:left;padding:6px 4px;width:35%;vertical-align:top;color:#aaa;font-weight:bold">${labels[field] || field}</th>
              <td style="padding:6px 4px">${val ? escapeHtml(val) : '<span style="color:#666;font-style:italic">' + i18n.noContent + '</span>'}</td>
            </tr>`
          }).join('\n')}
        </tbody>
      </table>
    </aside>`
  }

  let tocHtml = ''
  if (config.multi.length >= 3) {
    tocHtml = `<nav style="background:#2a2a2e;border:1px solid #54595d;padding:12px 20px;margin-bottom:24px;display:inline-block;min-width:200px">
      <div style="font-weight:bold;text-align:center;margin-bottom:10px;font-size:14px">${i18n.tableOfContents}</div>
      <ul style="list-style:none;padding:0;margin:0;font-size:13px;color:#3498db">
        ${config.multi.map((field, index) => `<li style="margin-bottom:4px"><a href="#${field}" style="color:inherit;text-decoration:none"><span style="color:#ccc;margin-right:8px">${index + 1}</span>${labels[field] || field}</a></li>`).join('\n')}
      </ul>
    </nav>`
  }

  const sectionsHtml = config.multi.map((field) => {
    const val = data[field]
    return `<section id="${field}" style="margin-bottom:24px">
      <div style="border-bottom:1px solid #54595d;margin-bottom:12px;padding-bottom:2px">
        <h2 style="margin:0;font-size:22px;font-weight:normal;font-family:'Linux Libertine','Georgia','Times',serif;color:#fff">${labels[field] || field}</h2>
      </div>
      <div style="font-size:14px;white-space:pre-wrap;color:${val ? '#d1d1d1' : '#666'};font-style:${val ? 'normal' : 'italic'}">${val ? escapeHtml(val) : i18n.noContent}</div>
    </section>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="${escapeHtml(language)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(node.name)} - ${escapeHtml(projectName)}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div style="max-width:900px;margin:0 auto;padding:40px 60px">
    <a href="index.html" style="color:#3498db;font-size:13px">← ${i18n.backToIndex}</a>
    <header style="margin-top:16px;margin-bottom:20px;border-bottom:1px solid #54595d;padding-bottom:5px">
      <h1 style="margin:0;font-size:32px;font-weight:normal;font-family:'Linux Libertine','Georgia','Times',serif;color:#fff">${escapeHtml(node.name)}</h1>
    </header>
    <div style="position:relative;display:block">
      ${infoboxHtml}
      <div>
        ${tocHtml}
        ${sectionsHtml}
      </div>
    </div>
  </div>
</body>
</html>`
}

export function exportToWiki(options: WikiExportOptions): void {
  const { exportPath, projectName, nodes, language } = options
  const i18n = getWikiI18n(language)
  const css = getWikiCss()

  if (!existsSync(exportPath)) {
    mkdirSync(exportPath, { recursive: true })
  }

  const indexHtml = `<!DOCTYPE html>
<html lang="${escapeHtml(language)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(projectName)} - ${i18n.tableOfContents}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div style="max-width:900px;margin:0 auto;padding:40px 60px">
    <header style="margin-bottom:20px;border-bottom:1px solid #54595d;padding-bottom:5px">
      <h1 style="margin:0;font-size:32px;font-weight:normal;font-family:'Linux Libertine','Georgia','Times',serif;color:#fff">${escapeHtml(projectName)}</h1>
      <div style="font-size:13px;color:#aaa">${i18n.projectWiki}</div>
    </header>
    ${buildWikiTreeHtml(nodes, null, i18n)}
  </div>
</body>
</html>`

  writeFileSync(join(exportPath, 'index.html'), indexHtml, 'utf-8')
  writeFileSync(join(exportPath, 'style.css'), css, 'utf-8')

  const fileNodes = nodes.filter((n) => n.type === 'file' && n.kind === 'setting')

  for (const node of fileNodes) {
    const pageHtml = buildSettingPageHtml(node, nodes, projectName, language, i18n)
    writeFileSync(join(exportPath, `${node.id}.html`), pageHtml, 'utf-8')
  }
}
