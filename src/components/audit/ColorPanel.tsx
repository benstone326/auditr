import { AuditResult } from '../../types';
import { CheckCircle2 } from 'lucide-react';

export default function ColorPanel({ data }: { data: AuditResult['colors'] }) {
  const top = data.uniqueFills.slice(0, 40);

  return (
    <div className="space-y-6">
      {/* All colors */}
      <div className="bg-[#111114] border border-white/[0.07] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[10px] text-[#3a3a47] tracking-[0.08em]">ALL DETECTED COLORS ({data.uniqueCount})</p>
          <span className={`font-mono text-[10px] px-2 py-0.5 border ${
            data.uniqueCount > 20
              ? 'text-[#ff5c5c] bg-[rgba(255,92,92,0.1)] border-[rgba(255,92,92,0.2)]'
              : data.uniqueCount > 12
              ? 'text-[#f5a524] bg-[rgba(245,165,36,0.1)] border-[rgba(245,165,36,0.2)]'
              : 'text-[#c8f04a] bg-[rgba(200,240,74,0.1)] border-[rgba(200,240,74,0.2)]'
          }`}>
            {data.uniqueCount > 20 ? 'TOO MANY' : data.uniqueCount > 12 ? 'REVIEW' : 'HEALTHY'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {top.map((hex, i) => (
            <div key={i} className="group flex flex-col items-center gap-1">
              <div
                className="w-9 h-9 border border-white/[0.08] transition-transform duration-150 group-hover:scale-110 cursor-default"
                style={{ background: hex }}
                title={hex}
              />
              <span className="font-mono text-[8px] text-[#3a3a47] group-hover:text-[#6b6b7a] transition-colors">
                {hex.replace('#','').toUpperCase()}
              </span>
            </div>
          ))}
          {data.uniqueCount > 40 && (
            <div className="w-9 h-9 border border-white/[0.08] flex items-center justify-center">
              <span className="font-mono text-[9px] text-[#6b6b7a]">+{data.uniqueCount - 40}</span>
            </div>
          )}
        </div>
      </div>

      {/* Clusters */}
      <div className="bg-[#111114] border border-white/[0.07] p-5">
        <p className="font-mono text-[10px] text-[#3a3a47] tracking-[0.08em] mb-4">
          NEAR-DUPLICATE CLUSTERS ({data.clusters.length})
        </p>
        {data.clusters.length > 0 ? (
          <div className="space-y-5">
            {data.clusters.map((cluster, ci) => (
              <div key={ci} className="bg-[#0a0a0b] border border-white/[0.05] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#ff5c5c]">⚠</span>
                    <span className="font-mono text-[11px] text-[#6b6b7a]">
                      {cluster.variants.length + 1} similar colors — should be 1 token
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-[#3a3a47]">Cluster #{ci + 1}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[cluster.baseColor, ...cluster.variants].map((hex, hi) => (
                    <div key={hi} className="flex flex-col items-center gap-1">
                      <div
                        className="w-8 h-8 border border-white/[0.1]"
                        style={{ background: hex }}
                        title={hex}
                      />
                      <span className="font-mono text-[8px] text-[#3a3a47]">{hex.replace('#','').toUpperCase()}</span>
                      <span className="font-mono text-[7px]" style={{ color: hi === 0 ? '#c8f04a' : '#f5a524' }}>
                        {hi === 0 ? 'BASE' : 'DRIFT'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 py-6 justify-center">
            <CheckCircle2 className="w-5 h-5 text-[#c8f04a]" />
            <span className="font-mono text-[12px] text-[#6b6b7a]">No near-duplicate colors found</span>
          </div>
        )}
      </div>
    </div>
  );
}
