// Playwright-based SVG to PNG renderer — reliable font rendering using Chromium.
// Use this instead of sharp for SVG→PNG because librsvg (sharp's SVG engine)
// can produce garbled/box characters for text in headless environments.

import { chromium } from 'playwright'

// Cache the browser instance across calls within the same process
let browserPromise: Promise<import('playwright').Browser> | null = null

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
  }
  return browserPromise
}

/**
 * Render an SVG string to a PNG buffer using a headless Chromium browser.
 * Guarantees correct font rendering (no garbled/box characters).
 */
export async function renderSvgToPng(
  svg: string,
  options: { scale?: number } = {}
): Promise<Buffer> {
  const scale = options.scale || 2 // 2x for crisp text
  const browser = await getBrowser()
  const context = await browser.newContext({
    viewport: { width: 2000, height: 1000 },
    deviceScaleFactor: scale,
  })
  const page = await context.newPage()

  // Extract width/height from the SVG (parse from the svg tag attributes)
  const widthMatch = svg.match(/width="(\d+)"/)
  const heightMatch = svg.match(/height="(\d+)"/)
  const w = widthMatch ? parseInt(widthMatch[1]) : 800
  const h = heightMatch ? parseInt(heightMatch[1]) : 400

  await page.setViewportSize({ width: w, height: h })
  await page.setContent(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;}body{background:white;}</style></head><body>${svg}</body></html>`,
    { waitUntil: 'networkidle' }
  )

  // Small delay to ensure fonts are ready
  await page.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve())

  const pngBuffer = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: w, height: h },
    omitBackground: false,
  })

  await context.close()
  return Buffer.from(pngBuffer)
}

/**
 * Render multiple SVGs to PNGs in a single browser session (for performance).
 */
export async function renderSvgsToPngs(
  svgs: string[],
  options: { scale?: number } = {}
): Promise<Buffer[]> {
  const scale = options.scale || 2
  const browser = await getBrowser()
  const context = await browser.newContext({
    viewport: { width: 2000, height: 1000 },
    deviceScaleFactor: scale,
  })
  const page = await context.newPage()

  const results: Buffer[] = []
  for (const svg of svgs) {
    const widthMatch = svg.match(/width="(\d+)"/)
    const heightMatch = svg.match(/height="(\d+)"/)
    const w = widthMatch ? parseInt(widthMatch[1]) : 800
    const h = heightMatch ? parseInt(heightMatch[1]) : 400

    await page.setViewportSize({ width: w, height: h })
    await page.setContent(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;}body{background:white;}</style></head><body>${svg}</body></html>`,
      { waitUntil: 'networkidle' }
    )
    await page.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve())

    const pngBuffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: w, height: h },
      omitBackground: false,
    })
    results.push(Buffer.from(pngBuffer))
  }

  await context.close()
  return results
}
