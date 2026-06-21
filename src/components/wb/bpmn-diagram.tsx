'use client'

import { useMemo } from 'react'
import type { BpmnStep } from '@/lib/bpm-types'

type Props = {
  lanes: string[]
  steps: BpmnStep[]
  accentColor?: string
  compact?: boolean
}

// BPMN 2.0 shape renderer with swim lanes.
// Lays steps out on a grid (column = step order, row = lane index),
// draws proper BPMN shapes (start circle, task rounded-rect, gateway diamond,
// end thick circle, correction red rect), and connects them with arrows.
// Gateway branches (YA/TIDAK) are routed to their target steps.
export function BpmnDiagram({ lanes, steps, accentColor = '#b45309', compact = false }: Props) {
  const layout = useMemo(() => computeLayout(lanes, steps), [lanes, steps])

  if (steps.length === 0 || lanes.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Belum ada langkah proses.
      </div>
    )
  }

  const { colW, rowH, padX, padY, laneHeaderW, width, height, positions } = layout
  const scale = compact ? 0.7 : 1

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <svg
        width={width * scale}
        height={height * scale}
        viewBox={`0 0 ${width} ${height}`}
        style={{ minWidth: '100%' }}
        className="select-none"
      >
        {/* Swim lane backgrounds + headers */}
        {lanes.map((lane, i) => {
          const y = padY + i * rowH
          return (
            <g key={i}>
              <rect
                x={padX}
                y={y}
                width={width - padX - padX}
                height={rowH}
                fill={i % 2 === 0 ? '#fafaf9' : '#ffffff'}
                stroke="#e7e5e4"
                strokeWidth={1}
              />
              {/* Lane header (left vertical label) */}
              <rect
                x={0}
                y={y}
                width={laneHeaderW}
                height={rowH}
                fill={accentColor}
                opacity={0.12}
              />
              <text
                x={laneHeaderW / 2}
                y={y + rowH / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={compact ? 9 : 11}
                fontWeight={600}
                fill="#44403c"
                transform={`rotate(0 ${laneHeaderW / 2} ${y + rowH / 2})`}
              >
                {lane.length > 18 ? lane.slice(0, 17) + '…' : lane}
              </text>
              <line
                x1={laneHeaderW}
                y1={y}
                x2={laneHeaderW}
                y2={y + rowH}
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
          width={width - padX - padX}
          height={lanes.length * rowH}
          fill="none"
          stroke="#d6d3d1"
          strokeWidth={1.5}
        />

        {/* Arrows (drawn first so shapes overlay them) */}
        {layout.arrows.map((a, i) => (
          <g key={`arr-${i}`}>
            <path
              d={a.path}
              fill="none"
              stroke={a.color}
              strokeWidth={1.5}
              markerEnd="url(#arrowhead)"
            />
            {a.label && (
              <g>
                <rect
                  x={a.labelX - 14}
                  y={a.labelY - 8}
                  width={28}
                  height={16}
                  rx={3}
                  fill="#fff"
                  stroke={a.color}
                  strokeWidth={1}
                />
                <text
                  x={a.labelX}
                  y={a.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill={a.color}
                >
                  {a.label}
                </text>
              </g>
            )}
          </g>
        ))}

        {/* Arrowhead marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <polygon points="0 0, 8 4, 0 8" fill="#78716c" />
          </marker>
          <marker
            id="arrowhead-red"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <polygon points="0 0, 8 4, 0 8" fill="#dc2626" />
          </marker>
          <marker
            id="arrowhead-green"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <polygon points="0 0, 8 4, 0 8" fill="#16a34a" />
          </marker>
        </defs>

        {/* Shapes */}
        {positions.map((pos) => {
          const step = pos.step
          const cfg = SHAPE_CONFIG[step.type] || SHAPE_CONFIG.TASK
          return (
            <g key={step.order} transform={`translate(${pos.x}, ${pos.y})`}>
              {renderShape(step, cfg, accentColor, compact)}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const SHAPE_CONFIG: Record<string, {
  fill: string; stroke: string; text: string; label: string
}> = {
  START: { fill: '#dcfce7', stroke: '#16a34a', text: '#15803d', label: 'Start' },
  TASK: { fill: '#fef3c7', stroke: '#d97706', text: '#92400e', label: 'Task' },
  GATEWAY: { fill: '#ffedd5', stroke: '#ea580c', text: '#9a3412', label: 'Gateway' },
  END: { fill: '#e7e5e4', stroke: '#44403c', text: '#1c1917', label: 'End' },
  CORRECTION: { fill: '#fee2e2', stroke: '#dc2626', text: '#991b1b', label: 'Koreksi' },
}

function renderShape(
  step: BpmnStep,
  cfg: { fill: string; stroke: string; text: string; label: string },
  accent: string,
  compact: boolean
) {
  const w = compact ? 90 : 110
  const h = compact ? 42 : 50

  if (step.type === 'START') {
    return (
      <g>
        <circle cx={0} cy={0} r={compact ? 14 : 16} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={2} />
        <text x={0} y={compact ? 28 : 32} textAnchor="middle" fontSize={9} fontWeight={600} fill={cfg.text}>START</text>
        <text x={0} y={compact ? -26 : -28} textAnchor="middle" fontSize={10} fontWeight={600} fill="#1c1917">{step.label}</text>
      </g>
    )
  }

  if (step.type === 'END') {
    return (
      <g>
        <circle cx={0} cy={0} r={compact ? 14 : 16} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={4} />
        <text x={0} y={compact ? 28 : 32} textAnchor="middle" fontSize={9} fontWeight={600} fill={cfg.text}>END</text>
      </g>
    )
  }

  if (step.type === 'GATEWAY') {
    const s = compact ? 20 : 24
    return (
      <g>
        <polygon
          points={`0,${-s} ${s},0 0,${s} ${-s},0`}
          fill={cfg.fill}
          stroke={cfg.stroke}
          strokeWidth={2}
        />
        <text x={0} y={3} textAnchor="middle" fontSize={compact ? 11 : 13} fontWeight={700} fill={cfg.text}>?</text>
        <text x={0} y={compact ? -32 : -36} textAnchor="middle" fontSize={10} fontWeight={600} fill="#1c1917">{step.label}</text>
        {step.sla && (
          <text x={0} y={compact ? 38 : 42} textAnchor="middle" fontSize={8} fill="#78716c">SLA {step.sla}</text>
        )}
      </g>
    )
  }

  // TASK or CORRECTION
  const isCorrection = step.type === 'CORRECTION'
  const rx = isCorrection ? 4 : 10
  return (
    <g>
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={rx}
        fill={cfg.fill}
        stroke={cfg.stroke}
        strokeWidth={isCorrection ? 2 : 2}
        strokeDasharray={isCorrection ? '5,3' : undefined}
      />
      {/* type badge */}
      <text x={0} y={-h / 2 + (compact ? 9 : 10)} textAnchor="middle" fontSize={7} fontWeight={700} fill={cfg.text} opacity={0.7}>
        {cfg.label.toUpperCase()}
      </text>
      {/* label */}
      <text x={0} y={compact ? 2 : 4} textAnchor="middle" fontSize={compact ? 8 : 9} fontWeight={600} fill="#1c1917">
        {wrapText(step.label, compact ? 14 : 16).map((line, i) => (
          <tspan key={i} x={0} dy={i === 0 ? 0 : 10}>{line}</tspan>
        ))}
      </text>
      {step.sla && (
        <text x={0} y={h / 2 - (compact ? 4 : 5)} textAnchor="middle" fontSize={7} fill="#78716c" fontWeight={600}>
          ⏱ {step.sla}
        </text>
      )}
    </g>
  )
}

function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    if ((current + ' ' + w).trim().length <= maxChars) {
      current = (current + ' ' + w).trim()
    } else {
      if (current) lines.push(current)
      current = w
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 3) // max 3 lines
}

// Compute grid layout + arrow paths
type Position = { x: number; y: number; step: BpmnStep }
type Arrow = { path: string; label?: string; labelX: number; labelY: number; color: string }

function computeLayout(lanes: string[], steps: BpmnStep[]) {
  const padX = 12
  const padY = 16
  const laneHeaderW = 70
  const colW = 130
  const rowH = 110

  // Sort steps by order
  const sorted = [...steps].sort((a, b) => a.order - b.order)

  // Determine number of columns = max order
  const maxOrder = sorted.length > 0 ? Math.max(...sorted.map(s => s.order)) : 1
  const numCols = maxOrder

  const contentW = numCols * colW
  const width = laneHeaderW + contentW + padX * 2
  const height = padY * 2 + lanes.length * rowH

  // Build a lookup: order → step, for gateway target resolution
  const stepByOrder = new Map<number, BpmnStep>()
  for (const s of sorted) stepByOrder.set(s.order, s)

  // Position each step at (column for its order, row for its lane)
  const positions: Position[] = sorted.map((step) => {
    const col = step.order - 1
    const x = padX + laneHeaderW + col * colW + colW / 2
    const y = padY + step.lane * rowH + rowH / 2
    return { x, y, step }
  })

  const posByOrder = new Map<number, Position>()
  for (const p of positions) posByOrder.set(p.step.order, p)

  // Build arrows
  const arrows: Arrow[] = []
  for (let i = 0; i < sorted.length; i++) {
    const step = sorted[i]
    const from = posByOrder.get(step.order)!

    if (step.type === 'GATEWAY') {
      // YA branch → yesTargetOrder
      if (step.yesTargetOrder) {
        const to = posByOrder.get(step.yesTargetOrder)
        if (to) {
          arrows.push(buildArrow(from, to, '✓ YA', '#16a34a'))
        }
      }
      // TIDAK branch → noTargetOrder
      if (step.noTargetOrder) {
        const to = posByOrder.get(step.noTargetOrder)
        if (to) {
          arrows.push(buildArrow(from, to, '✗ TIDAK', '#dc2626'))
        }
      }
    } else if (step.type !== 'END') {
      // Sequential: connect to next step in sequence (unless this is a gateway's target coming back)
      // Find the next step by order
      const nextOrder = step.order + 1
      const to = posByOrder.get(nextOrder)
      if (to) {
        // Skip if the next step is a correction branch target that's already covered by a gateway
        // Simple rule: always draw sequential arrow for non-gateway steps
        arrows.push(buildArrow(from, to, undefined, '#78716c'))
      }
    }
  }

  return { colW, rowH, padX, padY, laneHeaderW, width, height, positions, arrows }
}

function buildArrow(from: Position, to: Position, label: string | undefined, color: string): Arrow {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const sameRow = Math.abs(dy) < 30

  let path: string
  let labelX: number
  let labelY: number

  if (sameRow) {
    // Straight horizontal arrow
    const startX = from.x + 55
    const endX = to.x - 55
    path = `M ${startX} ${from.y} L ${endX} ${to.y}`
    labelX = (startX + endX) / 2
    labelY = from.y - 10
  } else if (dx > 0) {
    // Diagonal down-right: use elbow
    const midX = (from.x + to.x) / 2
    path = `M ${from.x + 55} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x - 55} ${to.y}`
    labelX = midX
    labelY = (from.y + to.y) / 2
  } else {
    // Same column or backwards: vertical-ish elbow
    path = `M ${from.x} ${from.y + 25} L ${from.x} ${to.y - 25}`
    labelX = from.x + 20
    labelY = (from.y + to.y) / 2
  }

  return { path, label, labelX, labelY, color }
}
