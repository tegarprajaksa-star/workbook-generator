// SVG to PNG renderer using sharp (librsvg).
// Uses DejaVu Sans font (installed on all Linux systems) for reliable text rendering.
// All emoji/special characters should already be stripped from the SVG before rendering.

import sharp from 'sharp'

/**
 * Render an SVG string to a PNG buffer using sharp.
 * Reliable, fast, no browser dependency.
 */
export async function renderSvgToPng(
  svg: string,
  options: { scale?: number } = {}
): Promise<Buffer> {
  const scale = options.scale || 2
  // Parse width/height from SVG
  const widthMatch = svg.match(/width="(\d+)"/)
  const heightMatch = svg.match(/height="(\d+)"/)
  const w = widthMatch ? parseInt(widthMatch[1]) : 800
  const h = heightMatch ? parseInt(heightMatch[1]) : 400

  // Use high density for crisp text, then resize to target
  const density = 144 * scale // 144 DPI base * scale
  const pngBuffer = await sharp(Buffer.from(svg), { density })
    .resize({ width: Math.round(w * scale), height: Math.round(h * scale), fit: 'fill' })
    .png()
    .toBuffer()

  return pngBuffer
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
