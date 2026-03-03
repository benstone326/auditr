import { AuditResult } from '../../types';
import { CheckCircle2 } from 'lucide-react';

const RECOMMENDED_MAX = 8;

export default function TypographyPanel({ data }: { data: AuditResult['typography'] }) {
  const maxCount = 1; // sizes are unique per value in our list

  return (
    <div className="space-y-6">
      {/* Font sizes */}
      <div className="bg-[#111114] border border-white/[0.07] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[10px] text-[#3a3a47] tracking-[0.08em]">
            FONT SIZES ({data.uniqueSizes.length})
          </p>
          <span className={`font-mono text-[10px] px-2 py-0.5 border ${
            data.uniqueSizes.length > RECOMMENDED_MAX
              ? 'text-[#ff5c5c] bg-[rgba(255,92,92,0.1)] border-[rgba(255,92,92,0.2)]'
              : 'text-[#c8f04a] bg-[rgba(200,240,74,0.1)] border-[rgba(200,240,74,0.2)]'
          }`}>
            RECOMMENDED ≤{RECOMMENDED_MAX}
          </span>
        </div>
        {data.uniqueSizes.length > 0 ? (
          <div className="space-y-2">
            {data.uniqueSizes.map((size, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="font-mono text-[11px] w-12 text-right shrink-0" style={{ color: i >= RECOMMENDED_MAX ? '#ff5c5c' : '#6b6b7a' }}>
                  {size}px
                </span>
                <div className="flex-1 h-2 bg-white/[0.04]">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.max((size / Math.max(...data.uniqueSizes)) * 100, 4)}%`,
                      background: i >= RECOMMENDED_MAX ? 'rgba(255,92,92,0.5)' : 'rgba(200,240,74,0.35)',
                    }}
                  />
                </div>
                {i >= RECOMMENDED_MAX && (
                  <span className="font-mono text-[9px] text-[#ff5c5c] bg-[rgba(255,92,92,0.1)] border border-[rgba(255,92,92,0.2)] px-1.5 py-0.5 shrink-0">
                    excess
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="font-mono text-[12px] text-[#6b6b7a] text-center py-4">No text elements detected.</p>
        )}
      </div>

      {/* Families + weights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111114] border border-white/[0.07] p-5">
          <p className="font-mono text-[10px] text-[#3a3a47] tracking-[0.08em] mb-4">
            FONT FAMILIES ({data.fontFamilies.length})
          </p>
          {data.fontFamilies.length > 0 ? (
            <div className="space-y-2">
              {data.fontFamilies.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-[#0a0a0b] border border-white/[0.05] px-3 py-2">
                  <span className="font-mono text-[11px] text-[#e8e8ec] truncate mr-2">{f}</span>
                  {data.fontFamilies.length > 2 && (
                    <span className="font-mono text-[9px] text-[#f5a524] shrink-0">extra</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono text-[12px] text-[#3a3a47]">None detected</p>
          )}
        </div>

        <div className="bg-[#111114] border border-white/[0.07] p-5">
          <p className="font-mono text-[10px] text-[#3a3a47] tracking-[0.08em] mb-4">
            FONT WEIGHTS ({data.uniqueWeights.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {data.uniqueWeights.map((w, i) => (
              <span key={i} className="font-mono text-[11px] text-[#6b6b7a] bg-[#0a0a0b] border border-white/[0.05] px-2 py-1">
                {w}
              </span>
            ))}
            {data.uniqueWeights.length === 0 && (
              <p className="font-mono text-[12px] text-[#3a3a47]">None detected</p>
            )}
          </div>
        </div>
      </div>

      {/* Line-height issues */}
      <div className="bg-[#111114] border border-white/[0.07] p-5">
        <p className="font-mono text-[10px] text-[#3a3a47] tracking-[0.08em] mb-4">
          LINE-HEIGHT INCONSISTENCIES ({data.lineHeightInconsistencies.length})
        </p>
        {data.lineHeightInconsistencies.length > 0 ? (
          <div className="space-y-3">
            {data.lineHeightInconsistencies.map((item, i) => (
              <div key={i} className="bg-[rgba(245,165,36,0.06)] border border-[rgba(245,165,36,0.15)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[10px] text-[#f5a524]">⚠</span>
                  <span className="font-mono text-[11px] text-[#e8e8ec]">Font size {item.size}px</span>
                </div>
                <p className="font-mono text-[10px] text-[#6b6b7a] mb-2">{item.lineHeights.length} different line-heights in use:</p>
                <div className="flex gap-2 flex-wrap">
                  {item.lineHeights.map(lh => (
                    <span key={lh} className="font-mono text-[10px] text-[#f5a524] bg-[rgba(245,165,36,0.1)] border border-[rgba(245,165,36,0.2)] px-2 py-0.5">
                      {lh}px
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 py-4 justify-center">
            <CheckCircle2 className="w-5 h-5 text-[#c8f04a]" />
            <span className="font-mono text-[12px] text-[#6b6b7a]">Line-heights are consistent</span>
          </div>
        )}
      </div>
    </div>
  );
}
