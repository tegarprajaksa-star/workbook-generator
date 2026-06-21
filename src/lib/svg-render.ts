// SVG to PNG renderer using @resvg/resvg-js (pure Rust, no system dependencies).
// Renders text perfectly with system fonts — no garbled/box characters.

import { Resvg } from '@resvg/resvg-js'

/**
 * Render an SVG string to a PNG buffer using resvg.
 * Reliable, fast (~0.1s), renders fonts correctly.
 */
export async function renderSvgToPng(
  svg: string,
  options: { scale?: number } = {}
): Promise<Buffer> {
  const scale = options.scale || 2

  // Parse width/height from SVG for the fitTo calculation
  const widthMatch = svg.match(/width="(\d+)"/)
  const targetWidth = widthMatch ? parseInt(widthMatch[1]) * scale : 1400

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: targetWidth },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'DejaVu Sans',
      family: 'DejaVu Sans',
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
