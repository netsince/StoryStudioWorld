import { writeFileSync, createWriteStream } from 'fs'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import PDFDocument from 'pdfkit'
import archiver from 'archiver'
import { randomBytes } from 'crypto'

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

export async function exportToPdf(options: ExportOptions): Promise<void> {
  const { filePath, contents, projectName } = options

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument()
    const stream = createWriteStream(filePath)

    stream.on('finish', () => resolve())
    stream.on('error', reject)
    doc.on('error', reject)

    doc.pipe(stream)

    if (projectName) {
      doc.fontSize(24).text(projectName, { align: 'center' })
      doc.moveDown(2)
    }

    for (let i = 0; i < contents.length; i++) {
      const item = contents[i]

      if (i > 0) {
        doc.addPage()
      }

      doc.fontSize(18).text(item.title, { align: 'left' })
      doc.moveDown()

      const lines = item.content.split('\n')
      for (const line of lines) {
        if (line.startsWith('# ')) {
          doc.fontSize(16).text(line.slice(2), { align: 'left' })
          doc.moveDown(0.5)
        } else if (line.startsWith('## ')) {
          doc.fontSize(14).text(line.slice(3), { align: 'left' })
          doc.moveDown(0.5)
        } else if (line.startsWith('### ')) {
          doc.fontSize(12).text(line.slice(4), { align: 'left' })
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
