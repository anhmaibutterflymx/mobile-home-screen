export type ControlSize = 'small' | 'wide' | 'door';
export type SectionType = 'quick-action' | 'door';

export interface ControlItem {
  id: string;
  title: string;
  subtitle?: string;
  label?: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  size: ControlSize;
  section: SectionType;
}
