export type UiCatalogScope = 'shared' | 'pattern' | 'module-example';
export type UiCatalogMaturity = 'stable' | 'candidate' | 'planned' | 'deprecated';

export interface CatalogApiItem {
  name: string;
  type: string;
  description: string;
  required?: boolean;
  defaultValue?: string;
}

export interface CatalogExample {
  title: string;
  description: string;
  code?: string;
}

export interface UiCatalogEntry {
  id: string;
  name: string;
  category: string;
  scope: UiCatalogScope;
  maturity: UiCatalogMaturity;
  source: string;
  importPath?: string;
  description: string;
  useWhen: string[];
  avoidWhen: string[];
  props?: CatalogApiItem[];
  slots?: CatalogApiItem[];
  events?: CatalogApiItem[];
  states: string[];
  responsive: string[];
  accessibility: string[];
  relatedEntries: string[];
  examples: CatalogExample[];
}

export interface UiViewPattern {
  id: string;
  name: string;
  description: string;
  icon: string;
  primaryInformation: string;
  sections: string[];
  recommendedEntries: string[];
}

export interface ReportAnatomyStep {
  number: number;
  title: string;
  description: string;
  required: boolean;
}
