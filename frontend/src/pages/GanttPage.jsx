import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Filter } from 'lucide-react';
import { projectsApi, tasksApi, milestonesApi } from '../services/api';
import GanttChart from '../components/GanttChart';
import TaskModal from '../components/TaskModal';
import MilestoneModal from '../components/MilestoneModal';

export default function GanttPage() {
  const [projects, setProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [allMilestones, setAllMilestones] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        projectsApi.getAll(),
        tasksApi.getAll()
      ]);

      setProjects(projectsRes.data);
      // Handle paginated response from tasks API
      const tasksData = tasksRes.data.data || tasksRes.data;
      setAllTasks(tasksData);

      // Load milestones for all projects
      const milestonesPromises = projectsRes.data.map(p =>
        milestonesApi.getByProject(p.id).catch(() => ({ data: [] }))
      );
      const milestonesResults = await Promise.all(milestonesPromises);
      const allMilestonesData = milestonesResults.flatMap(r => r.data);
      setAllMilestones(allMilestonesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Memoize filtered data
  const filteredMilestones = useMemo(() =>
    selectedProject === 'all'
      ? allMilestones
      : allMilestones.filter(m => m.project_id === parseInt(selectedProject)),
    [allMilestones, selectedProject]
  );

  const filteredTasks = useMemo(() =>
    selectedProject === 'all'
      ? allTasks
      : allTasks.filter(t => t.project_id === parseInt(selectedProject)),
    [allTasks, selectedProject]
  );

  const handleTaskClick = (task) => {
    const fullTask = allTasks.find(t => t.id === task.id);
    setSelectedTask(fullTask);
  };

  const handleMilestoneClick = (milestone) => {
    setSelectedMilestone(milestone);
    setShowMilestoneModal(true);
  };

  return (
    <div className="page-container">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 animate-slide-right">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="page-title flex items-center gap-2">
                📊 Diagramma di Gantt
              </h2>
              <p className="text-slate-600 mt-0.5 text-xs">
                Timeline progetti R&D
              </p>
            </div>
          </div>

          {/* Filter */}
          <div className="card-compact">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔍</span>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Filtra per progetto
                </label>
                <select
                  className="input max-w-md text-sm"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  <option value="all">Tutti i progetti R&D</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        {loading ? (
          <div className="card">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-300 rounded w-full"></div>
              <div className="h-12 bg-gray-200 rounded w-full"></div>
              <div className="h-12 bg-gray-200 rounded w-full"></div>
              <div className="h-12 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ) : (
          <div className="animate-slide-up">
            <GanttChart
              milestones={filteredMilestones}
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              onMilestoneClick={handleMilestoneClick}
            />
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 card bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-4">Informazioni sul Gantt</p>
              <ul className="space-y-4 text-blue-800">
                <li>• Le barre rappresentano la durata delle milestone e attività</li>
                <li>• La linea rossa verticale indica la data odierna</li>
                <li>• Clicca su una barra per visualizzare i dettagli</li>
                <li>• Le attività sono raggruppate sotto le rispettive milestone</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            loadData();
            setSelectedTask(null);
          }}
        />
      )}

      {/* Milestone Modal */}
      {showMilestoneModal && selectedMilestone && (
        <MilestoneModal
          milestone={selectedMilestone}
          projectId={selectedMilestone.project_id}
          onClose={() => {
            setShowMilestoneModal(false);
            setSelectedMilestone(null);
          }}
          onSave={() => {
            setShowMilestoneModal(false);
            setSelectedMilestone(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
