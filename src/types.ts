export interface DesignElement {
  id: string;
  name: string;
  type: 'TEXT' | 'RECTANGLE' | 'COMPONENT' | 'FRAME';
  fills: string[]; // Hex colors
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
}

export interface AuditResult {
  colors: {
    uniqueCount: number;
    uniqueFills: string[];
    clusters: { baseColor: string; variants: string[] }[];
    offPalette: string[];
  };
  typography: {
    uniqueSizes: number[];
    uniqueWeights: (string | number)[];
    lineHeightInconsistencies: { size: number; lineHeights: number[] }[];
  };
  spacing: {
    gridBase: number;
    violations: { elementId: string; value: number; property: string }[];
  };
  summary: {
    score: number;
    criticalIssues: number;
  };
}
