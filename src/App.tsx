import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileJson, Download, AlertCircle, LayoutGrid, Palette, Type as TypeIcon, Boxes } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from './utils';
import { parseJsonToElements, performAudit } from './auditEngine';
import { AuditResult, DesignElement } from './types';
import ScoreRing from './components/ScoreRing';
import ColorPanel from './components/audit/ColorPanel';
import SpacingPanel from './components/audit/SpacingPanel';
import TypographyPanel from './components/audit/TypographyPanel';
import ComponentPanel from './components/audit/ComponentPanel';

type Tab = 'overview' | 'colors' | 'spacing' | 'typography' | 'components';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',    label: 'Overview',    icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { id: 'colors',      label: 'Colors',      icon: <Palette className="w-3.5 h-3.5" /> },
  { id: 'spacing',     label: 'Spacing',     icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { id: 'typography',  label: 'Typography',  icon: <TypeIcon className="w-3.5 h-3.5" /> },
  { id: 'components',  label: 'Components',  icon: <Boxes className="w-3.5 h-3.5" /> },
];

// ── Hero preview panel (landing page) ──────────────────────────────────────
function HeroPanel() {
  const swatches = ['#1a5cff','#1d5ef7','#1e62fc','#2060f5','#1a5df0','#205cf8'];
  return (
    <div className="w-full max-w-[440px] border border-white/[0.14] bg-[#111114]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-[#18181d]">
        <div className="flex gap-1.5">
          {['#ff5f57','#ffbd2e','#28c840'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{background:c}} />)}
        </div>
        <span className="font-mono text-[11px] text-[#6b6b7a]">AUDIT RESULTS — dashboard.fig</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ff5c5c] animate-pulse2" />
          <span className="font-mono text-[10px] text-[#ff5c5c]">23 issues</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {[
          {
            label: '◈ COLORS', tag: '12 ERRORS', tagClass: 'text-[#ff5c5c] bg-[rgba(255,92,92,0.1)] border-[rgba(255,92,92,0.2)]',
            content: (
              <div className="space-y-2">
                <div className="flex gap-1 flex-wrap">{swatches.map((h,i)=><div key={i} className="w-5 h-5 border border-white/[0.08]" style={{background:h}}/>)}<span className="font-mono text-[9px] text-[#3a3a47] self-center ml-1">+6</span></div>
                <p className="font-mono text-[11px] text-[#e8e8ec]">You are using <span className="text-[#c8f04a]">12 unique blues.</span> 8 within 3%.</p>
              </div>
            ),
            delay: '0.1s',
          },
          {
            label: '⊞ SPACING', tag: '5 WARNINGS', tagClass: 'text-[#f5a524] bg-[rgba(245,165,36,0.1)] border-[rgba(245,165,36,0.2)]',
            content: (
              <div className="space-y-1.5">
                {[{v:'8px',w:40,bad:false},{v:'16px',w:80,bad:false},{v:'17px',w:85,bad:true},{v:'24px',w:120,bad:false}].map((r,i)=>(
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#6b6b7a] w-9 text-right">{r.v}</span>
                    <div className="h-2" style={{width:r.w,background:r.bad?'rgba(255,92,92,0.4)':'rgba(92,164,255,0.3)',border:`1px solid ${r.bad?'rgba(255,92,92,0.3)':'rgba(92,164,255,0.2)'}`}}/>
                    {r.bad && <span className="font-mono text-[9px] text-[#ff5c5c]">⚠ off-grid</span>}
                  </div>
                ))}
              </div>
            ),
            delay: '0.25s',
          },
          {
            label: 'T TYPOGRAPHY', tag: '6 WARNINGS', tagClass: 'text-[#f5a524] bg-[rgba(245,165,36,0.1)] border-[rgba(245,165,36,0.2)]',
            content: <p className="font-mono text-[11px] text-[#e8e8ec]">You use <span className="text-[#c8f04a]">14 unique font sizes.</span> Recommended: 6–8.</p>,
            delay: '0.4s',
          },
        ].map((row) => (
          <div key={row.label} className="border border-white/[0.05] bg-[#0a0a0b] p-3.5 space-y-3 animate-slide-in" style={{animationDelay:row.delay,animationFillMode:'both'}}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-[#6b6b7a]">{row.label}</span>
              <span className={cn('font-mono text-[9px] px-2 py-0.5 border', row.tagClass)}>{row.tag}</span>
            </div>
            {row.content}
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.07] px-4 py-3 flex items-center justify-between">
        <span className="font-mono text-[11px] text-[#6b6b7a]">CONSISTENCY SCORE</span>
        <span className="font-display font-extrabold text-2xl text-[#f5a524] tracking-tight">
          42<span className="text-sm font-normal text-[#3a3a47]">/100</span>
        </span>
      </div>
    </div>
  );
}

// ── Upload / Landing page ───────────────────────────────────────────────────
function LandingPage({ onResult, error, setError }: {
  onResult: (r: AuditResult, els: DesignElement[]) => void;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const process = useCallback(async (file: File) => {
    if (!file.name.endsWith('.json')) { setError('Please upload a .json file.'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await new Promise(r => setTimeout(r, 500));
      const { elements, fileName } = parseJsonToElements(json, file.name);
      if (elements.length === 0) throw new Error('No visual elements found. Try exporting via the Figma REST API.');
      const result = performAudit(elements, fileName);
      onResult(result, elements);
    } catch (e: any) {
      setError(e.message || 'Failed to parse JSON.');
    } finally {
      setIsLoading(false);
    }
  }, [onResult, setError]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) process(file);
  }, [process]);

  const onPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) { setError('Clipboard is empty.'); return; }
      const blob = new Blob([text], { type: 'application/json' });
      process(new File([blob], 'pasted.json'));
    } catch { setError('Clipboard access denied.'); }
  }, [process, setError]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 h-16 border-b border-white/[0.07] bg-[rgba(10,10,11,0.85)] backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#c8f04a] shadow-[0_0_10px_rgba(200,240,74,0.5)] animate-pulse2" />
          <span className="font-display font-extrabold text-[18px] tracking-tight text-[#e8e8ec]">Auditr</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {['Features','How it works','Pricing'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/\s+/g,'-')}`} className="font-mono text-[12px] text-[#6b6b7a] hover:text-[#e8e8ec] transition-colors tracking-[0.04em] no-underline">{l}</a>
          ))}
        </div>
        <a href="#upload" className="font-mono text-[12px] font-semibold px-5 py-2 bg-[#c8f04a] text-[#0a0a0b] hover:bg-[#d4f55e] hover:shadow-[0_0_20px_rgba(200,240,74,0.3)] transition-all no-underline">
          Run free audit →
        </a>
      </nav>

      {/* Hero */}
      <section className="pt-16 grid grid-cols-1 lg:grid-cols-2 min-h-screen border-b border-white/[0.07]">
        <div className="flex flex-col justify-center px-10 md:px-20 py-20 lg:border-r border-white/[0.07]">
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-[#c8f04a] bg-[rgba(200,240,74,0.12)] border border-[rgba(200,240,74,0.2)] px-3.5 py-1.5 mb-10 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c8f04a] animate-pulse2" />
            DESIGN SYSTEM QUALITY CONTROL
          </motion.div>
          <motion.h1 initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="font-display font-extrabold text-[clamp(48px,5vw,72px)] leading-[1.0] tracking-[-2px] text-[#e8e8ec] mb-7">
            ESLint for<br /><em className="not-italic text-[#c8f04a]">UI design.</em>
          </motion.h1>
          <motion.p initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="text-[17px] font-light text-[#6b6b7a] leading-[1.7] max-w-md mb-12">
            Before you hand off to dev — run this. Catch color drift, spacing breaks, and component duplication before they become technical debt.
          </motion.p>
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.4}} className="flex items-center gap-5 flex-wrap">
            <a href="#upload" className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#c8f04a] text-[#0a0a0b] font-mono text-[13px] font-semibold tracking-[0.04em] no-underline hover:bg-[#d4f55e] hover:shadow-[0_8px_30px_rgba(200,240,74,0.3)] hover:-translate-y-px transition-all duration-200">
              Upload Figma JSON →
            </a>
            <a href="#features" className="inline-flex items-center gap-2 px-7 py-3.5 text-[#6b6b7a] font-mono text-[12px] tracking-[0.04em] no-underline border border-white/[0.14] hover:text-[#e8e8ec] hover:border-white/[0.25] transition-all">
              See what it catches
            </a>
          </motion.div>
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.5}} className="flex gap-10 mt-16 pt-8 border-t border-white/[0.07]">
            {[{n:'4',l:'AUDIT MODULES'},{n:'~3s',l:'ANALYSIS TIME'},{n:'100%',l:'CLIENT-SIDE'}].map(s=>(
              <div key={s.l} className="flex flex-col gap-1">
                <span className="font-display font-bold text-[28px] tracking-[-1px] text-[#e8e8ec]">{s.n}</span>
                <span className="font-mono text-[10px] text-[#6b6b7a] tracking-[0.08em]">{s.l}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="hidden lg:flex items-center justify-center px-16 py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(circle at 50% 50%, rgba(200,240,74,0.05) 0%, transparent 65%)'}} />
          <HeroPanel />
        </div>
      </section>

      {/* Problem */}
      <section className="px-10 md:px-20 py-28 border-b border-white/[0.07]">
        <p className="font-mono text-[11px] tracking-[0.12em] text-[#6b6b7a] mb-4">// THE PROBLEM</p>
        <h2 className="font-display font-extrabold text-[clamp(36px,4vw,56px)] tracking-[-2px] leading-[1.05] text-[#e8e8ec] max-w-xl mb-14">
          Inconsistency is invisible — until it isn't.
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.07] border border-white/[0.07]">
          {[
            {n:'6',c:'#ff5c5c',l:'COLORS',d:'button variations over 6 months of iteration'},
            {n:'4',c:'#f5a524',l:'BORDER RADIUS',d:'slightly different corners: 6px, 7px, 8px, 10px'},
            {n:'12',c:'#5ca4ff',l:'BRAND BLUES',d:'near-identical hex values instead of one token'},
            {n:'14',c:'#e8e8ec',l:'FONT SIZES',d:'unique sizes where 6–8 would be enough'},
          ].map(item=>(
            <div key={item.l} className="bg-[#111114] px-7 py-8 flex flex-col gap-4">
              <span className="font-mono text-[10px] text-[#3a3a47] tracking-[0.08em]">{item.l}</span>
              <span className="font-display font-extrabold text-[42px] leading-none tracking-[-2px]" style={{color:item.c}}>{item.n}</span>
              <p className="text-[13px] font-light text-[#6b6b7a] leading-relaxed">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-10 md:px-20 py-20 border-b border-white/[0.07]">
        <p className="font-mono text-[11px] tracking-[0.12em] text-[#6b6b7a] mb-4">// AUDIT MODULES</p>
        <h2 className="font-display font-extrabold text-[clamp(36px,4vw,56px)] tracking-[-2px] leading-[1.05] text-[#e8e8ec] max-w-xl mb-14">Four layers of quality control.</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.07] border border-white/[0.07]">
          {[
            {icon:'◈',title:'Color Analysis',desc:'Detects near-identical hex values, palette drift, and hard-coded colors that should be design tokens.',lines:[{t:'err',m:'12 unique blues — 8 within 3% similarity'},{t:'wrn',m:'3 colors outside token set'},{t:'ok',m:'Primary palette coverage: 94%'}]},
            {icon:'⊞',title:'Spacing System',desc:'Auto-detects your grid base (4/8/10/12px) then flags every element that breaks it.',lines:[{t:'ok',m:'8px base grid detected'},{t:'err',m:'11 elements off-grid (17px, 13px...)'},{t:'wrn',m:'Inconsistent gap in card components'}]},
            {icon:'T',title:'Typography Audit',desc:'Counts unique font sizes, weights, line-heights. Flags heading hierarchy breakdowns.',lines:[{t:'err',m:'14 unique font sizes — recommended: 6–8'},{t:'wrn',m:'H3 before H2 on 4 screens'},{t:'ok',m:'Single font family used consistently'}]},
            {icon:'◻',title:'Component Clustering',desc:'Reveals when you have 6 "primary buttons" that should be one component with variants.',lines:[{t:'err',m:'6 button variants — 4 identical'},{t:'err',m:'3 card components — likely duplicates'},{t:'ok',m:'Form inputs consistent: 14 instances'}]},
          ].map(feat=>(
            <div key={feat.title} className="bg-[#0a0a0b] p-12 flex flex-col gap-6 hover:bg-[#111114] transition-colors cursor-default">
              <div className="w-10 h-10 border border-white/[0.14] flex items-center justify-center text-lg text-[#6b6b7a]">{feat.icon}</div>
              <h3 className="font-display font-bold text-[22px] tracking-[-0.5px] text-[#e8e8ec]">{feat.title}</h3>
              <p className="text-[14px] font-light text-[#6b6b7a] leading-[1.7]">{feat.desc}</p>
              <div className="bg-[#18181d] border border-white/[0.07] p-3.5 space-y-1.5">
                {feat.lines.map((line,i)=>(
                  <div key={i} className="flex gap-2.5 font-mono text-[11px]">
                    <span className={line.t==='err'?'text-[#ff5c5c]':line.t==='wrn'?'text-[#f5a524]':'text-[#c8f04a]'}>
                      {line.t==='err'?'ERROR':line.t==='wrn'?'WARN ':'PASS '}
                    </span>
                    <span className="text-[#e8e8ec]">{line.m}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-10 md:px-20 py-20 border-b border-white/[0.07]">
        <p className="font-mono text-[11px] tracking-[0.12em] text-[#6b6b7a] mb-4">// WORKFLOW</p>
        <h2 className="font-display font-extrabold text-[clamp(36px,4vw,56px)] tracking-[-2px] leading-[1.05] text-[#e8e8ec] max-w-xl mb-14">Three steps. No integration.</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.07] border border-white/[0.07]">
          {[
            {n:'01',t:'Upload Figma JSON',d:'Export via the Figma REST API or use a plugin. No Figma account needed on our end.'},
            {n:'02',t:'Analysis runs in browser',d:'Color clustering, spacing detection, typography counting — 100% client-side. Your file never leaves your machine.'},
            {n:'03',t:'Review the report',d:'Every issue ranked by severity. See your score, drill into each module, and fix before handoff.'},
          ].map(s=>(
            <div key={s.n} className="bg-[#0a0a0b] p-12 flex flex-col gap-5 hover:bg-[#111114] transition-colors">
              <span className="font-mono text-[11px] text-[#3a3a47] tracking-[0.1em]">STEP {s.n} /</span>
              <h3 className="font-display font-bold text-[20px] tracking-[-0.5px] text-[#e8e8ec]">{s.t}</h3>
              <p className="text-[14px] font-light text-[#6b6b7a] leading-[1.7]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upload CTA */}
      <section id="upload" className="px-10 md:px-20 py-20 border-b border-white/[0.07] flex flex-col items-center text-center gap-8">
        <p className="font-mono text-[11px] tracking-[0.12em] text-[#6b6b7a]">// TRY IT FREE</p>
        <h2 className="font-display font-extrabold text-[clamp(36px,4vw,56px)] tracking-[-2px] leading-[1.05] text-[#e8e8ec] max-w-lg">Drop your file.<br />Get your score.</h2>

        <AnimatePresence>
          {error && (
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
              className="w-full max-w-xl bg-[rgba(255,92,92,0.08)] border border-[rgba(255,92,92,0.2)] p-4 flex items-center gap-3 text-[#ff5c5c]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-mono text-[12px] flex-1">{error}</span>
              <button onClick={()=>setError(null)} className="font-mono text-[11px] underline">dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload zone */}
        <div
          className={cn(
            'relative w-full max-w-xl border border-dashed transition-all duration-300 cursor-pointer group',
            isDragging
              ? 'border-[rgba(200,240,74,0.6)] bg-[rgba(200,240,74,0.06)]'
              : 'border-white/[0.14] bg-[#111114] hover:border-[rgba(200,240,74,0.4)] hover:bg-[rgba(200,240,74,0.03)]'
          )}
          onDragOver={e=>{e.preventDefault();setIsDragging(true)}}
          onDragLeave={()=>setIsDragging(false)}
          onDrop={onDrop}
          onClick={()=>document.getElementById('file-input')?.click()}
          role="button" tabIndex={0}
          onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')document.getElementById('file-input')?.click()}}
          aria-label="Upload Figma JSON"
        >
          <input id="file-input" type="file" accept=".json" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)process(f)}} />
          <div className="flex flex-col items-center gap-4 py-16 px-10">
            {isLoading ? (
              <>
                <div className="w-12 h-12 border border-white/[0.14] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#c8f04a] animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
                <span className="font-mono text-[13px] text-[#6b6b7a]">Analysing design file...</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[#6b6b7a] group-hover:text-[#c8f04a] transition-colors duration-300" />
                <div className="space-y-2">
                  <p className="font-mono text-[13px] text-[#6b6b7a]">Drag your Figma JSON here — or click to browse</p>
                  <p className="font-mono text-[11px] text-[#3a3a47]">Supports Figma REST API export · .json</p>
                  <p className="font-mono text-[11px] text-[#3a3a47]">Processed 100% in your browser</p>
                </div>
              </>
            )}
          </div>
        </div>

        <button
          onClick={onPaste}
          className="flex items-center gap-2 font-mono text-[12px] text-[#6b6b7a] border border-white/[0.1] px-4 py-2 hover:text-[#e8e8ec] hover:border-white/[0.2] transition-all"
        >
          <FileJson className="w-4 h-4" />
          Or paste JSON from clipboard
        </button>
      </section>

      {/* Footer */}
      <footer className="px-10 md:px-20 py-10 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 font-display font-extrabold text-[16px] text-[#6b6b7a] tracking-tight">
          <span className="w-2 h-2 rounded-full bg-[#3a3a47] inline-block" />
          Auditr
        </div>
        <span className="font-mono text-[11px] text-[#3a3a47]">© 2026 Auditr. All rights reserved.</span>
        <div className="flex gap-6">
          {['Privacy','Terms','Docs'].map(l=>(
            <a key={l} href="#" className="font-mono text-[11px] text-[#3a3a47] no-underline hover:text-[#6b6b7a] transition-colors">{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}

// ── Audit Dashboard ─────────────────────────────────────────────────────────
function AuditDashboard({ result, elements, onReset }: { result: AuditResult; elements: DesignElement[]; onReset: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    const el = document.getElementById('audit-report');
    if (!el) return;
    setIsExporting(true);
    await new Promise(r => setTimeout(r, 300));
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#0a0a0b' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`auditr-report-${result.fileName.replace('.json','')}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) { console.error('Export failed:', e); }
    finally { setIsExporting(false); }
  };

  const tabErrors: Record<Tab, number> = {
    overview: 0,
    colors: result.colors.clusters.filter(c=>c.variants.length>=2).length,
    spacing: result.spacing.violations.length > 5 ? 1 : 0,
    typography: result.typography.uniqueSizes.length > 12 ? 1 : 0,
    components: result.components.duplicateCount > 3 ? 1 : 0,
  };
  const tabWarns: Record<Tab, number> = {
    overview: 0,
    colors: result.colors.clusters.filter(c=>c.variants.length===1).length,
    spacing: result.spacing.violations.length > 0 && result.spacing.violations.length <= 5 ? result.spacing.violations.length : 0,
    typography: (result.typography.uniqueSizes.length > 8 && result.typography.uniqueSizes.length <= 12 ? 1 : 0) + result.typography.lineHeightInconsistencies.length,
    components: result.components.duplicateCount > 0 && result.components.duplicateCount <= 3 ? result.components.duplicateCount : 0,
  };

  const chartData = [
    { name: 'Colors',     count: result.colors.clusters.length,           color: '#ff5c5c' },
    { name: 'Spacing',    count: result.spacing.violations.length,         color: '#f5a524' },
    { name: 'Typography', count: result.typography.lineHeightInconsistencies.length + Math.max(0, result.typography.uniqueSizes.length - 8), color: '#5ca4ff' },
    { name: 'Components', count: result.components.duplicateCount,         color: '#c8f04a' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[rgba(10,10,11,0.85)] backdrop-blur-xl border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#c8f04a] animate-pulse2" />
              <span className="font-display font-extrabold text-[18px] tracking-tight text-[#e8e8ec]">Auditr</span>
            </div>
            <span className="font-mono text-[11px] text-[#3a3a47]">/</span>
            <span className="font-mono text-[12px] text-[#6b6b7a] max-w-[200px] truncate">{result.fileName}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onReset} className="font-mono text-[11px] text-[#6b6b7a] border border-white/[0.1] px-3 py-1.5 hover:text-[#e8e8ec] hover:border-white/[0.2] transition-all">
              ← New audit
            </button>
            <button
              onClick={handleExport} disabled={isExporting}
              className="flex items-center gap-2 font-mono text-[11px] font-semibold px-4 py-1.5 bg-[#c8f04a] text-[#0a0a0b] hover:bg-[#d4f55e] transition-all disabled:opacity-50"
            >
              {isExporting ? <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : <Download className="w-3.5 h-3.5" />}
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>
      </header>

      <main id="audit-report" className="max-w-6xl mx-auto px-8 py-10">
        {/* Score + stats */}
        <div className="grid grid-cols-[auto_1fr] gap-8 mb-10 items-start animate-fade-up">
          <ScoreRing score={result.summary.score} size={130} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.07] border border-white/[0.07]">
            {[
              {label:'ERRORS',   value:result.summary.criticalIssues, color:'#ff5c5c', bg:'rgba(255,92,92,0.08)'},
              {label:'WARNINGS', value:result.summary.warnings,        color:'#f5a524', bg:'rgba(245,165,36,0.08)'},
              {label:'PASSED',   value:result.summary.passes,          color:'#c8f04a', bg:'rgba(200,240,74,0.08)'},
              {label:'ELEMENTS', value:elements.length,                 color:'#5ca4ff', bg:'rgba(92,164,255,0.08)'},
            ].map(s=>(
              <div key={s.label} className="flex flex-col gap-1 p-6" style={{background:s.bg}}>
                <span className="font-display font-extrabold text-4xl tracking-tight" style={{color:s.color}}>{s.value}</span>
                <span className="font-mono text-[10px] tracking-[0.1em]" style={{color:s.color,opacity:.7}}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div data-html2canvas-ignore className="flex border-b border-white/[0.07] mb-6">
          {TABS.map(tab => {
            const errs = tabErrors[tab.id];
            const warns = tabWarns[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3.5 font-mono text-[12px] tracking-[0.04em] border-b-2 transition-all duration-200',
                  isActive ? 'border-[#c8f04a] text-[#e8e8ec]' : 'border-transparent text-[#6b6b7a] hover:text-[#e8e8ec] hover:border-white/[0.2]'
                )}>
                {tab.icon}
                <span>{tab.label}</span>
                {errs > 0 && <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[rgba(255,92,92,0.15)] text-[#ff5c5c] border border-[rgba(255,92,92,0.2)]">{errs}</span>}
                {warns > 0 && errs === 0 && <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[rgba(245,165,36,0.12)] text-[#f5a524] border border-[rgba(245,165,36,0.2)]">{warns}</span>}
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.2}}>

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Bar chart */}
                  <div className="bg-[#111114] border border-white/[0.07] p-6">
                    <p className="font-mono text-[10px] text-[#3a3a47] tracking-[0.08em] mb-6">ISSUE DISTRIBUTION BY MODULE</p>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} onClick={d => { if (d?.activePayload?.[0]?.payload?.name) { const n = d.activePayload[0].payload.name.toLowerCase() as Tab; if (n !== 'overview') setActiveTab(n); } }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b6b7a', fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b6b7a', fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                          <Tooltip contentStyle={{ background: '#18181d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#e8e8ec' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                          <Bar dataKey="count" radius={[2,2,0,0]} className="cursor-pointer">
                            {chartData.map((d,i) => <Cell key={i} fill={d.color} fillOpacity={0.7} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Key findings */}
                  <div className="bg-[#111114] border border-white/[0.07] p-6">
                    <p className="font-mono text-[10px] text-[#3a3a47] tracking-[0.08em] mb-4">KEY FINDINGS</p>
                    <div className="space-y-1.5">
                      {[
                        result.colors.clusters.length > 0 && { sev:'error', msg:`${result.colors.clusters.length} near-duplicate color cluster${result.colors.clusters.length>1?'s':''} detected`, tab:'colors' as Tab },
                        result.spacing.violations.length > 0 && { sev:'error', msg:`${result.spacing.violations.length} spacing values break the ${result.spacing.gridBase}px grid`, tab:'spacing' as Tab },
                        result.typography.uniqueSizes.length > 8 && { sev:'warning', msg:`${result.typography.uniqueSizes.length} font sizes — aim for 6–8`, tab:'typography' as Tab },
                        result.typography.lineHeightInconsistencies.length > 0 && { sev:'warning', msg:`${result.typography.lineHeightInconsistencies.length} line-height inconsistenc${result.typography.lineHeightInconsistencies.length>1?'ies':'y'}`, tab:'typography' as Tab },
                        result.components.duplicateCount > 0 && { sev:'warning', msg:`${result.components.duplicateCount} potential duplicate component${result.components.duplicateCount>1?'s':''}`, tab:'components' as Tab },
                        result.colors.clusters.length === 0 && { sev:'pass', msg:'No near-duplicate colors found', tab:'colors' as Tab },
                        result.spacing.violations.length === 0 && { sev:'pass', msg:`All spacing follows the ${result.spacing.gridBase}px grid`, tab:'spacing' as Tab },
                      ].filter(Boolean).map((item: any, i) => (
                        <button key={i} onClick={()=>setActiveTab(item.tab)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#0a0a0b] border border-white/[0.05] hover:bg-white/[0.02] transition-colors text-left">
                          <span className={cn('font-mono text-[9px] px-1.5 py-0.5 border shrink-0',
                            item.sev==='error'  ? 'text-[#ff5c5c] bg-[rgba(255,92,92,0.1)] border-[rgba(255,92,92,0.2)]'
                            : item.sev==='warning' ? 'text-[#f5a524] bg-[rgba(245,165,36,0.1)] border-[rgba(245,165,36,0.2)]'
                            : 'text-[#c8f04a] bg-[rgba(200,240,74,0.1)] border-[rgba(200,240,74,0.2)]')}>
                            {item.sev==='error'?'ERROR':item.sev==='warning'?'WARN':'PASS'}
                          </span>
                          <span className="font-mono text-[12px] text-[#e8e8ec]">{item.msg}</span>
                          <span className="ml-auto font-mono text-[10px] text-[#3a3a47]">→ {item.tab}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-[#c8f04a] p-6">
                    <p className="font-display font-bold text-[14px] text-[#0a0a0b] mb-2">Score: {result.summary.score}/100</p>
                    <p className="text-[13px] text-[#0a0a0b]/70 leading-relaxed mb-4">
                      {result.summary.score >= 80
                        ? 'Great shape. A few minor tweaks before handoff.'
                        : result.summary.score >= 60
                        ? 'Some drift detected. Address the errors before dev handoff.'
                        : 'Significant inconsistencies found. Review all modules carefully.'}
                    </p>
                    <div className="h-1 bg-[#0a0a0b]/20 w-full"><div className="h-full bg-[#0a0a0b]" style={{width:`${result.summary.score}%`}} /></div>
                  </div>

                  <div className="bg-[#111114] border border-white/[0.07] p-5">
                    <p className="font-mono text-[10px] text-[#3a3a47] tracking-[0.08em] mb-4">AUDIT CONFIG</p>
                    <div className="space-y-3">
                      {[
                        {l:'Grid base',v:`${result.spacing.gridBase}px`},
                        {l:'Color tolerance',v:'8% HSL'},
                        {l:'Max font sizes',v:'8 recommended'},
                        {l:'Elements parsed',v:String(elements.length)},
                      ].map(r=>(
                        <div key={r.l} className="flex justify-between items-center">
                          <span className="font-mono text-[11px] text-[#6b6b7a]">{r.l}</span>
                          <span className="font-mono text-[11px] text-[#e8e8ec] bg-[#0a0a0b] border border-white/[0.05] px-2 py-0.5">{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'colors'     && <ColorPanel     data={result.colors} />}
            {activeTab === 'spacing'    && <SpacingPanel   data={result.spacing} elements={elements} />}
            {activeTab === 'typography' && <TypographyPanel data={result.typography} />}
            {activeTab === 'components' && <ComponentPanel  data={result.components} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────
export default function App() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [elements, setElements] = useState<DesignElement[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleResult = useCallback((r: AuditResult, els: DesignElement[]) => {
    setResult(r);
    setElements(els);
    setError(null);
    window.scrollTo(0, 0);
  }, []);

  if (result) {
    return <AuditDashboard result={result} elements={elements} onReset={() => { setResult(null); setElements([]); }} />;
  }

  return <LandingPage onResult={handleResult} error={error} setError={setError} />;
}
