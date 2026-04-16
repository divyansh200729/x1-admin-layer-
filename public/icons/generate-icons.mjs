// Run with: node public/icons/generate-icons.mjs
// Generates PNG icons for PWA using canvas
import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

for (const size of sizes) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, '#3B82F6')
  grad.addColorStop(1, '#6366F1')
  ctx.fillStyle = grad

  const radius = size * 0.22
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.quadraticCurveTo(size, 0, size, radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fill()

  // X1 text
  ctx.fillStyle = 'white'
  ctx.font = `bold ${size * 0.42}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('X1', size / 2, size / 2)

  writeFileSync(`public/icons/icon-${size}x${size}.png`, canvas.toBuffer('image/png'))
  console.log(`Generated icon-${size}x${size}.png`)
}
