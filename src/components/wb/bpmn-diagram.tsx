'use client'

import { useMemo } from 'react'
import type { BpmnStep } from '@/lib/bpm-types'

type Props = {
  lanes: string[]
  steps: BpmnStep[]
  accentColor?: string
  compact?: boolean
}

// BPMN 2.0 diagram with clean swim-lane layout.
//
// Layout algorithm:
//  1. Main-flow steps (START/TASK/GATEWAY/END) are placed left→right in
//     sequential columns based on their order.
//  2. CORRECTION steps are placed in the SAME column as the gateway that
//     branches to them (the gateway whose noTargetOrder === step.order),
//     but in their own lane. This keeps "TIDAK" branches visually attached
//     to their decision point instead of floating far away.
//  3. Arrows are routed orthogonally from shape edge to shape edge, with
//     elbows that avoid crossing through other shapes.
export function BpmnDiagram({ lanes, steps, accentColor = '#b45309', compact = false }: Props) {
  const layout = useMemo(() => computeLayout(lanes, steps), [lanes, steps])

  if (steps.length === 0 || lanes.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Belum ada langkah proses.
      </div>
    )
  }

  const { cellW, cellH, padX, padY, laneHeaderW, width, height, positions, arrows, colCount } = layout
  const scale = compact ? 0.85 : 1

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <svg
        width={width * scale}
        height={height * scale}
        viewBox={`0 0 ${width} ${height}`}
        style={{ minWidth: '100%' }}
        className="select-none"
      >
        <defs>
          <marker id="ah-gray" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,5 L0,10 Z" fill="#78716c" />
          </marker>
          <marker id="ah-green" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,5 L0,10 Z" fill="#16a34a" />
          </marker>
          <marker id="ah-red" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,5 L0,10 Z" fill="#dc2626" />
          </marker>
        </defs>

        {/* Swim-lane backgrounds */}
        {lanes.map((lane, i) => {
          const y = padY + i * cellH
          return (
            <g key={`lane-${i}`}>
              <rect
                x={padX + laneHeaderW}
                y={y}
                width={colCount * cellW}
                height={cellH}
                fill={i % 2 === 0 ? '#fafaf9' : '#ffffff'}
                stroke="#e7e5e4"
                strokeWidth={1}
              />
              {/* Lane header */}
              <rect x={padX} y={y} width={laneHeaderW} height={cellH} fill={accentColor} opacity={0.13} />
              <text
                x={padX + laneHeaderW / 2}
                y={y + cellH / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={compact ? 9 : 11}
                fontWeight={600}
                fill="#44403c"
              >
                {truncate(lane, compact ? 14 : 18)}
              </text>
              <line
                x1={padX + laneHeaderW}
                y1={y}
                x2={padX + laneHeaderW}
                y2={y + cellH}
                stroke={accentColor}
                strokeWidth={1.5}
                opacity={0.4}
              />
            </g>
          )
        })}

        {/* Outer border */}
        <rect
          x={padX}
          y={padY}
          width={laneHeaderW + colCount * cellW}
          height={lanes.length * cellH}
          fill="none"
          stroke="#d6d3d1"
          strokeWidth={1.5}
        />

        {/* Arrows (under shapes) */}
        {arrows.map((a, i) => (
          <g key={`arr-${i}`}>
            <path
              d={a.path}
              fill="none"
              stroke={a.color}
              strokeWidth={1.6}
              markerEnd={a.color === '#16a34a' ? 'url(#ah-green)' : a.color === '#dc2626' ? 'url(#ah-red)' : 'url(#ah-gray)'}
            />
            {a.label && (
              <g>
                <rect
                  x={a.labelX - 20}
                  y={a.labelY - 10}
                  width={40}
                  height={20}
                  rx={5}
                  fill="#ffffff"
                  stroke={a.color}
                  strokeWidth={1.5}
                />
                <text
                  x={a.labelX}
                  y={a.labelY + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={800}
                  fill={a.color}
                >
                  {a.label}
                </text>
              </g>
            )}
          </g>
        ))}

        {/* Shapes */}
        {positions.map((pos) => (
          <g key={pos.step.order} transform={`translate(${pos.cx}, ${pos.cy})`}>
            {renderShape(pos.step, accentColor, compact)}
          </g>
        ))}
      </svg>
    </div>
  )
}

// ---------- Shape rendering ----------

const SHAPE_CFG: Record<string, { fill: string; stroke: string; text: string; label: string }> = {
  START: { fill: '#dcfce7', stroke: '#16a34a', text: '#15803d', label: 'Start' },
  TASK: { fill: '#fef3c7', stroke: '#d97706', text: '#92400e', label: 'Task' },
  GATEWAY: { fill: '#ffedd5', stroke: '#ea580c', text: '#9a3412', label: 'Gateway' },
  END: { fill: '#e7e5e4', stroke: '#44403c', text: '#1c1917', label: 'End' },
  CORRECTION: { fill: '#fee2e2', stroke: '#dc2626', text: '#991b1b', label: 'Koreksi' },
}

function renderShape(step: BpmnStep, accent: string, compact: boolean) {
  const cfg = SHAPE_CFG[step.type] || SHAPE_CFG.TASK

  if (step.type === 'START') {
    const r = compact ? 15 : 17
    return (
      <g>
        <circle cx={0} cy={0} r={r} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={2.5} />
        <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={700} fill={cfg.text}>START</text>
      </g>
    )
  }

  if (step.type === 'END') {
    const r = compact ? 15 : 17
    return (
      <g>
        <circle cx={0} cy={0} r={r} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={4} />
        <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={700} fill={cfg.text}>END</text>
      </g>
    )
  }

  if (step.type === 'GATEWAY') {
    const s = compact ? 22 : 26
    return (
      <g>
        <polygon points={`0,${-s} ${s},0 0,${s} ${-s},0`} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={2.5} />
        <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={compact ? 13 : 15} fontWeight={800} fill={cfg.text}>?</text>
        {/* label above the diamond */}
        <text x={0} y={-s - (compact ? 6 : 8)} textAnchor="middle" fontSize={compact ? 9 : 10} fontWeight={600} fill="#1c1917">
          {wrap(step.label, compact ? 13 : 15).map((ln, i) => (
            <tspan key={i} x={0} dy={i === 0 ? 0 : -11}>{ln}</tspan>
          ))}
        </text>
        {/* SLA pill below the diamond (outside, no overlap) */}
        {step.sla && <SlaPill sla={step.sla} y={s + 10} compact={compact} />}
      </g>
    )
  }

  // TASK or CORRECTION (rounded rect)
  const w = compact ? 96 : 112
  const h = compact ? 42 : 46
  const isCorr = step.type === 'CORRECTION'
  const lines = wrap(step.label, compact ? 12 : 15)
  return (
    <g>
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={isCorr ? 4 : 10}
        fill={cfg.fill}
        stroke={cfg.stroke}
        strokeWidth={2}
        strokeDasharray={isCorr ? '5,3' : undefined}
      />
      {/* type badge at top */}
      <text x={0} y={-h / 2 + 9} textAnchor="middle" fontSize={7} fontWeight={700} fill={cfg.text} opacity={0.65}>
        {cfg.label.toUpperCase()}
      </text>
      {/* label (centered, no SLA inside to avoid overlap) */}
      <text x={0} y={lines.length > 1 ? -1 : 3} textAnchor="middle" fontSize={compact ? 9 : 10} fontWeight={600} fill="#1c1917">
        {lines.map((ln, i) => (
          <tspan key={i} x={0} dy={i === 0 ? 0 : 11}>{ln}</tspan>
        ))}
      </text>
      {/* SLA pill below the box (outside, no overlap) */}
      {step.sla && <SlaPill sla={step.sla} y={h / 2 + 10} compact={compact} />}
    </g>
  )
}

// Small SLA pill rendered outside shapes to avoid text overlap
function SlaPill({ sla, y, compact }: { sla: string; y: number; compact: boolean }) {
  const pw = compact ? 38 : 44
  const ph = 14
  return (
    <g transform={`translate(0, ${y})`}>
      <rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} rx={7} fill="#f5f5f4" stroke="#d6d3d1" strokeWidth={0.8} />
      <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={compact ? 7 : 8} fontWeight={700} fill="#57534e">
        ⏱ {sla}
      </text>
    </g>
  )
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

// ---------- Layout computation ----------

type Position = { step: BpmnStep; col: number; lane: number; cx: number; cy: number; w: number; h: number }
type Arrow = { path: string; label?: string; labelX: number; labelY: number; color: string }

function computeLayout(lanes: string[], steps: BpmnStep[]) {
  const padX = 12
  const padY = 20
  const laneHeaderW = 72
  const cellW = 148
  const cellH = 150

  const sorted = [...steps].sort((a, b) => a.order - b.order)

  // Step lookup by order
  const byOrder = new Map<number, BpmnStep>()
  for (const s of sorted) byOrder.set(s.order, s)

  // ---- Column assignment ----
  // Main-flow steps (non-correction) get sequential columns 0,1,2,...
  // Correction steps get the column of their parent gateway.
  const colByOrder = new Map<number, number>()

  // First: identify main-flow steps and assign sequential columns
  let mainCol = 0
  const mainFlowOrders: number[] = []
  for (const s of sorted) {
    if (s.type !== 'CORRECTION') {
      colByOrder.set(s.order, mainCol)
      mainFlowOrders.push(s.order)
      mainCol++
    }
  }

  // Second: for each correction step, find the gateway that points to it
  // (the gateway whose noTargetOrder === correction.order), and assign
  // the correction to the same column as that gateway.
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
        // No parent gateway found — place at end
        colByOrder.set(s.order, mainCol)
        mainCol++
      }
    }
  }

  const colCount = Math.max(mainCol, 1)

  // ---- Positions ----
  const positions: Position[] = sorted.map((step) => {
    const col = colByOrder.get(step.order) ?? 0
    const lane = step.lane
    const cx = padX + laneHeaderW + col * cellW + cellW / 2
    const cy = padY + lane * cellH + cellH / 2
    const w = compact_shapeW(step.type)
    const h = compact_shapeH(step.type)
    return { step, col, lane, cx, cy, w, h }
  })

  const posByOrder = new Map<number, Position>()
  for (const p of positions) posByOrder.set(p.step.order, p)

  // ---- Arrows ----
  const arrows: Arrow[] = []

  for (let i = 0; i < sorted.length; i++) {
    const step = sorted[i]
    const from = posByOrder.get(step.order)
    if (!from) continue

    if (step.type === 'GATEWAY') {
      // YA branch — goes to the next main-flow step (usually rightward)
      if (step.yesTargetOrder) {
        const to = posByOrder.get(step.yesTargetOrder)
        if (to) {
          arrows.push(makeArrow(from, to, '✓ YA', '#16a34a', 'right'))
        }
      }
      // TIDAK branch — goes to the correction (usually downward to another lane)
      if (step.noTargetOrder) {
        const to = posByOrder.get(step.noTargetOrder)
        if (to) {
          // Exit gateway from the bottom (if correction is below) or top (if above)
          // to avoid overlapping with the gateway's label text above it.
          const dir = to.lane > from.lane ? 'down' : 'up'
          arrows.push(makeArrow(from, to, '✗ TIDAK', '#dc2626', dir))
        }
      }
    } else if (step.type !== 'END' && step.type !== 'CORRECTION') {
      // Main-flow sequential: connect to next step by order
      const nextOrder = step.order + 1
      const to = posByOrder.get(nextOrder)
      if (to) {
        arrows.push(makeArrow(from, to, undefined, '#78716c', 'right'))
      }
    }
    // CORRECTION steps: no outgoing arrow (they are terminal correction branches
    // that loop back conceptually — the gateway's YA arrow already shows the
    // main flow continuation).
  }

  const width = padX * 2 + laneHeaderW + colCount * cellW
  const height = padY * 2 + lanes.length * cellH

  return { cellW, cellH, padX, padY, laneHeaderW, width, height, positions, arrows, colCount }
}

function compact_shapeW(type: string): number {
  if (type === 'START' || type === 'END') return 34
  if (type === 'GATEWAY') return 52
  return 112
}
function compact_shapeH(type: string): number {
  if (type === 'START' || type === 'END') return 34
  if (type === 'GATEWAY') return 52
  return 46
}

// Build an orthogonal arrow path from one shape to another.
// `dir` hints the preferred exit direction: 'right' (exit right edge),
// 'down' (exit bottom), 'up' (exit top).
function makeArrow(from: Position, to: Position, label: string | undefined, color: string, dir: 'right' | 'down' | 'up'): Arrow {
  const dx = to.cx - from.cx
  const dy = to.cy - from.cy
  const sameCol = Math.abs(dx) < 30
  const sameRow = Math.abs(dy) < 30

  let path: string
  let labelX: number
  let labelY: number

  // Half-sizes for edge offsets
  const fromHW = from.w / 2 + 2
  const fromHH = from.h / 2 + 2
  const toHW = to.w / 2 + 2
  const toHH = to.h / 2 + 2

  if (sameRow) {
    // Same lane — straight horizontal
    const sx = from.cx + fromHW
    const ex = to.cx - toHW
    path = `M ${sx} ${from.cy} L ${ex} ${to.cy}`
    labelX = (sx + ex) / 2
    labelY = from.cy - 12
  } else if (sameCol) {
    // Same column, different lane — vertical
    if (to.cy > from.cy) {
      // going down
      const sy = from.cy + fromHH
      const ey = to.cy - toHH
      path = `M ${from.cx} ${sy} L ${to.cx} ${ey}`
      labelX = from.cx + 22
      labelY = (sy + ey) / 2
    } else {
      // going up
      const sy = from.cy - fromHH
      const ey = to.cy + toHH
      path = `M ${from.cx} ${sy} L ${to.cx} ${ey}`
      labelX = from.cx + 22
      labelY = (sy + ey) / 2
    }
  } else if (dir === 'down') {
    // Gateway → correction below: exit bottom, go down, then right to target
    const sy = from.cy + fromHH
    const midY = to.cy
    const ex = to.cx - toHW
    path = `M ${from.cx} ${sy} L ${from.cx} ${midY} L ${ex} ${midY}`
    labelX = from.cx + 24
    labelY = (sy + midY) / 2
  } else if (dir === 'up') {
    // Gateway → correction above: exit top, go up, then right to target
    const sy = from.cy - fromHH
    const midY = to.cy
    const ex = to.cx - toHW
    path = `M ${from.cx} ${sy} L ${from.cx} ${midY} L ${ex} ${midY}`
    labelX = from.cx + 24
    labelY = (sy + midY) / 2
  } else {
    // 'right' but different row & col — elbow: exit right, go right, then vertical, then right to target
    const sx = from.cx + fromHW
    const midX = from.cx + fromHW + (to.cx - from.cx - fromHW - toHW) / 2
    const ex = to.cx - toHW
    path = `M ${sx} ${from.cy} L ${midX} ${from.cy} L ${midX} ${to.cy} L ${ex} ${to.cy}`
    labelX = midX
    labelY = (from.cy + to.cy) / 2
  }

  return { path, label, labelX, labelY, color }
}
