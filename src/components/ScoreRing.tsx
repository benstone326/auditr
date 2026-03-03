import { getScoreColor, getScoreLabel } from '../utils';

export default function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const r = (size / 2) * 0.78;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`Score: ${score}/100`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="square"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1.2s ease', filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
        <text x={size/2} y={size/2 - 5} textAnchor="middle"
          fill={color} fontSize={size * 0.22} fontFamily="Syne, sans-serif" fontWeight="800">
          {score}
        </text>
        <text x={size/2} y={size/2 + size*0.15} textAnchor="middle"
          fill="rgba(255,255,255,0.25)" fontSize={size * 0.1}
          fontFamily="IBM Plex Mono, monospace" letterSpacing="2">
          /100
        </text>
      </svg>
      <span className="font-mono text-[11px] tracking-[0.1em]" style={{ color }}>{label.toUpperCase()}</span>
    </div>
  );
}
