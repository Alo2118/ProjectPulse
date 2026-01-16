import { useState, useEffect } from 'react';
import { 
  Clock, TrendingUp, Target, Filter, Download, CheckCircle2, 
  Briefcase, Activity, Award, Users, ChevronRight, AlertCircle, Zap
} from 'lucide-react';
import { reportsApi } from '../services/api';
import { formatTime } from '../utils/helpers';
import { getStatusConfig, calculateProjectProgress, getProjectHealthColor } from '../utils/statusConfig';
import { GamingLayout, GamingCard, GamingLoader } from '../components/ui';
import { GamingKPICard, GamingKPIGrid } from '../components/ui';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    userId: '',
    projectId: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.userId) params.user_id = filters.userId;
      if (filters.projectId) params.project_id = filters.projectId;
      
      const response = await reportsApi.getWeekly(params);
      setReportData(response.data);
    } catch (error) {
      console.error('Errore nel caricamento del report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <GamingLoader message="Caricamento Mission Control..." />;
  }

  if (!reportData) return null;

  const totalHours = (reportData.totalPeriodSeconds || 0) / 3600;
  const totalTasks = reportData.taskTree?.length || 0;
  const completedTasks = reportData.taskTree?.filter(t => t.status === 'completed').length || 0;
  const activeProjects = reportData.projects?.filter(p => p.tasks?.some(t => t.status === 'in_progress')).length || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <GamingLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Activity className="w-8 h-8 text-blue-600" />
              Mission Control
            </h1>
            <p className="text-base text-slate-600 font-medium">Monitor progetti e performance in tempo reale</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`${showFilters ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border-2 border-slate-300'} hover:bg-blue-50 hover:border-blue-400 px-4 py-2 rounded-lg flex items-center transition-all font-bold shadow-sm hover:shadow-md`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtri
            </button>
            <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg flex items-center shadow-xl hover:shadow-2xl transition-all font-bold">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Filtri */}
        {showFilters && (
          <GamingCard className="animate-in slide-in-from-top duration-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Data Inizio</label>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters({...filters, from: e.target.value})}
                  className="w-full px-4 py-2 bg-white border-2 border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Data Fine</label>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters({...filters, to: e.target.value})}
                  className="w-full px-4 py-2 bg-white border-2 border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Utente</label>
                <input
                  type="text"
                  value={filters.userId}
                  onChange={(e) => setFilters({...filters, userId: e.target.value})}
                  placeholder="ID Utente"
                  className="w-full px-4 py-2 bg-white border-2 border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Progetto</label>
                <input
                  type="text"
                  value={filters.projectId}
                  onChange={(e) => setFilters({...filters, projectId: e.target.value})}
                  placeholder="ID Progetto"
                  className="w-full px-4 py-2 bg-white border-2 border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>
          </GamingCard>
        )}

        {/* KPI Cards */}
        <GamingKPIGrid>
          <GamingKPICard
            icon={Clock}
            title="Ore Totali"
            value={`${totalHours.toFixed(1)}h`}
            color="cyan"
            subtitle="+12% vs settimana scorsa"
            subtitleIcon={TrendingUp}
          />
          <GamingKPICard
            icon={CheckCircle2}
            title="Task Completati"
            value={`${completedTasks}/${totalTasks}`}
            color="emerald"
            subtitle={`${completionRate}% completamento`}
            subtitleIcon={Award}
          />
          <GamingKPICard
            icon={Briefcase}
            title="Progetti Attivi"
            value={activeProjects}
            color="purple"
            subtitle="In lavorazione"
            subtitleIcon={Zap}
          />
          <GamingKPICard
            icon={Target}
            title="Efficienza"
            value={`${completionRate}%`}
            color="orange"
            subtitle="Performance ottima"
            subtitleIcon={TrendingUp}
          />
        </GamingKPIGrid>

        {/* Projects Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-600" />
            Progetti
            <span className="text-sm font-semibold text-slate-600">({reportData.projects?.length || 0})</span>
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {reportData.projects?.map((project) => {
              const progress = calculateProjectProgress(project);
              const hoursWorked = (project.period_seconds || 0) / 3600;
              const hoursEstimated = project.estimated_hours || 0;
              const healthColor = getProjectHealthColor(progress, hoursWorked, hoursEstimated);
              const isOverBudget = hoursEstimated > 0 && hoursWorked > hoursEstimated;
              
              return (
                <GamingCard 
                  key={project.id} 
                  className="relative overflow-hidden group cursor-pointer"
                >
                  {/* Progress Background */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-600/20 to-blue-600/20 transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  ></div>

                  <div className="relative z-10 p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-slate-900">
                            {project.name}
                          </h3>
                          {progress === 100 && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold rounded-full shadow-lg">
                              <Award className="w-3 h-3 inline mr-1" />
                              COMPLETATO
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-slate-600 text-sm">{project.description}</p>
                        )}
                      </div>

                      {/* Health Indicator */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-${healthColor}-100 border-2 border-${healthColor}-300`}>
                        <div className={`w-2.5 h-2.5 rounded-full bg-${healthColor}-600 shadow-md`}></div>
                        <span className={`text-${healthColor}-700 text-sm font-bold`}>{progress}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner border border-slate-300">
                        <div 
                          className={`h-full bg-gradient-to-r from-${healthColor}-600 to-${healthColor}-500 rounded-full transition-all duration-1000 shadow-sm`}
                          style={{ width: `${progress}%` }}
                        >
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center p-2 bg-white rounded-lg border-2 border-slate-200">
                        <Clock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                        <p className="text-xs text-slate-600 mb-0.5 font-semibold">Ore Lavorate</p>
                        <p className={`text-lg font-bold ${isOverBudget ? 'text-red-700' : 'text-slate-900'}`}>
                          {hoursWorked.toFixed(1)}h
                        </p>
                        {hoursEstimated > 0 && (
                          <p className="text-xs text-slate-500 font-medium">/ {hoursEstimated}h stimate</p>
                        )}
                      </div>

                      <div className="text-center p-2 bg-white rounded-lg border-2 border-emerald-200">
                        <Target className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                        <p className="text-xs text-slate-600 mb-0.5 font-semibold">Task</p>
                        <p className="text-lg font-bold text-slate-900">
                          {project.tasks?.filter(t => t.status === 'completed').length || 0}
                          <span className="text-slate-500">/{project.tasks?.length || 0}</span>
                        </p>
                      </div>

                      <div className="text-center p-2 bg-white rounded-lg border-2 border-purple-200">
                        <Users className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                        <p className="text-xs text-slate-600 mb-0.5 font-semibold">Team</p>
                        <p className="text-lg font-bold text-slate-900">
                          {new Set(project.tasks?.map(t => t.assigned_to)).size || 0}
                        </p>
                      </div>
                    </div>

                    {/* Tasks Preview */}
                    {project.tasks && project.tasks.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-slate-700">Task Recenti</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <div className="space-y-1">
                          {project.tasks.slice(0, 3).map((task) => {
                            const statusConfig = getStatusConfig(task.status);
                            const StatusIcon = statusConfig.icon;
                            return (
                              <div 
                                key={task.id}
                                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                              >
                                <StatusIcon className={`w-3.5 h-3.5 text-${statusConfig.color}-600 flex-shrink-0`} />
                                <span className="text-sm text-slate-700 flex-1 truncate font-medium">
                                  {task.title}
                                </span>
                                {task.period_seconds > 0 && (
                                  <span className="text-xs text-blue-600 font-bold">
                                    {formatTime(task.period_seconds)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </GamingCard>
              );
            })}

            {/* Tasks without project */}
            {reportData.taskTree?.filter(t => !t.project_name).length > 0 && (
              <GamingCard className="relative overflow-hidden hover:border-orange-400 border-2">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-bold text-slate-900">Task Senza Progetto</h3>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full border-2 border-orange-300">
                      {reportData.taskTree.filter(t => !t.project_name).length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {reportData.taskTree.filter(t => !t.project_name).slice(0, 5).map((task) => {
                      const statusConfig = getStatusConfig(task.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <div 
                          key={task.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                        >
                          <StatusIcon className={`w-3.5 h-3.5 text-${statusConfig.color}-600`} />
                          <span className="text-sm text-slate-700 flex-1 font-medium">{task.title}</span>
                          {task.period_seconds > 0 && (
                            <span className="text-xs text-blue-600 font-bold">
                              {formatTime(task.period_seconds)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </GamingCard>
            )}
          </div>
        </div>

        {/* Activity Timeline */}
        {reportData.taskTree && reportData.taskTree.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-600" />
              Timeline Attività
            </h2>

            <GamingCard>
              <div className="space-y-3">
                {(() => {
                  // Group tasks by project
                  const tasksByProject = reportData.taskTree.reduce((acc, task) => {
                    const projectKey = task.project_name || 'Senza Progetto';
                    if (!acc[projectKey]) {
                      acc[projectKey] = [];
                    }
                    acc[projectKey].push(task);
                    return acc;
                  }, {});
                  
                  const renderTask = (task, level = 0, index = 0, showProject = false) => {
                    const statusConfig = getStatusConfig(task.status);
                    const StatusIcon = statusConfig.icon;
                    const allTasks = tasksByProject[task.project_name || 'Senza Progetto'];
                    const subtasks = allTasks.filter(t => t.parent_task_id === task.id);
                    const hasSubtasks = subtasks.length > 0;
                    const isSubtask = level > 0;
                    
                    return (
                      <div key={task.id}>
                        <div 
                          className={`flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 cursor-pointer ${isSubtask ? 'ml-8 bg-slate-100/50' : ''}`}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {/* Indent indicator for subtasks */}
                          {isSubtask && (
                            <div className="flex-shrink-0 flex items-center">
                              <div className="w-6 h-6 flex items-center justify-center">
                                <div className="w-4 h-px bg-slate-300"></div>
                                <ChevronRight className="w-3 h-3 text-slate-400 -ml-1" />
                              </div>
                            </div>
                          )}
                          
                          {/* Status Icon */}
                          <div className={`flex-shrink-0 ${isSubtask ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-gradient-to-br ${statusConfig.gradient} flex items-center justify-center shadow-md`}>
                            <StatusIcon className={`${isSubtask ? 'w-3 h-3' : 'w-4 h-4'} text-white`} />
                          </div>

                          {/* Task Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className={`text-slate-900 font-semibold truncate ${isSubtask ? 'text-xs' : 'text-sm'}`}>
                                {task.title}
                              </h4>
                              {task.assigned_to_name && (
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                  <span>•</span>
                                  <Users className="w-3 h-3" />
                                  <span className="font-medium">{task.assigned_to_name}</span>
                                </span>
                              )}
                              {hasSubtasks && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-300">
                                  {subtasks.length} sub
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Time */}
                          {task.period_seconds > 0 && (
                            <div className="flex-shrink-0 text-right">
                              <div className={`text-blue-600 font-bold ${isSubtask ? 'text-sm' : 'text-base'}`}>
                                {formatTime(task.period_seconds)}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">ore</div>
                            </div>
                          )}
                        </div>
                        
                        {/* Render subtasks */}
                        {subtasks.length > 0 && (
                          <div className="space-y-1.5 mt-1.5">
                            {subtasks.map((subtask, subIndex) => renderTask(subtask, level + 1, subIndex, false))}
                          </div>
                        )}
                      </div>
                    );
                  };
                  
                  // Render grouped by project
                  return Object.entries(tasksByProject).map(([projectName, tasks], projIndex) => {
                    const parentTasks = tasks.filter(t => !t.parent_task_id);
                    const totalTime = tasks.reduce((sum, t) => sum + (t.period_seconds || 0), 0);
                    
                    return (
                      <div key={projectName} className="space-y-2">
                        {/* Project Header */}
                        <div className="flex items-center justify-between py-2 px-3 bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg border-l-4 border-blue-600 shadow-sm">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-slate-900 text-sm">{projectName}</h3>
                            <span className="text-xs bg-white text-slate-600 px-2 py-0.5 rounded-full font-semibold border border-slate-200">
                              {tasks.length} task
                            </span>
                          </div>
                          {totalTime > 0 && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm font-bold">{formatTime(totalTime)}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Tasks in this project */}
                        <div className="space-y-1.5">
                          {parentTasks.map((task, index) => renderTask(task, 0, index, false))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </GamingCard>
          </div>
        )}

      </div>
    </GamingLayout>
  );
}
