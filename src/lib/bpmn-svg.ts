// Server-side BPMN 2.0 SVG generator — produces the same visual diagram
// as the client-side BpmnDiagram component, but as an SVG string.
// Used by DOCX/PPTX/PDF export to embed the flow chart as an image.

export type BpmnStep = {
  type: 'START' | 'TASK' | 'GATEWAY' | 'END' | 'CORRECTION'
  lane: number
  label: string
  sla: string
  order: number
  branchLabel?: string
  yesTargetOrder?: number
  noTargetOrder?: number
}

type Position = { step: BpmnStep; col: number; lane: number; cx: number; cy: number; w: number; h: number }
type Arrow = { path: string; label?: string; labelX: number; labelY: number; color: string }

const SHAPE_CFG: Record<string, { fill: string; stroke: string; text: string; label: string }> = {
  START: { fill: '#dcfce7', stroke: '#16a34a', text: '#15803d', label: 'Start' },
  TASK: { fill: '#fef3c7', stroke: '#d97706', text: '#92400e', label: 'Task' },
  GATEWAY: { fill: '#ffedd5', stroke: '#ea580c', text: '#9a3412', label: 'Gateway' },
  END: { fill: '#e7e5e4', stroke: '#44403c', text: '#1c1917', label: 'End' },
  CORRECTION: { fill: '#fee2e2', stroke: '#dc2626', text: '#991b1b', label: 'Koreksi' },
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function wrap(text: string, maxChars: number): string[] {
  if (!text) return ['']
  if (text.length <= maxChars) return [text]
  const words = text.split(/\s+/)
  const result: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxChars) {
      cur = (cur + ' ' + w).trim()
    } else {
      if (cur) result.push(cur)
      cur = w
    }
  }
  if (cur) result.push(cur)
  return result.slice(0, 3)
}

function shapeW(type: string): number {
  if (type === 'START' || type === 'END') return 34
  if (type === 'GATEWAY') return 52
  return 112
}
function shapeH(type: string): number {
  if (type === 'START' || type === 'END') return 34
  if (type === 'GATEWAY') return 52
  return 46
}

function computeLayout(lanes: string[], steps: BpmnStep[]) {
  const padX = 12
  const padY = 20
  const laneHeaderW = 72
  const cellW = 148
  const cellH = 150

  const sorted = [...steps].sort((a, b) => a.order - b.order)
  const byOrder = new Map<number, BpmnStep>()
  for (const s of sorted) byOrder.set(s.order, s)

  // Column assignment
  const colByOrder = new Map<number, number>()
  let mainCol = 0
  for (const s of sorted) {
    if (s.type !== 'CORRECTION') {
      colByOrder.set(s.order, mainCol)
      mainCol++
    }
  }
  for (const s of sorted) {
    if (s.type === 'CORRECTION') {
      let parentGateway: BpmnStep | undefined
      for (const g of sorted) {
        if (g.type === 'GATEWAY' && g.noTargetOrder === s.order) {
          parentGateway = g
          break
        }
      }
      if (parentGateway) {
        colByOrder.set(s.order, colByOrder.get(parentGateway.order) ?? mainCol)
      } else {
        colByOrder.set(s.order, mainCol)
        mainCol++
      }
    }
  }

  const colCount = Math.max(mainCol, 1)

  const positions: Position[] = sorted.map((step) => {
    const col = colByOrder.get(step.order) ?? 0
    const lane = step.lane
    const cx = padX + laneHeaderW + col * cellW + cellW / 2
    const cy = padY + lane * cellH + cellH / 2
    const w = shapeW(step.type)
    const h = shapeH(step.type)
    return { step, col, lane, cx, cy, w, h }
  })

  const posByOrder = new Map<number, Position>()
  for (const p of positions) posByOrder.set(p.step.order, p)

  // Arrows
  const arrows: Arrow[] = []
  for (let i = 0; i < sorted.length; i++) {
    const step = sorted[i]
    const from = posByOrder.get(step.order)
    if (!from) continue

    if (step.type === 'GATEWAY') {
      if (step.yesTargetOrder) {
        const to = posByOrder.get(step.yesTargetOrder)
        if (to) arrows.push(makeArrow(from, to, '✓ YA', '#16a34a', 'right'))
      }
      if (step.noTargetOrder) {
        const to = posByOrder.get(step.noTargetOrder)
        if (to) {
          const dir = to.lane > from.lane ? 'down' : 'up'
          arrows.push(makeArrow(from, to, '✗ TIDAK', '#dc2626', dir))
        }
      }
    } else if (step.type !== 'END' && step.type !== 'CORRECTION') {
      let nextOrder = step.order + 1
      let to = posByOrder.get(nextOrder)
      while (to && to.step.type === 'CORRECTION') {
        nextOrder++
        to = posByOrder.get(nextOrder)
      }
      if (to) arrows.push(makeArrow(from, to, undefined, '#78716c', 'right'))
    }
  }

  const width = padX * 2 + laneHeaderW + colCount * cellW
  const height = padY * 2 + lanes.length * cellH

  return { cellW, cellH, padX, padY, laneHeaderW, width, height, positions, arrows, colCount }
}

function makeArrow(from: Position, to: Position, label: string | undefined, color: string, dir: 'right' | 'down' | 'up'): Arrow {
  const dx = to.cx - from.cx
  const dy = to.cy - from.cy
  const sameCol = Math.abs(dx) < 30
  const sameRow = Math.abs(dy) < 30
  const fromHW = from.w / 2 + 2
  const fromHH = from.h / 2 + 2
  const toHW = to.w / 2 + 2
  const toHH = to.h / 2 + 2

  let path: string
  let labelX: number
  let labelY: number

  if (sameRow) {
    const sx = from.cx + fromHW
    const ex = to.cx - toHW
    path = `M ${sx} ${from.cy} L ${ex} ${to.cy}`
    labelX = (sx + ex) / 2
    labelY = from.cy - 12
  } else if (sameCol) {
    if (to.cy > from.cy) {
      const sy = from.cy + fromHH
      const ey = to.cy - toHH
      path = `M ${from.cx} ${sy} L ${to.cx} ${ey}`
      labelX = from.cx + 22
      labelY = (sy + ey) / 2
    } else {
      const sy = from.cy - fromHH
      const ey = to.cy + toHH
      path = `M ${from.cx} ${sy} L ${to.cx} ${ey}`
      labelX = from.cx + 22
      labelY = (sy + ey) / 2
    }
  } else if (dir === 'down') {
    const sy = from.cy + fromHH
    const midY = to.cy
    const ex = to.cx - toHW
    path = `M ${from.cx} ${sy} L ${from.cx} ${midY} L ${ex} ${midY}`
    labelX = from.cx + 24
    labelY = (sy + midY) / 2
  } else if (dir === 'up') {
    const sy = from.cy - fromHH
    const midY = to.cy
    const ex = to.cx - toHW
    path = `M ${from.cx} ${sy} L ${from.cx} ${midY} L ${ex} ${midY}`
    labelX = from.cx + 24
    labelY = (sy + midY) / 2
  } else {
    const sx = from.cx + fromHW
    const midX = from.cx + fromHW + (to.cx - from.cx - fromHW - toHW) / 2
    const ex = to.cx - toHW
    path = `M ${sx} ${from.cy} L ${midX} ${from.cy} L ${midX} ${to.cy} L ${ex} ${to.cy}`
    labelX = midX
    labelY = (from.cy + to.cy) / 2
  }

  return { path, label, labelX, labelY, color }
}

function renderShapeSvg(step: BpmnStep): string {
  const cfg = SHAPE_CFG[step.type] || SHAPE_CFG.TASK
  const labelEsc = escapeXml(step.label)

  if (step.type === 'START') {
    return `<circle cx="0" cy="0" r="17" fill="${cfg.fill}" stroke="${cfg.stroke}" stroke-width="2.5"/><text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="700" fill="${cfg.text}">START</text>`
  }

  if (step.type === 'END') {
    return `<circle cx="0" cy="0" r="17" fill="${cfg.fill}" stroke="${cfg.stroke}" stroke-width="4"/><text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="700" fill="${cfg.text}">END</text>`
  }

  if (step.type === 'GATEWAY') {
    const s = 26
    const lines = wrap(step.label, 15)
    let labelSvg = ''
    for (let i = 0; i < lines.length; i++) {
      labelSvg += `<tspan x="0" dy="${i === 0 ? 0 : -11}">${escapeXml(lines[i])}</tspan>`
    }
    let slaSvg = ''
    if (step.sla) {
      slaSvg = renderSlaPillSvg(step.sla, s + 10)
    }
    return `<polygon points="0,${-s} ${s},0 0,${s} ${-s},0" fill="${cfg.fill}" stroke="${cfg.stroke}" stroke-width="2.5"/><text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-size="15" font-weight="800" fill="${cfg.text}">?</text><text x="0" y="${-s - 8}" text-anchor="middle" font-size="10" font-weight="600" fill="#1c1917">${labelSvg}</text>${slaSvg}`
  }

  // TASK or CORRECTION
  const w = 112
  const h = 46
  const isCorr = step.type === 'CORRECTION'
  const lines = wrap(step.label, 15)
  let labelSvg = ''
  for (let i = 0; i < lines.length; i++) {
    labelSvg += `<tspan x="0" dy="${i === 0 ? 0 : 11}">${escapeXml(lines[i])}</tspan>`
  }
  const dashArr = isCorr ? ' stroke-dasharray="5,3"' : ''
  let slaSvg = ''
  if (step.sla) {
    slaSvg = renderSlaPillSvg(step.sla, h / 2 + 10)
  }
  return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${isCorr ? 4 : 10}" fill="${cfg.fill}" stroke="${cfg.stroke}" stroke-width="2"${dashArr}/><text x="0" y="${-h / 2 + 9}" text-anchor="middle" font-size="7" font-weight="700" fill="${cfg.text}" opacity="0.65">${cfg.label.toUpperCase()}</text><text x="0" y="${lines.length > 1 ? -1 : 3}" text-anchor="middle" font-size="10" font-weight="600" fill="#1c1917">${labelSvg}</text>${slaSvg}`
}

function renderSlaPillSvg(sla: string, y: number): string {
  const pw = 50
  const ph = 14
  // Use "SLA:" text prefix instead of clock emoji ⏱ which may not render in all font contexts
  return `<g transform="translate(0, ${y})"><rect x="${-pw / 2}" y="${-ph / 2}" width="${pw}" height="${ph}" rx="7" fill="#f5f5f4" stroke="#d6d3d1" stroke-width="0.8"/><text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-size="8" font-weight="700" fill="#57534e">SLA ${escapeXml(sla)}</text></g>`
}

// Main entry: generate full SVG string for a BPMN diagram
export function generateBpmnSvg(lanes: string[], steps: BpmnStep[], accentColor = '#b45309'): string {
  if (steps.length === 0 || lanes.length === 0) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="100" y="30" text-anchor="middle" fill="#999" font-size="12" font-family="DejaVu Sans">Belum ada langkah proses</text></svg>'
  }

  const layout = computeLayout(lanes, steps)
  const { padX, padY, laneHeaderW, cellW, cellH, width, height, positions, arrows, colCount } = layout

  // Use DejaVu Sans — installed on all Linux systems, renders reliably with librsvg/sharp.
  // Avoid Arial/Helvetica which may not resolve in headless render contexts.
  const FONT = 'DejaVu Sans'
  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">`

  // Defs (arrow markers)
  svg += `<defs>`
  svg += `<marker id="ah-gray" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,5 L0,10 Z" fill="#78716c"/></marker>`
  svg += `<marker id="ah-green" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,5 L0,10 Z" fill="#16a34a"/></marker>`
  svg += `<marker id="ah-red" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,5 L0,10 Z" fill="#dc2626"/></marker>`
  svg += `</defs>`

  // Swim lanes
  for (let i = 0; i < lanes.length; i++) {
    const y = padY + i * cellH
    svg += `<rect x="${padX + laneHeaderW}" y="${y}" width="${colCount * cellW}" height="${cellH}" fill="${i % 2 === 0 ? '#fafaf9' : '#ffffff'}" stroke="#e7e5e4" stroke-width="1"/>`
    svg += `<rect x="${padX}" y="${y}" width="${laneHeaderW}" height="${cellH}" fill="${accentColor}" opacity="0.13"/>`
    svg += `<text x="${padX + laneHeaderW / 2}" y="${y + cellH / 2}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="600" fill="#44403c">${escapeXml(truncate(lanes[i], 18))}</text>`
    svg += `<line x1="${padX + laneHeaderW}" y1="${y}" x2="${padX + laneHeaderW}" y2="${y + cellH}" stroke="${accentColor}" stroke-width="1.5" opacity="0.4"/>`
  }

  // Outer border
  svg += `<rect x="${padX}" y="${padY}" width="${laneHeaderW + colCount * cellW}" height="${lanes.length * cellH}" fill="none" stroke="#d6d3d1" stroke-width="1.5"/>`

  // Arrows
  for (const a of arrows) {
    const marker = a.color === '#16a34a' ? 'url(#ah-green)' : a.color === '#dc2626' ? 'url(#ah-red)' : 'url(#ah-gray)'
    svg += `<path d="${a.path}" fill="none" stroke="${a.color}" stroke-width="1.6" marker-end="${marker}"/>`
    if (a.label) {
      // Replace ✓/✗ symbols with plain text to avoid font/emoji rendering issues
      // "✓ YA" → "YA", "✗ TIDAK" → "TIDAK" (color already conveys yes/no)
      const labelText = a.label.replace('✓ ', '').replace('✗ ', '')
      svg += `<rect x="${a.labelX - 24}" y="${a.labelY - 10}" width="48" height="20" rx="5" fill="#ffffff" stroke="${a.color}" stroke-width="1.5"/>`
      svg += `<text x="${a.labelX}" y="${a.labelY + 1}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="800" fill="${a.color}">${escapeXml(labelText)}</text>`
    }
  }

  // Shapes
  for (const pos of positions) {
    svg += `<g transform="translate(${pos.cx}, ${pos.cy})">${renderShapeSvg(pos.step)}</g>`
  }

  svg += `</svg>`
  return svg
}
