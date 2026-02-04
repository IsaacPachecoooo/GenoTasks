
import React, { useState, useEffect } from 'react';
import { Task, Status, Comment, UserRole, Team, Priority } from '../types';
import { TEAMS } from '../constants';
import { checkPriorityLimit } from '../utils';

interface Props {
  task: Task;
  allTasks: Task[]; // Necesario para validar cambios de prioridad
  role: UserRole;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
}

const TaskDetailModal: React.FC<Props> = ({ task, allTasks, role, onClose, onUpdate, onDelete }) => {
  const [commentText, setCommentText] = useState('');
  const [newTitle, setNewTitle] = useState(task.title);
  const [newBcLink, setNewBcLink] = useState(task.basecampLink);
  const [newStatus, setNewStatus] = useState<Status>(task.status);
  const [newRequester, setNewRequester] = useState(task.requester);
  const [newResponsible, setNewResponsible] = useState<Team>(task.responsible);
  const [newPriority, setNewPriority] = useState<Priority>(task.priority);
  const [newDeliveryDate, setNewDeliveryDate] = useState(task.deliveryDate || '');

  const isHead = role === 'Head';

  useEffect(() => {
    setNewTitle(task.title);
    setNewStatus(task.status);
    setNewBcLink(task.basecampLink);
    setNewRequester(task.requester);
    setNewResponsible(task.responsible);
    setNewPriority(task.priority);
    setNewDeliveryDate(task.deliveryDate || '');
  }, [task]);

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: crypto.randomUUID(),
      author: role, 
      timestamp: Date.now(),
      text: commentText
    };
    onUpdate({ ...task, comments: [...task.comments, newComment] });
    setCommentText('');
  };

  const handleSaveChanges = () => {
    // Validar prioridad antes de guardar
    const check = checkPriorityLimit(
      allTasks, 
      task.week, 
      newResponsible, 
      task.area, 
      newPriority, 
      task.id
    );

    if (!check.allowed) {
      alert(check.message);
      return;
    }

    if (!newTitle.trim()) {
      alert('El título no puede estar vacío.');
      return;
    }

    let finalStatus = newStatus;
    if (newBcLink.trim() && finalStatus === 'Bloqueada (falta Basecamp)') {
      finalStatus = 'Activa';
    } else if (!newBcLink.trim()) {
      finalStatus = 'Bloqueada (falta Basecamp)';
    }

    onUpdate({ 
      ...task, 
      title: newTitle.trim(),
      basecampLink: newBcLink,
      status: finalStatus,
      requester: newRequester,
      responsible: newResponsible,
      priority: newPriority,
      deliveryDate: newDeliveryDate
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
        {/* Header: El título crece verticalmente si es largo */}
        <div className="p-8 border-b flex justify-between items-start bg-gray-50 shrink-0">
          <div className="flex-1 mr-4">
            <div className="flex items-center space-x-3 mb-3">
              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${task.area === 'Producción' ? 'bg-brand-light text-brand-dark' : 'bg-pink-100 text-pink-700'}`}>
                {task.area}
              </span>
            </div>
            {isHead ? (
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Título de la Tarea</label>
                <textarea 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full p-2 text-2xl font-bold text-gray-800 border-b-2 border-brand focus:border-brand-dark outline-none bg-transparent resize-none leading-tight overflow-hidden"
                  rows={Math.min(5, Math.max(1, newTitle.split('\n').length || 1))}
                  placeholder="Título de la tarea..."
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
              </div>
            ) : (
              <h2 className="text-3xl font-bold text-gray-800 leading-tight whitespace-normal break-words">
                {task.title}
              </h2>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2.5 bg-white rounded-full shadow-sm flex-shrink-0 transition-transform active:scale-90">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Cuerpo del Modal: Solo aquí hay scroll si el contenido total es muy largo */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Persona (Solicitante)</label>
                {isHead ? (
                  <input 
                    type="text"
                    value={newRequester}
                    onChange={e => setNewRequester(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-base bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    placeholder="Nombre..."
                  />
                ) : (
                  <p className={`text-lg font-black ${task.requester.includes('Pendiente') ? 'text-blue-500 italic' : 'text-gray-800'}`}>
                    {task.requester}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Equipo Responsable</label>
                <select 
                  value={newResponsible}
                  onChange={e => setNewResponsible(e.target.value as Team)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-base font-black bg-blue-50 text-blue-800 focus:ring-2 focus:ring-blue-400 outline-none transition-all cursor-pointer"
                >
                  {TEAMS.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Prioridad</label>
                <select 
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as Priority)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-base font-black bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all cursor-pointer disabled:bg-gray-50 disabled:text-gray-400"
                  disabled={!isHead}
                >
                  <option value="Urgente">Urgente (Max 1)</option>
                  <option value="Alta">Alta (Max 2)</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Fecha de Entrega</label>
                <input 
                  type="date"
                  value={newDeliveryDate}
                  onChange={e => setNewDeliveryDate(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-base font-bold bg-white focus:ring-2 focus:ring-brand outline-none transition-all cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Estado Actual</label>
                <select 
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as Status)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-base font-bold bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all cursor-pointer"
                >
                  <option value="Bloqueada (falta Basecamp)">Bloqueada (falta BC)</option>
                  <option value="Activa">Activa</option>
                  <option value="En progreso">En progreso</option>
                  <option value="Completada">Completada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Link Basecamp</label>
                <div className="flex space-x-2">
                  <input 
                    type="text"
                    placeholder="Link..."
                    value={newBcLink}
                    onChange={e => setNewBcLink(e.target.value)}
                    className="flex-1 p-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                  />
                  {newBcLink.trim() && (
                    <a 
                      href={newBcLink.startsWith('http') ? newBcLink : `https://${newBcLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-brand hover:bg-brand-dark text-white p-3 rounded-xl transition-all shadow-md flex items-center justify-center group"
                      title="Abrir"
                    >
                      <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {task.description && (
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Descripción</label>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">{task.description}</p>
            </div>
          )}

          <div className="space-y-6 pb-4">
            <div className="flex justify-between items-center border-b-2 border-gray-100 pb-3">
              <h3 className="text-xl font-black text-gray-800">Comentarios ({task.comments.length})</h3>
            </div>
            <div className="space-y-5">
              {task.comments.map(c => (
                <div key={c.id} className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-black text-blue-800 text-xs uppercase tracking-wider">{c.author}</span>
                    <span className="text-[10px] font-bold text-gray-400">{new Date(c.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-base text-gray-700 leading-snug">{c.text}</p>
                </div>
              ))}
              {task.comments.length === 0 && <p className="text-base text-gray-400 italic">No hay comentarios aún.</p>}
            </div>
            
            <div className="mt-6 flex space-x-3">
              <input 
                type="text"
                placeholder="Escribe un comentario..."
                className="flex-1 p-3 border border-gray-200 rounded-xl text-base outline-none focus:ring-2 focus:ring-brand bg-white shadow-sm"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              />
              <button 
                type="button"
                onClick={handleAddComment}
                className="bg-brand text-white px-6 py-3 rounded-xl text-base font-black hover:bg-brand-dark transition-all shadow-md active:scale-95"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>

        {/* Footer: Acciones fijas al final */}
        <div className="p-8 border-t bg-gray-50 flex justify-between items-center shrink-0">
          <div>
            {isHead && (
              <button 
                type="button"
                onClick={() => { onDelete(task.id); }}
                className="px-5 py-3 text-red-600 hover:text-white hover:bg-red-500 font-black text-xs flex items-center bg-red-50 rounded-xl border border-red-100 transition-all active:scale-95 uppercase tracking-wide"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                Eliminar
              </button>
            )}
          </div>
          <div className="flex space-x-4">
            <button type="button" onClick={onClose} className="px-8 py-3 text-gray-500 hover:bg-gray-200 rounded-xl font-black text-xs transition-all uppercase tracking-wide">
              Cerrar
            </button>
            <button type="button" onClick={handleSaveChanges} className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-lg transition-all active:scale-95 uppercase tracking-wide">
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
