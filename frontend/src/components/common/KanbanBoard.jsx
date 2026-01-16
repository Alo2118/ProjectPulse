import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Clock, User, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import TaskTreeNode from '../TaskTreeNode';

const KanbanBoard = ({ tasks, onTaskClick, onTaskUpdate, columns }) => {
  const [expandedTasks, setExpandedTasks] = useState({});

  const defaultColumns = [
    { id: 'todo', title: 'Da fare', color: 'bg-slate-200 border-2 border-slate-300', textColor: 'text-slate-900' },
    { id: 'in_progress', title: 'In corso', color: 'bg-blue-100 border-2 border-blue-300', textColor: 'text-blue-900' },
    { id: 'blocked', title: 'Bloccato', color: 'bg-red-100 border-2 border-red-300', textColor: 'text-red-900' },
    { id: 'waiting_clarification', title: 'In attesa', color: 'bg-amber-100 border-2 border-amber-300', textColor: 'text-amber-900' },
    { id: 'completed', title: 'Completato', color: 'bg-emerald-100 border-2 border-emerald-300', textColor: 'text-emerald-900' }
  ];

  const kanbanColumns = columns || defaultColumns;

  const handleToggleExpand = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const taskId = parseInt(result.draggableId);
    const newStatus = result.destination.droppableId;

    // Trova il task
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Aggiorna il task
    if (onTaskUpdate) {
      try {
        await onTaskUpdate(taskId, { status: newStatus });
      } catch (error) {
        console.error('Errore aggiornamento task:', error);
      }
    }
  };

  const getTasksByStatus = (status) => {
    // Filtra solo i task root (senza parent)
    return tasks.filter(task => task.status === status && !task.parent_task_id);
  };

  const getSubtasksForTask = (taskId) => {
    // Ritorna tutti i subtask di un task
    return tasks.filter(task => task.parent_task_id === taskId);
  };

  const isOverdue = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date() && deadline !== 'completed';
  };

  const isApproaching = (deadline) => {
    if (!deadline) return false;
    const daysUntil = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 3 && daysUntil > 0;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      bassa: 'text-slate-500',
      media: 'text-primary-600',
      alta: 'text-primary-700',
      critica: 'text-slate-900'
    };
    return colors[priority] || 'text-slate-500';
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 overflow-x-auto pb-4">
        {kanbanColumns.map(column => {
          const columnTasks = getTasksByStatus(column.id);

          return (
            <div key={column.id} className="flex flex-col min-w-[280px] sm:min-w-0">
              {/* Column Header */}
              <div className={`${column.color} ${column.textColor} p-4 rounded-t-xl shadow-md`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">{column.title}</h3>
                  <span className="text-xs sm:text-sm font-medium bg-white px-2 py-1 rounded shadow-sm">
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-2 bg-white rounded-b-xl min-h-[400px] sm:min-h-[500px] transition-colors shadow-md border-2 border-slate-200 ${
                      snapshot.isDraggingOver ? 'bg-blue-50 ring-2 ring-blue-300' : ''
                    }`}
                  >
                    {columnTasks.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        Nessun task
                      </div>
                    ) : (
                      columnTasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id.toString()}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? 'shadow-lg ring-2 ring-primary-400 scale-105' : ''}
                            >
                              <TaskTreeNode
                                task={task}
                                subtasks={getSubtasksForTask(task.id)}
                                onTaskClick={onTaskClick}
                                onTaskUpdate={onTaskUpdate}
                                expandedTasks={expandedTasks}
                                onToggleExpand={handleToggleExpand}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
