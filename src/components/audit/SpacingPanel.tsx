import { AuditResult, DesignElement } from '../../types';
import { CheckCircle2 } from 'lucide-react';

export default function SpacingPanel({ data, elements }: { data: AuditResult['spacing']; elements: DesignElement[] }) {
  const top = data.allValues.slice(0, 24);
  const maxCount = Math.max(...top.map(v => v.count), 1);

  return (
    <div className="space-y-6">
      {/* Grid detection */}
      <div className="bg-[#111114] border border-white/[0.07] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[10px] text-[#3a3a47] tracking-[0.08em]">DETECTED BASE GRID</p>
          <span className="font-mono text-[10px] text-[#c8f04a] bg-[rgba(200,240,74,0.1)] border border-[rgba(200,240,74,0.2)] px-2 py-0.5">
            {data.gridBase}PX SYSTEM
          </span>
        </div>
        {top.length > 0 ? (
          <div className="space-y-2">
            {top.map((v, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="font-mono text-[11px] w-12 text-right shrink-0" style={{ color: v.isOff ? '#ff5c5c' : '#6b6b7a' }}>
                  {v.value}px
                </span>
                <div className="flex-1 h-2 bg-white/[0.04]">
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${Math.max((v.count / maxCount) * 100, 3)}%`,
                      background: v.isOff ? 'rgba(255,92,92,0.5)' : 'rgba(92,164,255,0.35)',
                      borderRight: `2px solid ${v.isOff ? '#ff5c5c' : '#5ca4ff'}`,
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 w-32 shrink-0">
                  <span className="font-mono text-[10px] text-[#3a3a47]">×{v.count}</span>
                  {v.isOff && (
                    <span className="font-mono text-[9px] text-[#ff5c5c] bg-[rgba(255,92,92,0.1)] border border-[rgba(255,92,92,0.2)] px-1.5 py-0.5">
                      → {Math.round(v.value / data.gridBase) * data.gridBase}px
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-mono text-[12px] text-[#6b6b7a] text-center py-4">No spacing values detected. Use Auto Layout in Figma.</p>
        )}
      </div>

      {/* Violations table */}
      <div className="bg-[#111114] border border-white/[0.07] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[10px] text-[#3a3a47] tracking-[0.08em]">
            GRID VIOLATIONS ({data.violations.length})
          </p>
          {data.violations.length > 0 && (
            <span className="font-mono text-[10px] text-[#ff5c5c] bg-[rgba(255,92,92,0.1)] border border-[rgba(255,92,92,0.2)] px-2 py-0.5">
              {data.violations.length} OFF-GRID
            </span>
          )}
        </div>
        {data.violations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {['Element', 'Property', 'Value', 'Fix'].map(h => (
                    <th key={h} className="pb-2 pr-4 font-mono text-[9px] text-[#3a3a47] tracking-[0.1em]">{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.violations.map((v, i) => {
                  const el = elements.find(e => e.id === v.elementId);
                  return (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 pr-4 font-mono text-[11px] text-[#e8e8ec] max-w-[180px] truncate">{el?.name ?? 'Unknown'}</td>
                      <td className="py-2.5 pr-4 font-mono text-[11px] text-[#6b6b7a]">{v.property}</td>
                      <td className="py-2.5 pr-4 font-mono text-[11px] text-[#ff5c5c] font-medium">{v.value}px</td>
                      <td className="py-2.5 font-mono text-[11px] text-[#c8f04a]">→ {v.nearest}px</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-6 justify-center">
            <CheckCircle2 className="w-5 h-5 text-[#c8f04a]" />
            <span className="font-mono text-[12px] text-[#6b6b7a]">All spacing follows the {data.gridBase}px grid</span>
          </div>
        )}
      </div>
    </div>
  );
}
