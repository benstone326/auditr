import { DesignElement, AuditResult } from './types';
import { getColorSimilarity } from './utils';

export function performAudit(elements: DesignElement[], config: { gridBase: number } = { gridBase: 8 }): AuditResult {
  // 1. Color Audit
  const allFills = elements
    .flatMap(e => e.fills || [])
    .filter(f => typeof f === 'string' && f.startsWith('#'));
  const uniqueFills = Array.from(new Set(allFills));
  
  const clusters: { baseColor: string; variants: string[] }[] = [];
  const processed = new Set<string>();

  for (const color of uniqueFills) {
    if (processed.has(color)) continue;
    const similar = uniqueFills.filter(other => 
      other !== color && !processed.has(other) && getColorSimilarity(color, other) > 0.96
    );
    
    if (similar.length > 0) {
      clusters.push({ baseColor: color, variants: similar });
      similar.forEach(s => processed.add(s));
    }
    processed.add(color);
  }

  // 2. Typography Audit
  const textElements = elements.filter(e => e.type === 'TEXT');
  const uniqueSizes = Array.from(new Set(textElements.map(e => e.fontSize || 0))).sort((a, b) => a - b);
  const uniqueWeights = Array.from(new Set(textElements.map(e => e.fontWeight || ''))).filter(Boolean);
  
  const sizeToLineHeights: Record<number, Set<number>> = {};
  textElements.forEach(e => {
    if (e.fontSize && e.lineHeight) {
      if (!sizeToLineHeights[e.fontSize]) sizeToLineHeights[e.fontSize] = new Set();
      sizeToLineHeights[e.fontSize].add(e.lineHeight);
    }
  });

  const lineHeightInconsistencies = Object.entries(sizeToLineHeights)
    .filter(([_, heights]) => heights.size > 1)
    .map(([size, heights]) => ({
      size: Number(size),
      lineHeights: Array.from(heights)
    }));

  // 3. Spacing Audit
  const spacingViolations: { elementId: string; value: number; property: string }[] = [];
  elements.forEach(e => {
    const checkValue = (val: number | undefined, prop: string) => {
      if (val !== undefined && val !== 0 && val % config.gridBase !== 0) {
        spacingViolations.push({ elementId: e.id, value: val, property: prop });
      }
    };

    if (e.padding) {
      checkValue(e.padding.top, 'padding-top');
      checkValue(e.padding.right, 'padding-right');
      checkValue(e.padding.bottom, 'padding-bottom');
      checkValue(e.padding.left, 'padding-left');
    }
    if (e.margin) {
      checkValue(e.margin.top, 'margin-top');
      checkValue(e.margin.right, 'margin-right');
      checkValue(e.margin.bottom, 'margin-bottom');
      checkValue(e.margin.left, 'margin-left');
    }
  });

  // 4. Summary Calculation
  const criticalIssues = clusters.length + lineHeightInconsistencies.length + (spacingViolations.length > 10 ? 1 : 0);
  const score = Math.max(0, 100 - (criticalIssues * 10) - (spacingViolations.length * 0.5));

  return {
    colors: {
      uniqueCount: uniqueFills.length,
      uniqueFills,
      clusters,
      offPalette: [] // Future: compare against a provided palette
    },
    typography: {
      uniqueSizes,
      uniqueWeights,
      lineHeightInconsistencies
    },
    spacing: {
      gridBase: config.gridBase,
      violations: spacingViolations
    },
    summary: {
      score: Math.round(score),
      criticalIssues
    }
  };
}
