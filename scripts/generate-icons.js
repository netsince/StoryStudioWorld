const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const pngToIco = require('png-to-ico').default
const png2icons = require('png2icons')

const svgPath = path.join(__dirname, '../src/renderer/src/assets/ssworld.svg')
const buildDir = path.join(__dirname, '../build')

// 确保 build 目录存在
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true })
}

async function generateIcons() {
  try {
    // 读取 SVG 文件
    const svgBuffer = fs.readFileSync(svgPath)

    // 1. 生成 PNG (1024x1024) - 用于 Linux 和作为中间文件
    console.log('Generating PNG...')
    const pngBuffer = await sharp(svgBuffer)
      .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuffer)
    console.log('✓ build/icon.png generated')

    // 2. 生成 ICO (Windows) - 需要多种尺寸
    console.log('Generating ICO...')
    const sizes = [16, 32, 48, 64, 128, 256]
    const pngBuffers = await Promise.all(
      sizes.map(async (size) => {
        return await sharp(svgBuffer)
          .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()
      })
    )

    const icoBuffer = await pngToIco(pngBuffers)
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer)
    console.log('✓ build/icon.ico generated')

    // 3. 生成 ICNS (macOS)
    console.log('Generating ICNS...')
    const icnsBuffer = png2icons.createICNS(pngBuffer, png2icons.BICUBIC, 0)
    if (icnsBuffer) {
      fs.writeFileSync(path.join(buildDir, 'icon.icns'), icnsBuffer)
      console.log('✓ build/icon.icns generated')
    } else {
      console.error('Failed to generate ICNS')
    }

    console.log('\nAll icons generated successfully!')
  } catch (error) {
    console.error('Error generating icons:', error)
    process.exit(1)
  }
}

generateIcons()
