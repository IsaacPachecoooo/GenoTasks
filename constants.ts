
import { Team, Area, Priority } from './types';

export const TEAMS: Team[] = [
  Team.Full,
  Team.Core,
  Team.Lite,
  Team.SEM,
  Team.Black,
  Team.Unassigned
];

export const AREAS: Area[] = ['Producción', 'Branding'];
export const PRIORITIES: Priority[] = ['Urgente', 'Alta', 'Media', 'Baja'];

export const PRIORITY_MAP: Record<Priority, number> = {
  'Urgente': 0,
  'Alta': 1,
  'Media': 2,
  'Baja': 3
};
