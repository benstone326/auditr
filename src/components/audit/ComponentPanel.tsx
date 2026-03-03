import { AuditResult } from '../../types';
import { CheckCircle2 } from 'lucide-react';

export default function ComponentPanel({ data }: { data: AuditResult['components'] }) {
  const sorted = [...data.all].sort((a, b) => b.instanceCount - a.instanceCount);

  return (
    <div className="space-y-6">
      <div className="bg-[#111114] border border-white/[0.07] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[10px] text-[#3a3a47] tracking-[0.08em]">
            ALL COMPONENTS ({data.all.length})
          </p>
          {data.duplicateCount > 0 && (
            <span className="font-mono text-[10px] text-[#ff5c5c] bg-[rgba(255,92,92,0.1)] border border-[rgba(255,92,92,0.2)] px-2 py-0.5">
              {data.duplicateCount} DUPLICATES
            </span>
          )}
        </div>

        {data.all.length > 0 ? (
          <div className="space-y-1.5">
            {sorted.map((comp, i) => (
              <div key={i} className={`flex items-center justify-between px-3 py-2.5 border transition-colors ${
                comp.isDuplicate
                  ? 'bg-[rgba(255,92,92,0.04)] border-[rgba(255,92,92,0.15)] hover:bg-[rgba(255,92,92,0.08)]'
                  : 'bg-[#0a0a0b] border-white/[0.05] hover:bg-white/[0.02]'
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  {comp.isDuplicate && (
                    <span className="font-mono text-[9px] text-[#ff5c5c] bg-[rgba(255,92,92,0.1)] border border-[rgba(255,92,92,0.2)] px-1.5 py-0.5 shrink-0">DUP</span>
                  )}
                  <span className="font-mono text-[12px] text-[#e8e8ec] truncate">{comp.name}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="font-mono text-[10px] text-[#3a3a47]">{comp.count}× defined</span>
                  {comp.instanceCount > 0 && (
                    <span className="font-mono text-[10px] text-[#5ca4ff]">{comp.instanceCount}× used</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 justify-center text-center">
            <CheckCircle2 className="w-5 h-5 text-[#6b6b7a]" />
            <p className="font-mono text-[12px] text-[#6b6b7a]">No components detected.</p>
            <p className="font-mono text-[11px] text-[#3a3a47]">Export via the Figma REST API for full component data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
