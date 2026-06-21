// SVG to PNG renderer using @resvg/resvg-js (pure Rust, no system dependencies).
// Loads DejaVu Sans font explicitly from project assets to guarantee text rendering
// in all environments (including production where system fonts may not be accessible).

import { Resvg } from '@resvg/resvg-js'
import { join } from 'path'

const FONT_DIR = join(process.cwd(), 'assets', 'fonts')

/**
 * Render an SVG string to a PNG buffer using resvg.
 * Fonts are loaded explicitly from project assets for reliability.
 */
export async function renderSvgToPng(
  svg: string,
  options: { scale?: number } = {}
): Promise<Buffer> {
  const scale = options.scale || 2
  const widthMatch = svg.match(/width="(\d+)"/)
  const targetWidth = widthMatch ? parseInt(widthMatch[1]) * scale : 1400

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: targetWidth },
    font: {
      // Don't scan system fonts (unreliable in production/headless environments).
      // Instead, load DejaVu Sans explicitly from project assets.
      loadSystemFonts: false,
      fontFiles: [
        join(FONT_DIR, 'DejaVuSans.ttf'),
        join(FONT_DIR, 'DejaVuSans-Bold.ttf'),
      ],
      defaultFontFamily: 'DejaVu Sans',
      defaultFontSize: 12,
    },
  })

  const pngBuffer = resvg.render().asPng()
  return Buffer.from(pngBuffer)
}

// Batch render multiple SVGs
export async function renderSvgsToPngs(
  svgs: string[],
  options: { scale?: number } = {}
): Promise<Buffer[]> {
  const results: Buffer[] = []
  for (const svg of svgs) {
    results.push(await renderSvgToPng(svg, options))
  }
  return results
}
