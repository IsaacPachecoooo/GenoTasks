
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, UserRole, Team, Area, Priority, Status, Comment } from './types';
import { TEAMS, AREAS, PRIORITIES } from './constants';
import { sortTasks, loadTasks, saveTasks, getExportText, downloadAsText, getWeekStringFromDate, parseImportText } from './utils';
import TaskCreationWizard from './components/TaskCreationWizard';
import TaskTable from './components/TaskTable';
import TaskDetailModal from './components/TaskDetailModal';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [role, setRole] = useState<UserRole>('Leader');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  
  const parseLocalDatePicker = (val: string): Date => {
    const [year, month, day] = val.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const [workingWeek, setWorkingWeek] = useState(getWeekStringFromDate(new Date()));
  const [workingDate, setWorkingDate] = useState(new Date().toISOString().split('T')[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterWeek, setFilterWeek] = useState('');
  const [filterArea, setFilterArea] = useState<Area | 'Todos'>('Todos');
  const [filterTeam, setFilterTeam] = useState<Team | 'Todos'>('Todos');
  const [filterStatus, setFilterStatus] = useState<Status | 'Todos'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loaded = loadTasks();
    if (loaded && Array.isArray(loaded)) {
      setTasks(loaded);
    }
    setIsInitialLoadDone(true);
  }, []);

  useEffect(() => {
    if (isInitialLoadDone) {
      saveTasks(tasks);
    }
  }, [tasks, isInitialLoadDone]);

  const resetFilters = (includeWeek = false) => {
    setFilterArea('Todos');
    setFilterTeam('Todos');
    setFilterStatus('Todos');
    setSearchTerm('');
    if (includeWeek) {
      setFilterWeek('');
    }
  };

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
      const matchWeek = filterWeek ? t.week === filterWeek : true;
      const matchArea = filterArea === 'Todos' ? true : t.area === filterArea;
      const matchTeam = filterTeam === 'Todos' ? true : t.responsible === filterTeam;
      const matchStatus = filterStatus === 'Todos' ? true : t.status === filterStatus;
      const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.requester.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchWeek && matchArea && matchTeam && matchStatus && matchSearch;
    });

    return sortTasks(result);
  }, [tasks, filterWeek, filterArea, filterTeam, filterStatus, searchTerm]);

  const handleSaveNewTask = (task: Task) => {
    setTasks(prev => [...prev, task]);
    setIsWizardOpen(false);
    setFilterWeek(workingWeek);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (selectedTask?.id === updatedTask.id) {
       setSelectedTask(updatedTask);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const handleExport = () => {
    const targetWeek = filterWeek || workingWeek;
    if (!targetWeek) {
      alert('Por favor selecciona una semana para exportar.');
      return;
    }
    const text = getExportText(targetWeek, tasks);
    downloadAsText(`Tareas_GenoTasks_${targetWeek.replace(/[\s/]/g, '_')}.txt`, text);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const importedTasks = parseImportText(content);
        if (importedTasks.length > 0) {
          let updatedCount = 0;
          let addedCount = 0;
          
          setTasks(prev => {
            const currentTasks = [...prev];
            
            importedTasks.forEach(imported => {
              const existingIndex = currentTasks.findIndex(existing => 
                existing.title.trim().toLowerCase() === imported.title.trim().toLowerCase() &&
                existing.week === imported.week &&
                existing.area === imported.area &&
                existing.responsible === imported.responsible &&
                existing.requester.trim().toLowerCase() === imported.requester.trim().toLowerCase()
              );

              if (existingIndex !== -1) {
                const existing = currentTasks[existingIndex];
                let changed = false;

                if (!existing.description?.trim() && imported.description?.trim()) {
                  existing.description = imported.description;
                  changed = true;
                }

                if (!existing.basecampLink?.trim() && imported.basecampLink?.trim()) {
                  existing.basecampLink = imported.basecampLink;
                  if (existing.status === 'Bloqueada (falta Basecamp)') {
                    existing.status = 'Activa';
                  }
                  changed = true;
                }

                if (!existing.deliveryDate?.trim() && imported.deliveryDate?.trim()) {
                  existing.deliveryDate = imported.deliveryDate;
                  changed = true;
                }

                const existingCommentsText = new Set(existing.comments.map(c => `${c.author}:${c.text.trim()}`));
                const newComments = imported.comments.filter(ic => !existingCommentsText.has(`${ic.author}:${ic.text.trim()}`));
                
                if (newComments.length > 0) {
                  existing.comments = [...existing.comments, ...newComments];
                  changed = true;
                }

                if (changed) {
                  currentTasks[existingIndex] = { ...existing };
                  updatedCount++;
                }
              } else {
                currentTasks.push(imported);
                addedCount++;
              }
            });

            return currentTasks;
          });

          if (addedCount > 0 || updatedCount > 0) {
            alert(`¡Fusión completada!\n- ${addedCount} tareas nuevas añadidas.\n- ${updatedCount} tareas existentes actualizadas con datos nuevos de entrega, descripción o Basecamp.`);
            resetFilters(true);
          } else {
            alert('El sistema ya está al día con la información del archivo.');
          }
        } else {
          alert('No se detectaron tareas válidas en el archivo.');
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleWorkingDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWorkingDate(val);
    if (val) {
      setWorkingWeek(getWeekStringFromDate(parseLocalDatePicker(val)));
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-50 text-base">
      <header className="bg-white border-b sticky top-0 z-40 px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100" height="100" rx="35" fill="#00c875" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-none">GenoTasks</h1>
              <span className="text-xs text-gray-400 font-black uppercase tracking-[0.05em] mt-1 whitespace-nowrap">Digital Branding Exp Workflow</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <div className="bg-brand-light/50 border border-brand/20 p-2.5 rounded-xl flex items-center space-x-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-brand-dark uppercase tracking-widest leading-none mb-1.5">Semana de Trabajo</span>
                <input 
                  type="date"
                  value={workingDate}
                  onChange={handleWorkingDateChange}
                  className="bg-transparent text-sm font-black text-brand-dark outline-none cursor-pointer border-none p-0 focus:ring-0"
                />
              </div>
              <div className="h-10 w-[1px] bg-brand/20"></div>
              <span className="text-sm font-black text-brand-dark">{workingWeek}</span>
            </div>

            <div className="bg-gray-100 p-1.5 rounded-xl flex items-center border border-gray-200">
               <button 
                onClick={() => setRole('Leader')}
                className={`px-5 py-2 text-xs font-black rounded-lg transition-all ${role === 'Leader' ? 'bg-white shadow-sm text-brand-dark' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 LEADER
               </button>
               <button 
                onClick={() => setRole('Head')}
                className={`px-5 py-2 text-xs font-black rounded-lg transition-all ${role === 'Head' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 HEAD
               </button>
            </div>

            <button
              onClick={() => setIsWizardOpen(true)}
              className="bg-brand hover:bg-brand-dark text-white px-8 py-3 rounded-xl font-black shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center text-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              Nueva Tarea
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 items-end relative">
          
          <div className="space-y-2 lg:col-span-1">
            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Estado</label>
            <div className="relative">
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value as any)}
                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-brand"
              >
                <option value="Todos">Todos los Estados</option>
                <option value="Bloqueada (falta Basecamp)">Bloqueada (falta BC)</option>
                <option value="Activa">Activa</option>
                <option value="En progreso">En progreso</option>
                <option value="Completada">Completada</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Semana</label>
            <div className="relative">
              <select 
                value={filterWeek}
                onChange={e => setFilterWeek(e.target.value)}
                className="w-full p-3 bg-brand-light border border-brand/20 rounded-xl text-sm font-bold text-brand-dark outline-none appearance-none"
              >
                <option value="">Todas las Semanas</option>
                {Array.from(new Set(tasks.map(t => t.week))).sort().reverse().map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-brand-dark">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm font-bold">
            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Área</label>
            <select 
              value={filterArea} 
              onChange={e => setFilterArea(e.target.value as any)}
              className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none cursor-pointer"
            >
              <option value="Todos">Todas las Áreas</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="space-y-2 text-sm font-bold">
            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Responsable</label>
            <select 
              value={filterTeam} 
              onChange={e => setFilterTeam(e.target.value as any)}
              className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none cursor-pointer"
            >
              <option value="Todos">Todos</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Búsqueda</label>
            <input 
              type="text"
              placeholder="Tarea..."
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex h-[46px] pb-1">
            <button 
              onClick={() => resetFilters(true)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-xs font-black text-gray-400 rounded-xl transition-colors uppercase border border-gray-200 shadow-sm"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <span className="bg-brand text-white px-4 py-1.5 rounded-xl text-base mr-4 font-black shadow-sm">
              {filteredTasks.length}
            </span>
            {filterWeek ? `Semana: ${filterWeek}` : 'Todas las Tareas'}
          </h2>
          <div className="flex flex-wrap gap-3">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt" className="hidden" />
            <button
              onClick={handleImportClick}
              className="flex items-center space-x-2.5 text-blue-600 hover:text-blue-800 font-black text-xs bg-white border border-blue-200 px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-all shadow-sm active:scale-95 uppercase tracking-wide"
            >
              <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <span>SINCRONIZAR TXT</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center space-x-2.5 text-gray-600 hover:text-gray-900 font-black text-xs bg-white border border-gray-300 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95 uppercase tracking-wide"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </svg>
              <span>EXPORTAR SEMANA</span>
            </button>
          </div>
        </div>

        <div className="space-y-12">
          {AREAS.map(area => {
            const areaTasks = filteredTasks.filter(t => t.area === area);
            if (filterArea !== 'Todos' && filterArea !== area) return null;

            return (
              <div key={area} className="space-y-6">
                <div className="flex items-center space-x-4 border-b-2 border-gray-100 pb-3">
                  <div className={`w-4 h-4 rounded-full ${area === 'Producción' ? 'bg-brand' : 'bg-pink-500'}`}></div>
                  <h3 className="text-base font-black text-gray-800 uppercase tracking-widest">ÁREA: {area}</h3>
                  <span className="text-xs bg-white border border-gray-200 text-gray-400 px-3 py-1 rounded-full font-black">{areaTasks.length} TAREAS</span>
                </div>
                
                {areaTasks.length > 0 ? (
                  <TaskTable 
                    tasks={areaTasks} 
                    allTasks={tasks}
                    role={role} 
                    onUpdateTask={handleUpdateTask} 
                    onViewDetails={setSelectedTask} 
                    onDeleteTask={handleDeleteTask}
                  />
                ) : (
                  <div className="bg-white/50 py-12 border border-dashed border-gray-200 rounded-2xl text-center">
                    <p className="text-gray-400 text-sm font-medium italic">Sin tareas registradas en esta área.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {isWizardOpen && (
        <TaskCreationWizard 
          week={workingWeek}
          role={role}
          existingTasks={tasks}
          onClose={() => setIsWizardOpen(false)} 
          onSave={handleSaveNewTask} 
        />
      )}

      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask} 
          allTasks={tasks}
          role={role}
          onClose={() => setSelectedTask(null)} 
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
};

export default App;
