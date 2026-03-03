import { DesignElement, AuditResult, ColorCluster, ComponentInfo } from './types';
import { colorDistance, detectGridBase, nearestGrid } from './utils';

// Walk raw Figma JSON and extract DesignElements
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function walkFigmaNode(node: any, out: DesignElement[], depth = 0) {
  if (!node || depth > 50) return;

  if (node.type !== 'DOCUMENT' && node.type !== 'CANVAS') {
    const fills: string[] = [];

    if (node.fills && Array.isArray(node.fills)) {
      node.fills.forEach((f: any) => {
        if (f.type === 'SOLID' && f.color && f.visible !== false) {
          const r = Math.round(f.color.r * 255);
          const g = Math.round(f.color.g * 255);
          const b = Math.round(f.color.b * 255);
          fills.push(`#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`);
        } else if (typeof f === 'string' && f.startsWith('#')) {
          fills.push(f);
        }
      });
    }
    if (node.strokes && Array.isArray(node.strokes)) {
      node.strokes.forEach((s: any) => {
        if (s.type === 'SOLID' && s.color) {
          const r = Math.round(s.color.r * 255);
          const g = Math.round(s.color.g * 255);
          const b = Math.round(s.color.b * 255);
          fills.push(`#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`);
        }
      });
    }

    const fontSize = node.style?.fontSize ?? node.fontSize;
    const lineHeight = node.style?.lineHeightPx ?? node.lineHeight;
    const fontWeight = node.style?.fontWeight ?? node.fontWeight;
    const fontFamily = node.style?.fontFamily ?? node.fontFamily;
    const padding = (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) ? {
      top: node.paddingTop ?? 0,
      right: node.paddingRight ?? 0,
      bottom: node.paddingBottom ?? 0,
      left: node.paddingLeft ?? 0,
    } : undefined;

    out.push({
      id: node.id ?? `node-${out.length}`,
      name: node.name ?? 'Unnamed',
      type: node.type ?? 'RECTANGLE',
      fills,
      opacity: node.opacity ?? 1,
      fontSize,
      lineHeight,
      fontWeight,
      fontFamily,
      padding,
      width: node.absoluteBoundingBox?.width ?? node.width ?? 0,
      height: node.absoluteBoundingBox?.height ?? node.height ?? 0,
      itemSpacing: node.itemSpacing,
    });
  }

  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) => walkFigmaNode(child, out, depth + 1));
  }
}

// Parse raw JSON into DesignElement[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseJsonToElements(data: any, fileName: string): { elements: DesignElement[]; fileName: string } {
  const elements: DesignElement[] = [];

  // Figma REST API format
  if (data.document || (data.type && data.children)) {
    walkFigmaNode(data.document ?? data, elements);
  } else if (Array.isArray(data)) {
    // Array of elements or tokens
    data.forEach((item: any, i: number) => {
      const fills: string[] = [];
      if (typeof item.value === 'string' && item.value.startsWith('#')) fills.push(item.value);
      if (item.fills) {
        item.fills.forEach((f: any) => {
          if (typeof f === 'string' && f.startsWith('#')) fills.push(f);
        });
      }
      if (fills.length || item.fontSize || item.padding) {
        elements.push({
          id: item.id ?? `el-${i}`,
          name: item.name ?? `Element ${i}`,
          type: item.type ?? 'RECTANGLE',
          fills,
          opacity: item.opacity ?? 1,
          fontSize: item.fontSize,
          lineHeight: item.lineHeight,
          fontWeight: item.fontWeight,
          fontFamily: item.fontFamily,
          padding: item.padding,
          width: item.width ?? 0,
          height: item.height ?? 0,
        });
      }
    });
  } else {
    // Object — try walking it as a single node
    walkFigmaNode(data, elements);
  }

  return { elements, fileName };
}

export function performAudit(elements: DesignElement[], fileName = 'design.json'): AuditResult {
  // ── 1. COLORS ──────────────────────────────
  const allFills = elements.flatMap(e => e.fills).filter(f => f.startsWith('#'));
  const fillFreq = new Map<string, number>();
  allFills.forEach(f => fillFreq.set(f.toLowerCase(), (fillFreq.get(f.toLowerCase()) ?? 0) + 1));
  const uniqueFills = Array.from(fillFreq.keys());

  const CLUSTER_THRESHOLD = 8; // % distance
  const clusters: ColorCluster[] = [];
  const clustered = new Set<string>();

  for (const color of uniqueFills) {
    if (clustered.has(color)) continue;
    const members: string[] = [];
    for (const other of uniqueFills) {
      if (other === color || clustered.has(other)) continue;
      if (colorDistance(color, other) < CLUSTER_THRESHOLD) {
        members.push(other);
      }
    }
    if (members.length > 0) {
      clusters.push({ baseColor: color, variants: members, similarity: CLUSTER_THRESHOLD });
      members.forEach(m => clustered.add(m));
    }
    clustered.add(color);
  }

  // ── 2. TYPOGRAPHY ──────────────────────────
  const textEls = elements.filter(e => e.type === 'TEXT');
  const uniqueSizes = [...new Set(textEls.map(e => e.fontSize ?? 0).filter(Boolean))].sort((a, b) => a - b);
  const uniqueWeights = [...new Set(textEls.map(e => e.fontWeight ?? '').filter(Boolean))];
  const fontFamilies = [...new Set(textEls.map(e => e.fontFamily ?? '').filter(Boolean))];

  const sizeToLH = new Map<number, Set<number>>();
  textEls.forEach(e => {
    if (e.fontSize && e.lineHeight) {
      if (!sizeToLH.has(e.fontSize)) sizeToLH.set(e.fontSize, new Set());
      sizeToLH.get(e.fontSize)!.add(Math.round(e.lineHeight));
    }
  });
  const lineHeightInconsistencies = [...sizeToLH.entries()]
    .filter(([, lhs]) => lhs.size > 1)
    .map(([size, lhs]) => ({ size, lineHeights: [...lhs] }));

  // ── 3. SPACING ─────────────────────────────
  const rawSpacingValues: number[] = [];
  elements.forEach(e => {
    if (e.padding) {
      [e.padding.top, e.padding.right, e.padding.bottom, e.padding.left].forEach(v => {
        if (v > 0 && v < 500) rawSpacingValues.push(Math.round(v));
      });
    }
    if (e.itemSpacing && e.itemSpacing > 0 && e.itemSpacing < 500) {
      rawSpacingValues.push(Math.round(e.itemSpacing));
    }
  });

  const gridBase = detectGridBase(rawSpacingValues);

  const spacingFreq = new Map<number, number>();
  rawSpacingValues.forEach(v => spacingFreq.set(v, (spacingFreq.get(v) ?? 0) + 1));
  const allSpacingValues = [...spacingFreq.entries()]
    .map(([value, count]) => {
      const ng = nearestGrid(value, gridBase);
      return { value, count, isOff: value !== ng && Math.abs(value - ng) > 1 };
    })
    .sort((a, b) => b.count - a.count);

  const violations: AuditResult['spacing']['violations'] = [];
  elements.forEach(e => {
    const check = (val: number | undefined, prop: string) => {
      if (!val || val <= 0 || val >= 500) return;
      const rounded = Math.round(val);
      const ng = nearestGrid(rounded, gridBase);
      if (rounded !== ng && Math.abs(rounded - ng) > 1) {
        violations.push({ elementId: e.id, value: rounded, property: prop, nearest: ng });
      }
    };
    if (e.padding) {
      check(e.padding.top,    'padding-top');
      check(e.padding.right,  'padding-right');
      check(e.padding.bottom, 'padding-bottom');
      check(e.padding.left,   'padding-left');
    }
    if (e.itemSpacing) check(e.itemSpacing, 'item-spacing');
  });

  // ── 4. COMPONENTS ──────────────────────────
  const compMap = new Map<string, { count: number; instanceCount: number }>();
  elements.forEach(e => {
    if (e.type === 'COMPONENT' || e.type === 'COMPONENT_SET') {
      const base = e.name.split('=')[0].split('/').pop()?.trim() ?? e.name;
      const existing = compMap.get(base) ?? { count: 0, instanceCount: 0 };
      existing.count += 1;
      compMap.set(base, existing);
    }
    if (e.type === 'INSTANCE') {
      const base = e.name.split('=')[0].split('/').pop()?.trim() ?? e.name;
      const existing = compMap.get(base) ?? { count: 0, instanceCount: 0 };
      existing.instanceCount += 1;
      compMap.set(base, existing);
    }
  });

  const allComponents: ComponentInfo[] = [...compMap.entries()].map(([name, d]) => ({
    name,
    count: d.count,
    instanceCount: d.instanceCount,
    isDuplicate: d.count > 1,
  })).sort((a, b) => b.count - a.count);

  const duplicateCount = allComponents.filter(c => c.isDuplicate).length;

  // ── 5. SCORE ───────────────────────────────
  let score = 100;
  if (uniqueFills.length > 20) score -= 15;
  else if (uniqueFills.length > 12) score -= 8;
  score -= Math.min(clusters.filter(c => c.variants.length >= 2).length * 6, 18);
  score -= Math.min(clusters.filter(c => c.variants.length === 1).length * 2, 8);

  const offPct = allSpacingValues.length > 0
    ? allSpacingValues.filter(v => v.isOff).length / allSpacingValues.length
    : 0;
  if (offPct > 0.3) score -= 15;
  else if (offPct > 0.15) score -= 8;
  else if (offPct > 0) score -= 4;

  if (uniqueSizes.length > 12) score -= 12;
  else if (uniqueSizes.length > 8) score -= 6;
  if (fontFamilies.length > 2) score -= 8;
  score -= Math.min(lineHeightInconsistencies.length * 3, 9);
  if (duplicateCount > 3) score -= 10;
  else score -= duplicateCount * 3;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const criticalIssues = clusters.filter(c => c.variants.length >= 2).length
    + (violations.length > 5 ? 1 : 0)
    + (uniqueSizes.length > 12 ? 1 : 0)
    + (duplicateCount > 3 ? 1 : 0);

  const warnings = clusters.filter(c => c.variants.length === 1).length
    + (violations.length > 0 && violations.length <= 5 ? 1 : 0)
    + (uniqueSizes.length > 8 && uniqueSizes.length <= 12 ? 1 : 0)
    + lineHeightInconsistencies.length;

  const passes = [
    uniqueFills.length <= 12,
    clusters.length === 0,
    violations.length === 0,
    uniqueSizes.length <= 8,
    fontFamilies.length <= 2,
    lineHeightInconsistencies.length === 0,
    duplicateCount === 0,
  ].filter(Boolean).length;

  return {
    fileName,
    colors: { uniqueCount: uniqueFills.length, uniqueFills, clusters, offPalette: [] },
    typography: { uniqueSizes, uniqueWeights, lineHeightInconsistencies, fontFamilies },
    spacing: { gridBase, violations, allValues: allSpacingValues },
    components: { all: allComponents, duplicateCount },
    summary: { score, criticalIssues, warnings, passes },
  };
}
