
import { Task, Priority, Area, Team, Comment, Status } from './types';
import { PRIORITY_MAP, TEAMS } from './constants';

export const sortTasks = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => {
    // 1. Ordenar por Área (Producción vs Branding)
    if (a.area !== b.area) {
      return a.area.localeCompare(b.area);
    }
    
    // 2. Ordenar por Equipo (según el orden definido en TEAMS)
    const indexA = TEAMS.indexOf(a.responsible);
    const indexB = TEAMS.indexOf(b.responsible);
    if (indexA !== indexB) {
      return indexA - indexB;
    }

    // 3. Ordenar por Prioridad (Urgente -> Alta -> Media -> Baja)
    const priorityDiff = PRIORITY_MAP[a.priority] - PRIORITY_MAP[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    // 4. Ordenar por Estado de Bloqueo
    const isABlocked = a.status.includes('Bloqueada');
    const isBBlocked = b.status.includes('Bloqueada');
    if (isABlocked && !isBBlocked) return -1;
    if (!isABlocked && isBBlocked) return 1;

    // 5. Ordenar por Fecha de Entrega (si existe)
    if (a.deliveryDate && b.deliveryDate) {
      return a.deliveryDate.localeCompare(b.deliveryDate);
    }
    
    // 6. Ordenar por fecha de creación
    return b.createdAt - a.createdAt;
  });
};

export const checkPriorityLimit = (
  tasks: Task[], 
  week: string, 
  team: Team, 
  area: Area, 
  priority: Priority, 
  excludeTaskId?: string
): { allowed: boolean; message?: string } => {
  if (priority === 'Media' || priority === 'Baja' || team === Team.Unassigned) {
    return { allowed: true };
  }

  const teamTasks = tasks.filter(t => 
    t.week === week && 
    t.responsible === team && 
    t.area === area && 
    t.priority === priority &&
    t.id !== excludeTaskId
  );

  if (priority === 'Urgente' && teamTasks.length >= 1) {
    return { 
      allowed: false, 
      message: `El equipo ${team} ya tiene una tarea URGENTE en el área de ${area} para esta semana.` 
    };
  }

  if (priority === 'Alta' && teamTasks.length >= 2) {
    return { 
      allowed: false, 
      message: `El equipo ${team} ya tiene el máximo de 2 tareas ALTAS en el área de ${area} para esta semana.` 
    };
  }

  return { allowed: true };
};

const formatDateShort = (date: Date): string => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

export const getWeekStringFromDate = (date: Date): string => {
  const d = new Date(date.getTime());
  const day = d.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return `${formatDateShort(monday)} - ${formatDateShort(friday)}`;
};

export const getExportText = (week: string, tasks: Task[]): string => {
  const filtered = tasks.filter(t => t.week === week);
  if (filtered.length === 0) return `No hay tareas registradas para la semana: ${week}`;

  let output = `SEMANA: ${week}\n`;
  output += `GENERADO EL: ${new Date().toLocaleString()}\n\n`;

  const areas: Area[] = ['Producción', 'Branding'];

  areas.forEach(area => {
    const areaTasks = filtered.filter(t => t.area === area);
    if (areaTasks.length === 0) return;

    output += `========================================\n`;
    output += `ÁREA: ${area.toUpperCase()}\n`;
    output += `========================================\n\n`;

    const requesters = Array.from(new Set(areaTasks.map(t => t.requester)));
    requesters.forEach(persona => {
      const personaTasks = areaTasks.filter(t => t.requester === persona);
      output += `${persona}:\n\n`;

      const teams = Array.from(new Set(personaTasks.map(t => t.responsible)));
      teams.forEach(team => {
        const teamTasks = personaTasks.filter(t => t.responsible === team);
        output += `  Equipo: ${team}\n`;
        teamTasks.forEach(task => {
          output += `  - Tarea: ${task.title}\n`;
          if (task.description) output += `    Descripción: ${task.description}\n`;
          output += `    Prioridad: ${task.priority}\n`;
          output += `    Estado: ${task.status}\n`;
          output += `    Entrega: ${task.deliveryDate || 'No definida'}\n`;
          output += `    Basecamp: ${task.basecampLink || 'Pendiente'}\n`;
          
          if (task.comments.length > 0) {
            output += `    Comentarios:\n`;
            task.comments.forEach(c => {
              const dateStr = new Date(c.timestamp).toLocaleString();
              output += `      * [${c.author}] (${dateStr}): ${c.text}\n`;
            });
          } else {
            output += `    Comentarios: 0\n`;
          }
          output += `\n`;
        });
      });
    });
  });

  return output;
};

export const parseImportText = (text: string): Task[] => {
  const imported: Task[] = [];
  const lines = text.split('\n');
  
  let currentWeek = '';
  let currentArea: Area = 'Producción';
  let currentRequester = '';
  let currentTeam: Team = Team.Unassigned;
  
  let currentTask: Partial<Task> | null = null;

  const saveCurrentTask = () => {
    if (currentTask && currentTask.title) {
      imported.push({
        id: crypto.randomUUID(),
        week: currentWeek || 'Sin semana',
        area: currentArea,
        requester: currentRequester || 'Desconocido',
        responsible: currentTeam,
        comments: currentTask.comments || [],
        createdAt: Date.now(),
        priority: currentTask.priority || 'Media',
        status: currentTask.status || 'Activa',
        basecampLink: currentTask.basecampLink || '',
        title: currentTask.title,
        description: currentTask.description || '',
        deliveryDate: currentTask.deliveryDate || ''
      } as Task);
      currentTask = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line && !lines[i].startsWith('  ')) continue; 

    if (line.startsWith('SEMANA:')) {
      saveCurrentTask();
      currentWeek = line.replace('SEMANA:', '').trim();
      continue;
    }

    if (line.startsWith('ÁREA:')) {
      saveCurrentTask();
      const areaVal = line.replace('ÁREA:', '').trim().toUpperCase();
      currentArea = areaVal.includes('BRANDING') ? 'Branding' : 'Producción';
      continue;
    }

    if (lines[i].endsWith(':') && 
        !lines[i].startsWith(' ') && 
        !line.startsWith('SEMANA') && 
        !line.startsWith('ÁREA') && 
        !line.startsWith('Equipo') &&
        !line.startsWith('Prioridad') &&
        !line.startsWith('Estado') &&
        !line.startsWith('Entrega') &&
        !line.startsWith('Basecamp') &&
        !line.startsWith('Descripción') &&
        !line.startsWith('Comentarios') &&
        !line.startsWith('=')) {
      saveCurrentTask();
      currentRequester = line.replace(':', '').trim();
      continue;
    }

    if (line.startsWith('Equipo:')) {
      const teamStr = line.replace('Equipo:', '').trim();
      currentTeam = (TEAMS.find(t => t.toLowerCase().includes(teamStr.toLowerCase())) || Team.Unassigned) as Team;
      continue;
    }

    if (line.startsWith('- Tarea:')) {
      saveCurrentTask();
      currentTask = {
        title: line.replace('- Tarea:', '').trim(),
        comments: []
      };
      continue;
    }

    if (currentTask) {
      if (line.startsWith('Prioridad:')) {
        currentTask.priority = line.replace('Prioridad:', '').trim() as Priority;
      } else if (line.startsWith('Estado:')) {
        currentTask.status = line.replace('Estado:', '').trim() as Status;
      } else if (line.startsWith('Entrega:')) {
        const d = line.replace('Entrega:', '').trim();
        currentTask.deliveryDate = (d === 'No definida') ? '' : d;
      } else if (line.startsWith('Basecamp:')) {
        const link = line.replace('Basecamp:', '').trim();
        currentTask.basecampLink = (link === 'Pendiente' || !link) ? '' : link;
      } else if (line.startsWith('Descripción:')) {
        currentTask.description = line.replace('Descripción:', '').trim();
      } else if (line.startsWith('* [')) {
        const match = line.match(/\* \[(.*?)\] \((.*?)\): (.*)/);
        if (match) {
          currentTask.comments?.push({
            id: crypto.randomUUID(),
            author: match[1],
            timestamp: new Date(match[2]).getTime() || Date.now(),
            text: match[3]
          });
        }
      }
    }
  }

  saveCurrentTask();
  return imported;
};

export const downloadAsText = (filename: string, text: string) => {
  const element = document.createElement('a');
  const file = new Blob([text], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const loadTasks = (): Task[] => {
  try {
    const saved = localStorage.getItem('taskassign_tasks');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

export const saveTasks = (tasks: Task[]) => {
  try {
    localStorage.setItem('taskassign_tasks', JSON.stringify(tasks));
  } catch (e) {}
};
