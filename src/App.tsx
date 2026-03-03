import React, { useState, useMemo } from 'react';
import { 
  LayoutGrid, 
  Palette, 
  Type as TypeIcon, 
  AlertCircle, 
  CheckCircle2, 
  Upload, 
  FileJson, 
  ArrowRight,
  Download,
  Info,
  ChevronRight,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { cn, figmaRgbToHex } from './utils';
import { performAudit } from './auditEngine';
import { DesignElement, AuditResult } from './types';

// --- Components ---

const StatCard = ({ title, value, subValue, icon: Icon, trend, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm text-left transition-all",
      onClick && "hover:border-zinc-400 hover:shadow-md cursor-pointer active:scale-[0.98]"
    )}
  >
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
        <Icon className="w-5 h-5 text-zinc-600" />
      </div>
      {trend && (
        <span className={cn(
          "text-xs font-medium px-2 py-1 rounded-full",
          trend === 'good' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        )}>
          {trend === 'good' ? 'Healthy' : 'Needs Review'}
        </span>
      )}
    </div>
    <div className="space-y-1">
      <h3 className="text-zinc-500 text-sm font-medium">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</span>
        {subValue && <span className="text-zinc-400 text-sm">{subValue}</span>}
      </div>
    </div>
  </button>
);

const AuditSection = ({ title, description, children, icon: Icon }: any) => (
  <section className="space-y-6 mb-12">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-zinc-900 rounded-lg">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
        <p className="text-zinc-500 text-sm">{description}</p>
      </div>
    </div>
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
      {children}
    </div>
  </section>
);

// --- Main App ---

export default function App() {
  const [elements, setElements] = useState<DesignElement[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'colors' | 'typography' | 'spacing'>('overview');

  const auditResult = useMemo(() => {
    if (!elements) return null;
    return performAudit(elements);
  }, [elements]);

  const handleExport = async () => {
    const element = document.getElementById('audit-report');
    if (!element) return;

    setIsExporting(true);
    // Small delay to ensure any hover states or transitions are settled
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F9FAFB'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`design-audit-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const processData = (jsonString: string) => {
    try {
      let data = JSON.parse(jsonString);
      
      if (typeof data !== 'object' || data === null) {
        throw new Error("Invalid format: Expected a JSON object or array.");
      }

      let rawElements: any[] = [];

      // 1. Flatten Figma Tree if detected
      const flatten = (node: any) => {
        if (!node) return;
        rawElements.push(node);
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach(flatten);
        }
      };

      if (data.document || (data.type && data.children)) {
        flatten(data.document || data);
      } else if (Array.isArray(data)) {
        rawElements = data;
      } else {
        rawElements = [data];
      }

      // 2. Normalize to DesignElement[]
      const normalized: DesignElement[] = rawElements.map((item: any, index: number): DesignElement | null => {
        // Skip root document/canvas nodes for visual audit
        if (item.type === 'DOCUMENT' || item.type === 'CANVAS') return null;

        // Extract fills (handle both Hex strings and Figma RGB objects)
        const fills: string[] = [];
        if (item.fills && Array.isArray(item.fills)) {
          item.fills.forEach((f: any) => {
            if (typeof f === 'string' && f.startsWith('#')) {
              fills.push(f);
            } else if (f.type === 'SOLID' && f.color) {
              fills.push(figmaRgbToHex(f.color.r, f.color.g, f.color.b));
            }
          });
        }

        // Handle the user's specific token format: {"Name": {"value": "#HEX"}}
        const keys = Object.keys(item);
        if (keys.length === 1 && item[keys[0]]?.value) {
          const val = item[keys[0]].value;
          if (typeof val === 'string' && val.startsWith('#')) {
            fills.push(val);
          }
        }

        // Extract Typography
        const fontSize = item.fontSize || item.style?.fontSize;
        const lineHeight = item.lineHeight || item.style?.lineHeightPx;
        const fontWeight = item.fontWeight || item.style?.fontWeight;

        // Extract Spacing/Bounds
        const width = item.width || item.absoluteBoundingBox?.width || 0;
        const height = item.height || item.absoluteBoundingBox?.height || 0;
        
        // Figma specific padding
        const padding = (item.paddingLeft || item.paddingRight || item.paddingTop || item.paddingBottom) ? {
          top: item.paddingTop || 0,
          right: item.paddingRight || 0,
          bottom: item.paddingBottom || 0,
          left: item.paddingLeft || 0
        } : undefined;

        // If we found absolutely nothing useful, return null
        if (fills.length === 0 && !fontSize && !padding && width === 0) return null;

        return {
          id: item.id || `el-${index}`,
          name: item.name || keys[0] || `Element ${index}`,
          type: item.type || 'RECTANGLE',
          fills,
          opacity: item.opacity ?? 1,
          fontSize,
          lineHeight,
          fontWeight,
          padding,
          width,
          height,
          borderRadius: item.cornerRadius || item.borderRadius
        };
      }).filter((el): el is DesignElement => el !== null);

      if (normalized.length === 0) {
        throw new Error("No visual elements or tokens could be extracted from this file.");
      }

      setElements(normalized);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to parse JSON. Please ensure the format is correct.");
      setElements(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processData(content);
    };
    reader.onerror = () => {
      setError("Failed to read file.");
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setError("Clipboard is empty.");
        return;
      }
      setIsUploading(true);
      processData(text);
    } catch (err) {
      setError("Failed to read from clipboard. Please ensure you have granted permission.");
    }
  };

  if (!elements) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full text-center space-y-8"
        >
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 text-white text-xs font-medium">
              <LayoutGrid className="w-3 h-3" />
              <span>Design System Linter v1.0</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-zinc-900">
              Audit your design system <br />
              <span className="text-zinc-400">before handoff.</span>
            </h1>
            <p className="text-zinc-500 text-lg max-w-lg mx-auto">
              Upload your Figma JSON or paste your tokens to detect color drift, 
              spacing breaks, and typography inconsistencies in seconds.
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 text-sm text-left"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="group relative flex flex-col items-center justify-center p-12 border-2 border-dashed border-zinc-200 rounded-3xl bg-white hover:border-zinc-400 hover:bg-zinc-50 transition-all cursor-pointer">
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".json" />
              <div className="p-4 bg-zinc-50 rounded-2xl group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-zinc-400" />
              </div>
              <span className="mt-4 font-medium text-zinc-900">Upload JSON</span>
              <span className="text-zinc-400 text-sm">Figma export or tokens</span>
            </label>

            <button 
              onClick={handlePaste}
              className="group flex flex-col items-center justify-center p-12 border border-zinc-200 rounded-3xl bg-white hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-200/50 transition-all"
            >
              <div className="p-4 bg-zinc-50 rounded-2xl group-hover:scale-110 transition-transform">
                <FileJson className="w-8 h-8 text-zinc-400" />
              </div>
              <span className="mt-4 font-medium text-zinc-900">Paste Tokens</span>
              <span className="text-zinc-400 text-sm">Quick audit from clipboard</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 pt-8 border-t border-zinc-100">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Palette className="w-4 h-4" />
              <span>Color Drift</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <LayoutGrid className="w-4 h-4" />
              <span>Grid Violations</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <TypeIcon className="w-4 h-4" />
              <span>Type Drift</span>
            </div>
          </div>
        </motion.div>

        {isUploading && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
              <p className="font-medium text-zinc-900">Analyzing your design system...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-zinc-900 tracking-tight">DS Linter</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setElements(null)}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              New Audit
            </button>
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isExporting ? 'Generating...' : 'Export Report'}
            </button>
          </div>
        </div>
      </header>

      <main id="audit-report" className="max-w-7xl mx-auto px-6 py-10">
        {/* Summary Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Audit Overview</h1>
            <p className="text-zinc-500">Analysis of {elements.length} elements detected in your design tokens.</p>
          </div>
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="text-right">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Consistency Score</p>
              <p className="text-2xl font-bold text-zinc-900">{auditResult.summary.score}/100</p>
            </div>
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              auditResult.summary.score > 80 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
            )}>
              {auditResult.summary.score > 80 ? <CheckCircle2 className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard 
            title="Unique Colors" 
            value={auditResult.colors.uniqueCount} 
            subValue="Detected"
            icon={Palette}
            trend={auditResult.colors.clusters.length === 0 ? 'good' : 'bad'}
            onClick={() => setActiveTab('colors')}
          />
          <StatCard 
            title="Font Sizes" 
            value={auditResult.typography.uniqueSizes.length} 
            subValue="Scale"
            icon={TypeIcon}
            trend={auditResult.typography.uniqueSizes.length < 10 ? 'good' : 'bad'}
            onClick={() => setActiveTab('typography')}
          />
          <StatCard 
            title="Grid Violations" 
            value={auditResult.spacing.violations.length} 
            subValue="Elements"
            icon={LayoutGrid}
            trend={auditResult.spacing.violations.length === 0 ? 'good' : 'bad'}
            onClick={() => setActiveTab('spacing')}
          />
          <StatCard 
            title="Critical Issues" 
            value={auditResult.summary.criticalIssues} 
            subValue="Found"
            icon={AlertCircle}
            trend={auditResult.summary.criticalIssues === 0 ? 'good' : 'bad'}
            onClick={() => setActiveTab('overview')}
          />
        </div>

        {/* Tabs */}
        <div data-html2canvas-ignore className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl w-fit mb-8">
          {(['overview', 'colors', 'typography', 'spacing'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                activeTab === tab 
                  ? "bg-white text-zinc-900 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white border border-zinc-200 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 mb-6">Issue Distribution</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Colors', count: auditResult.colors.clusters.length * 2 },
                        { name: 'Type', count: auditResult.typography.lineHeightInconsistencies.length * 3 },
                        { name: 'Spacing', count: auditResult.spacing.violations.length },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F1F1" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip 
                          cursor={{ fill: '#F8FAFC' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar 
                          dataKey="count" 
                          radius={[4, 4, 0, 0]}
                          onClick={(data) => {
                            if (data.name === 'Colors') setActiveTab('colors');
                            if (data.name === 'Type') setActiveTab('typography');
                            if (data.name === 'Spacing') setActiveTab('spacing');
                          }}
                          className="cursor-pointer"
                        >
                          { [0, 1, 2].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#F43F5E', '#F59E0B', '#3B82F6'][index]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 mb-4">Recent Critical Findings</h3>
                  <div className="divide-y divide-zinc-100">
                    {auditResult.colors.clusters.map((cluster, i) => (
                      <button 
                        key={i} 
                        onClick={() => setActiveTab('colors')}
                        className="w-full py-4 flex items-center justify-between group cursor-pointer hover:bg-zinc-50/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: cluster.baseColor }} />
                            {cluster.variants.map((v, vi) => (
                              <div key={vi} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: v }} />
                            ))}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900">Color Drift Detected</p>
                            <p className="text-xs text-zinc-500">{cluster.variants.length + 1} similar colors found near {cluster.baseColor}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
                      </button>
                    ))}
                    {auditResult.spacing.violations.slice(0, 3).map((v, i) => (
                      <button 
                        key={i} 
                        onClick={() => setActiveTab('spacing')}
                        className="w-full py-4 flex items-center justify-between group cursor-pointer hover:bg-zinc-50/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                            <LayoutGrid className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900">Grid Violation: {v.value}px</p>
                            <p className="text-xs text-zinc-500">Property {v.property} breaks the {auditResult.spacing.gridBase}px grid</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-900 rounded-2xl p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">Linter Tip</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                    Your design system is currently 82% consistent. Most issues stem from hard-coded spacing values in button components.
                  </p>
                  <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors">
                    View Optimization Guide
                  </button>
                </div>
                
                <div className="bg-white border border-zinc-200 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-4 uppercase tracking-wider">Audit Config</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500">Grid Base</span>
                      <span className="text-sm font-mono font-medium bg-zinc-50 px-2 py-1 rounded border border-zinc-100">8px</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500">Color Tolerance</span>
                      <span className="text-sm font-mono font-medium bg-zinc-50 px-2 py-1 rounded border border-zinc-100">4%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500">Type Scale</span>
                      <span className="text-sm font-mono font-medium bg-zinc-50 px-2 py-1 rounded border border-zinc-100">Major Third</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'colors' && (
            <motion.div
              key="colors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <AuditSection 
                title="Detected Palette" 
                description="All unique hex colors identified in your design system."
                icon={Palette}
              >
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {auditResult.colors.uniqueFills.map((color, i) => (
                      <div key={i} className="space-y-2">
                        <div className="aspect-square rounded-xl shadow-inner border border-zinc-100" style={{ backgroundColor: color }} />
                        <p className="text-[10px] font-mono text-center font-medium truncate">{color}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </AuditSection>

              <AuditSection 
                title="Color Similarity Analysis" 
                description="Detecting near-identical hex values that should likely be merged into single tokens."
                icon={Palette}
              >
                <div className="divide-y divide-zinc-100">
                  {auditResult.colors.clusters.length > 0 ? (
                    auditResult.colors.clusters.map((cluster, i) => (
                      <div key={i} className="p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <h4 className="font-semibold text-zinc-900">Cluster #{i + 1}</h4>
                            <p className="text-sm text-zinc-500">{cluster.variants.length + 1} colors within 4% similarity range.</p>
                          </div>
                          <button className="text-xs font-semibold text-zinc-900 bg-zinc-100 px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors">
                            Merge to {cluster.baseColor}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          <div className="space-y-2">
                            <div className="aspect-square rounded-xl shadow-inner border border-zinc-100" style={{ backgroundColor: cluster.baseColor }} />
                            <p className="text-xs font-mono text-center font-medium">{cluster.baseColor}</p>
                            <p className="text-[10px] text-zinc-400 text-center uppercase tracking-tighter">Base Token</p>
                          </div>
                          {cluster.variants.map((v, vi) => (
                            <div key={vi} className="space-y-2 opacity-80 hover:opacity-100 transition-opacity">
                              <div className="aspect-square rounded-xl shadow-inner border border-zinc-100" style={{ backgroundColor: v }} />
                              <p className="text-xs font-mono text-center">{v}</p>
                              <p className="text-[10px] text-amber-500 text-center uppercase tracking-tighter font-bold">Variant</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                      <p className="text-zinc-900 font-medium">No color drift detected!</p>
                      <p className="text-zinc-500 text-sm">Your color palette is perfectly systemized.</p>
                    </div>
                  )}
                </div>
              </AuditSection>
            </motion.div>
          )}

          {activeTab === 'typography' && (
            <motion.div
              key="typography"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <AuditSection 
                title="Type Scale Audit" 
                description="Analysis of font sizes and line-height consistency across your components."
                icon={TypeIcon}
              >
                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6">Unique Font Sizes</h4>
                      <div className="flex flex-wrap gap-3">
                        {auditResult.typography.uniqueSizes.map((size) => (
                          <div key={size} className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl">
                            <span className="text-lg font-semibold text-zinc-900">{size}</span>
                            <span className="text-xs text-zinc-400 ml-1">px</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-6 text-sm text-zinc-500">
                        You are using <span className="font-bold text-zinc-900">{auditResult.typography.uniqueSizes.length} unique font sizes</span>. 
                        Recommended for this scale: 6–8 sizes.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6">Line-Height Inconsistencies</h4>
                      <div className="space-y-4">
                        {auditResult.typography.lineHeightInconsistencies.map((item, i) => (
                          <div key={i} className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              <span className="text-sm font-bold text-amber-900">Size {item.size}px</span>
                            </div>
                            <p className="text-xs text-amber-700 mb-3">Found {item.lineHeights.length} different line-heights for this font size:</p>
                            <div className="flex gap-2">
                              {item.lineHeights.map((lh) => (
                                <span key={lh} className="px-2 py-1 bg-white border border-amber-200 rounded text-xs font-mono font-bold text-amber-900">{lh}px</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </AuditSection>
            </motion.div>
          )}

          {activeTab === 'spacing' && (
            <motion.div
              key="spacing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <AuditSection 
                title="Grid & Spacing Audit" 
                description="Detecting values that break your defined 8px grid system."
                icon={LayoutGrid}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Element</th>
                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Property</th>
                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {auditResult.spacing.violations.map((v, i) => {
                        const element = elements.find(e => e.id === v.elementId);
                        return (
                          <tr key={i} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-zinc-900">{element?.name || 'Unknown Element'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-mono text-zinc-500">{v.property}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-amber-600">{v.value}px</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-xs font-medium text-amber-700">Off-grid</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {auditResult.spacing.violations.length === 0 && (
                    <div className="p-12 text-center">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                      <p className="text-zinc-900 font-medium">Perfect Grid Alignment!</p>
                      <p className="text-zinc-500 text-sm">All spacing values follow your 8px system.</p>
                    </div>
                  )}
                </div>
              </AuditSection>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Footer for PDF (hidden by default) */}
        <div id="report-footer" className="hidden mt-20 pt-8 border-t border-zinc-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-zinc-900">Design System Audit Report</p>
              <p className="text-xs text-zinc-400">Generated by DS Linter v1.0</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-400">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 pt-12 border-t border-zinc-200 text-center">
        <p className="text-zinc-400 text-sm">
          DesignSystem Linter &copy; 2026. Built for precision-focused product teams.
        </p>
      </footer>
    </div>
  );
}
