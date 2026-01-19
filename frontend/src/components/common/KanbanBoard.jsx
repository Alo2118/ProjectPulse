import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Clock, User, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useTheme } from '../../hooks/useTheme';
import TaskTreeNode from '../TaskTreeNode';

const KanbanBoard = ({ tasks, onTaskClick, onTaskUpdate, columns }) => {
  const { colors, spacing } = useTheme();
  const [expandedTasks, setExpandedTasks] = useState({});

  const defaultColumns = [
    {
      id: 'todo',
      title: 'Da fare',
      color: 'bg-slate-800/50 border-2 border-slate-700/50',
      textColor: 'text-slate-200',
    },
    {
      id: 'in_progress',
      title: 'In corso',
      color: 'bg-blue-500/20 border-2 border-blue-500/30',
      textColor: 'text-blue-300',
    },
    {
      id: 'blocked',
      title: 'Bloccato',
      color: 'bg-red-500/20 border-2 border-red-500/30',
      textColor: 'text-red-300',
    },
    {
      id: 'waiting_clarification',
      title: 'In attesa',
      color: 'bg-amber-500/20 border-2 border-amber-500/30',
      textColor: 'text-amber-300',
    },
    {
      id: 'completed',
      title: 'Completato',
      color: 'bg-green-500/20 border-2 border-green-500/30',
      textColor: 'text-green-300',
    },
  ];

  const kanbanColumns = columns || defaultColumns;

  const handleToggleExpand = (taskId) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const taskId = parseInt(result.draggableId);
    const newStatus = result.destination.droppableId;

    // Trova il task
    const task = tasks.find((t) => t.id === taskId);
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
    return tasks.filter((task) => task.status === status && !task.parent_task_id);
  };

  const getSubtasksForTask = (taskId) => {
    // Ritorna tutti i subtask di un task
    return tasks.filter((task) => task.parent_task_id === taskId);
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
      bassa: 'text-slate-400',
      media: 'text-cyan-400',
      alta: 'text-orange-400',
      critica: 'text-red-400',
    };
    return colors[priority] || 'text-slate-500';
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-3 overflow-x-auto pb-4 sm:grid-cols-2 lg:grid-cols-5">
        {kanbanColumns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);

          return (
            <div key={column.id} className="flex min-w-[280px] flex-col sm:min-w-0">
              {/* Column Header */}
              <div className={`${column.color} ${column.textColor} rounded-t-xl p-4 shadow-md`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold">{column.title}</h3>
                  <span className="rounded border border-cyan-500/20 bg-slate-700/50 px-2 py-1 text-xs font-medium text-cyan-300 shadow-sm sm:text-sm">
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
                    className={`min-h-[400px] flex-1 rounded-b-xl border-2 border-cyan-500/20 bg-slate-800/30 p-2 shadow-md transition-colors sm:min-h-[500px] ${
                      snapshot.isDraggingOver ? 'bg-cyan-500/10 ring-2 ring-cyan-500/50' : ''
                    }`}
                  >
                    {columnTasks.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-500">Nessun task</div>
                    ) : (
                      columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={
                                snapshot.isDragging
                                  ? 'scale-105 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-500'
                                  : ''
                              }
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
