import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pngToIco from 'png-to-ico'
import * as png2icons from 'png2icons'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const svgPath = path.join(__dirname, '../src/renderer/src/assets/ssworld.svg')
const buildDir = path.join(__dirname, '../build')

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true })
}

async function generateIcons() {
  try {
    const svgBuffer = fs.readFileSync(svgPath)

    console.log('Generating PNG...')
    const pngBuffer = await sharp(svgBuffer)
      .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuffer)
    console.log('✓ build/icon.png generated')

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
