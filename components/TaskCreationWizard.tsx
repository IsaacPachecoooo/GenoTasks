
import React, { useState } from 'react';
import { Area, Priority, Team, Task, Status, UserRole } from '../types';
import { AREAS, PRIORITIES, TEAMS } from '../constants';
import { checkPriorityLimit } from '../utils';

interface Props {
  week: string;
  role: UserRole;
  existingTasks: Task[];
  onClose: () => void;
  onSave: (task: Task) => void;
}

const TaskCreationWizard: React.FC<Props> = ({ week, role, existingTasks, onClose, onSave }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Task>>({
    week: week,
    area: 'Producción',
    priority: 'Media',
    title: '',
    description: '',
    requester: '',
    responsible: Team.Unassigned,
    basecampLink: '',
    deliveryDate: '',
    comments: []
  });

  const TOTAL_STEPS = 9; // Incrementado por la fecha de entrega
  const isLeader = role === 'Leader';

  const nextStep = () => {
    if (isLeader && step === 3) {
      setStep(5);
    } else {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (isLeader && step === 5) {
      setStep(3);
    } else {
      setStep(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    const status: Status = formData.basecampLink?.trim() ? 'Activa' : 'Bloqueada (falta Basecamp)';
    const newTask: Task = {
      ...formData as any,
      id: crypto.randomUUID(),
      status,
      createdAt: Date.now(),
      requester: isLeader ? 'Pendiente por Head' : (formData.requester || '')
    };
    onSave(newTask);
  };

  const isNextDisabled = () => {
    switch(step) {
      case 1: return !formData.area;
      case 2: return !formData.title?.trim();
      case 4: return !isLeader && !formData.requester?.trim();
      case 5: return !formData.responsible || formData.responsible === Team.Unassigned;
      case 6: {
        const check = checkPriorityLimit(
          existingTasks, 
          formData.week!, 
          formData.responsible!, 
          formData.area!, 
          formData.priority!
        );
        return !formData.priority || !check.allowed;
      };
      default: return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-800">Paso 1: Área</h3>
              <span className="text-xs font-black text-brand-dark bg-brand-light px-3 py-1.5 rounded-lg uppercase tracking-wider">{week}</span>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {AREAS.map(area => (
                <button
                  key={area}
                  onClick={() => setFormData({ ...formData, area })}
                  className={`p-6 border-2 rounded-2xl text-center text-lg font-black transition-all ${formData.area === area ? 'bg-brand-light border-brand text-brand-dark ring-4 ring-brand/10' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-gray-800">Paso 2: Título</h3>
            <p className="text-sm text-gray-400 font-bold">Resume brevemente la tarea.</p>
            <input
              autoFocus
              className="w-full p-4 border-2 border-gray-100 rounded-2xl text-lg font-semibold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none bg-white transition-all shadow-sm"
              placeholder="Ej: Rediseño de banner home..."
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-gray-800">Paso 3: Descripción</h3>
            <textarea
              className="w-full p-4 border-2 border-gray-100 rounded-2xl text-lg focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none h-40 bg-white transition-all shadow-sm"
              placeholder="Instrucciones o detalles adicionales..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-gray-800">Paso 4: Persona (Solicitante)</h3>
            <p className="text-sm text-gray-500 font-bold mb-4 italic">Asigna la persona que solicita o es dueña de la tarea.</p>
            <input
              autoFocus
              className="w-full p-4 border-2 border-gray-100 rounded-2xl text-lg font-semibold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none bg-white transition-all shadow-sm"
              placeholder="Nombre de la persona..."
              value={formData.requester}
              onChange={e => setFormData({ ...formData, requester: e.target.value })}
            />
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-gray-800">Paso 5: Equipo Responsable</h3>
            <div className="grid grid-cols-1 gap-3">
              {TEAMS.filter(t => t !== Team.Unassigned).map(team => (
                <button
                  key={team}
                  onClick={() => setFormData({ ...formData, responsible: team })}
                  className={`p-4 border-2 rounded-2xl text-left text-base font-black transition-all ${formData.responsible === team ? 'bg-blue-100 border-blue-500 text-blue-800 ring-4 ring-blue-500/10' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                >
                  {team}
                </button>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-gray-800">Paso 6: Prioridad</h3>
            <p className="text-xs text-gray-400 font-bold uppercase mb-4">Máximo: 1 Urgente y 2 Altas por equipo/área.</p>
            <div className="grid grid-cols-2 gap-4">
              {PRIORITIES.map(p => {
                const check = checkPriorityLimit(
                  existingTasks, 
                  formData.week!, 
                  formData.responsible!, 
                  formData.area!, 
                  p
                );
                const isSelected = formData.priority === p;
                
                return (
                  <button
                    key={p}
                    onClick={() => setFormData({ ...formData, priority: p })}
                    className={`p-5 border-2 rounded-2xl text-center text-base font-black transition-all relative ${
                      isSelected 
                        ? 'bg-indigo-100 border-indigo-500 text-indigo-700 ring-4 ring-indigo-500/10' 
                        : check.allowed 
                          ? 'bg-white border-gray-100 hover:bg-gray-50' 
                          : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {p}
                    {!check.allowed && !isSelected && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] px-2 py-1 rounded-full uppercase">Lleno</span>
                    )}
                  </button>
                );
              })}
            </div>
            {(() => {
              const check = checkPriorityLimit(
                existingTasks, 
                formData.week!, 
                formData.responsible!, 
                formData.area!, 
                formData.priority!
              );
              return !check.allowed && (
                <p className="text-red-500 text-xs font-bold mt-2 animate-pulse">⚠️ {check.message}</p>
              );
            })()}
          </div>
        );
      case 7:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-gray-800">Paso 7: Fecha de Entrega</h3>
            <p className="text-base text-gray-500 font-medium">Define el deadline para esta tarea.</p>
            <input
              type="date"
              className="w-full p-4 border-2 border-gray-100 rounded-2xl text-lg font-semibold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none bg-white transition-all shadow-sm"
              value={formData.deliveryDate}
              onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })}
            />
          </div>
        );
      case 8:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-gray-800">Paso 8: Link Basecamp</h3>
            <p className="text-base text-gray-500 font-medium">Si no tienes el link todavía, déjalo en blanco y se marcará como Bloqueada.</p>
            <input
              autoFocus
              className="w-full p-4 border-2 border-gray-100 rounded-2xl text-lg font-semibold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none bg-white transition-all shadow-sm"
              placeholder="https://basecamp.com/..."
              value={formData.basecampLink}
              onChange={e => setFormData({ ...formData, basecampLink: e.target.value })}
            />
          </div>
        );
      case 9:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-gray-800 text-center">Resumen Final</h3>
            <div className="bg-gray-50 p-8 rounded-2xl border-2 border-gray-100 space-y-3 text-base font-medium">
              <p><strong>Área:</strong> {formData.area}</p>
              <p><strong>Título:</strong> {formData.title}</p>
              <p><strong>Entrega:</strong> {formData.deliveryDate || 'Sin fecha'}</p>
              <p><strong>Persona:</strong> <span className={isLeader ? "text-blue-500 italic" : ""}>{isLeader ? 'Pendiente por Head' : (formData.requester || 'Sin asignar')}</span></p>
              <p><strong>Equipo:</strong> {formData.responsible}</p>
              <p><strong>Prioridad:</strong> {formData.priority}</p>
              <p><strong>Estado:</strong> {formData.basecampLink ? <span className="text-green-600 font-black">Activa</span> : <span className="text-orange-600 font-black">⚠️ Bloqueada</span>}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getProgress = () => {
    const totalSteps = isLeader ? 8 : 9;
    let currentEffective = step;
    if (isLeader && step > 4) currentEffective = step - 1;
    return (currentEffective / totalSteps) * 100;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-3xl font-black text-gray-800">Nueva Tarea</h2>
            <p className="text-xs text-gray-400 font-black uppercase tracking-widest mt-1.5">Registro para: {week}</p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-gray-200 rounded-full transition-colors text-gray-400 bg-white shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="p-10 min-h-[460px]">
          {renderStep()}
        </div>

        <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <button
            onClick={step === 1 ? onClose : prevStep}
            className="px-8 py-3 rounded-xl font-black text-base text-gray-600 hover:bg-gray-200 transition-colors uppercase tracking-wide"
          >
            {step === 1 ? 'Cancelar' : 'Atrás'}
          </button>
          
          {step < TOTAL_STEPS ? (
            <button
              disabled={isNextDisabled()}
              onClick={nextStep}
              className={`px-10 py-3 rounded-xl font-black text-base text-white transition-all uppercase tracking-wide shadow-md ${
                isNextDisabled()
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-brand hover:bg-brand-dark active:scale-95'
              }`}
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-10 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-black text-base text-white shadow-lg transition-all active:scale-95 uppercase tracking-wide"
            >
              Guardar Tarea
            </button>
          )}
        </div>

        <div className="px-10 pb-8 bg-gray-50">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-brand h-2 rounded-full transition-all duration-300" 
              style={{ width: `${getProgress()}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCreationWizard;
