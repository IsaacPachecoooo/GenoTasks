
export type Area = 'Producción' | 'Branding';
export type Priority = 'Urgente' | 'Alta' | 'Media' | 'Baja';
export type Status = 'Bloqueada (falta Basecamp)' | 'Activa' | 'En progreso' | 'Completada';

export enum Team {
  Full = 'Full Performance 🧡',
  Core = 'Core Performance 🩷',
  Lite = 'Lite Performance 🤍',
  SEM = 'SEM Performance 💙',
  Black = 'Team Black 🖤',
  Unassigned = 'Sin asignar'
}

export interface Comment {
  id: string;
  author: string;
  timestamp: number;
  text: string;
}

export interface Task {
  id: string;
  week: string;
  area: Area;
  priority: Priority;
  title: string;
  description?: string;
  requester: string;
  responsible: Team;
  basecampLink: string;
  status: Status;
  comments: Comment[];
  createdAt: number;
  deliveryDate?: string;
}

export type UserRole = 'Leader' | 'Head';
