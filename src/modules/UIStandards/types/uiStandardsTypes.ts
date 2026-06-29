export interface UiToken {
  name: string;
  value: string;
  usage: string;
  className?: string;
}

export interface ComponentExample {
  id: string;
  group: string;
  title: string;
  standardName: string;
  description: string;
  usage: string;
  source: string;
  notes: string;
  status: 'available' | 'pattern' | 'planned';
}

export interface DashboardPattern {
  title: string;
  description: string;
  layout: string;
  icon: string;
}
