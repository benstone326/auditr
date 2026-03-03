export interface DesignElement {
  id: string;
  name: string;
  type: string;
  fills: string[];
  opacity: number;
  fontSize?: number;
  lineHeight?: number;
  fontWeight?: number | string;
  fontFamily?: string;
  padding?: { top: number; right: number; bottom: number; left: number };
  margin?: { top: number; right: number; bottom: number; left: number };
  borderRadius?: number;
  width: number;
  height: number;
  itemSpacing?: number;
}

export interface ColorCluster {
  baseColor: string;
  variants: string[];
  similarity: number;
}

export interface ComponentInfo {
  name: string;
  count: number;
  instanceCount: number;
  isDuplicate: boolean;
}

export interface AuditResult {
  fileName: string;
  colors: {
    uniqueCount: number;
    uniqueFills: string[];
    clusters: ColorCluster[];
    offPalette: string[];
  };
  typography: {
    uniqueSizes: number[];
    uniqueWeights: (string | number)[];
    lineHeightInconsistencies: { size: number; lineHeights: number[] }[];
    fontFamilies: string[];
  };
  spacing: {
    gridBase: number;
    violations: { elementId: string; value: number; property: string; nearest: number }[];
    allValues: { value: number; count: number; isOff: boolean }[];
  };
  components: {
    all: ComponentInfo[];
    duplicateCount: number;
  };
  summary: {
    score: number;
    criticalIssues: number;
    warnings: number;
    passes: number;
  };
}
