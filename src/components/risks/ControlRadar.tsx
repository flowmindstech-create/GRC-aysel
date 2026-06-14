'use client'

interface Props {
  values: number[] // 6 values, 1-5 (1 = strong/best)
  labels: string[] // 6 short labels
  size?: number
}

// Lightweight dependency-free SVG radar (spider chart) for the 6 control sub-criteria.
export function ControlRadar({ values, labels, size = 150 }: Props) {
  const n = 6
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 26
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const point = (i: number, radius: number) => [cx + radius * Math.cos(angle(i)), cy + radius * Math.sin(angle(i))]

  const ringPath = (level: number) =>
    Array.from({ length: n }, (_, i) => point(i, (r * level) / 5).join(',')).join(' ')

  const dataPath = values.map((v, i) => point(i, (r * Math.max(1, Math.min(5, v))) / 5).join(',')).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {/* grid rings */}
      {[1, 2, 3, 4, 5].map((lvl) => (
        <polygon key={lvl} points={ringPath(lvl)} fill="none" stroke="var(--border)" strokeWidth={0.6} opacity={0.5} />
      ))}
      {/* axes */}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = point(i, r)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={0.6} opacity={0.5} />
      })}
      {/* data polygon */}
      <polygon points={dataPath} fill="rgba(14,165,233,0.25)" stroke="#0ea5e9" strokeWidth={1.5} />
      {values.map((v, i) => {
        const [x, y] = point(i, (r * Math.max(1, Math.min(5, v))) / 5)
        return <circle key={i} cx={x} cy={y} r={2} fill="#0ea5e9" />
      })}
      {/* labels */}
      {labels.map((lb, i) => {
        const [x, y] = point(i, r + 12)
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize={7} fill="var(--muted-fg)">
            {lb}
          </text>
        )
      })}
    </svg>
  )
}
