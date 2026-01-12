import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Clock, User, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const KanbanBoard = ({ tasks, onTaskClick, onTaskUpdate, columns }) => {
  const defaultColumns = [
    { id: 'todo', title: 'Da fare', color: 'bg-gray-100', textColor: 'text-gray-700' },
    { id: 'in_progress', title: 'In corso', color: 'bg-blue-100', textColor: 'text-blue-700' },
    { id: 'blocked', title: 'Bloccato', color: 'bg-red-100', textColor: 'text-red-700' },
    { id: 'waiting_clarification', title: 'In attesa', color: 'bg-yellow-100', textColor: 'text-yellow-700' },
    { id: 'completed', title: 'Completato', color: 'bg-green-100', textColor: 'text-green-700' }
  ];

  const kanbanColumns = columns || defaultColumns;

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
    return tasks.filter(task => task.status === status);
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
      bassa: 'text-gray-500',
      media: 'text-blue-500',
      alta: 'text-orange-500',
      critica: 'text-red-500'
    };
    return colors[priority] || 'text-gray-500';
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kanbanColumns.map(column => {
          const columnTasks = getTasksByStatus(column.id);

          return (
            <div key={column.id} className="flex flex-col">
              {/* Column Header */}
              <div className={`${column.color} ${column.textColor} p-3 rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{column.title}</h3>
                  <span className="text-sm font-medium bg-white px-2 py-1 rounded">
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
                    className={`flex-1 p-2 bg-gray-50 rounded-b-lg min-h-[500px] ${
                      snapshot.isDraggingOver ? 'bg-blue-50' : ''
                    }`}
                  >
                    {columnTasks.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">
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
                              onClick={() => onTaskClick && onTaskClick(task)}
                              className={`bg-white p-3 rounded-lg shadow-sm mb-2 cursor-pointer hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''
                              }`}
                            >
                              {/* Task Title */}
                              <h4 className="font-medium text-gray-800 mb-2 line-clamp-2">
                                {task.title}
                              </h4>

                              {/* Task Description */}
                              {task.description && (
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                  {task.description}
                                </p>
                              )}

                              {/* Priority Badge */}
                              {task.priority && (
                                <div className="mb-2">
                                  <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                    ● {task.priority.toUpperCase()}
                                  </span>
                                </div>
                              )}

                              {/* Deadline */}
                              {task.deadline && (
                                <div className={`flex items-center gap-1 text-xs mb-2 ${
                                  isOverdue(task.deadline)
                                    ? 'text-red-600 font-medium'
                                    : isApproaching(task.deadline)
                                    ? 'text-orange-600 font-medium'
                                    : 'text-gray-500'
                                }`}>
                                  <Calendar className="w-3 h-3" />
                                  <span>
                                    {format(new Date(task.deadline), 'dd MMM yyyy', { locale: it })}
                                  </span>
                                  {isOverdue(task.deadline) && (
                                    <AlertCircle className="w-3 h-3 ml-1" />
                                  )}
                                </div>
                              )}

                              {/* Assigned User */}
                              {task.assigned_to_name && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                  <User className="w-3 h-3" />
                                  <span>{task.assigned_to_name}</span>
                                </div>
                              )}

                              {/* Project Name */}
                              {task.project_name && (
                                <div className="text-xs text-gray-500 mb-2">
                                  📁 {task.project_name}
                                </div>
                              )}

                              {/* Time Tracking */}
                              {task.total_time_spent > 0 && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  <span>{Math.round(task.total_time_spent / 60)} min</span>
                                </div>
                              )}

                              {/* Completion indicator for completed tasks */}
                              {task.status === 'completed' && (
                                <div className="mt-2 flex items-center gap-1 text-green-600 text-xs font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Completato</span>
                                </div>
                              )}

                              {/* Subtasks indicator */}
                              {task.subtasks_count > 0 && (
                                <div className="mt-2 text-xs text-gray-500">
                                  📋 {task.subtasks_completed || 0}/{task.subtasks_count} subtask
                                </div>
                              )}
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
