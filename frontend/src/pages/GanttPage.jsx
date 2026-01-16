import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Filter } from 'lucide-react';
import { projectsApi, tasksApi, milestonesApi } from '../services/api';
import GanttChart from '../components/GanttChart';
import TaskModal from '../components/TaskModal';
import MilestoneModal from '../components/MilestoneModal';
import { GamingLayout, GamingHeader, GamingCard, GamingLoader } from '../components/ui';

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

  if (loading) {
    return <GamingLoader message="Caricamento timeline..." />;
  }

  return (
    <GamingLayout>
      <GamingHeader
        title="Diagramma di Gantt"
        subtitle="Timeline progetti R&D"
        icon={BarChart3}
      />

      {/* Filter */}
      <GamingCard>
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-blue-600" />
          <label className="text-sm font-bold text-slate-900">
            Filtra per progetto
          </label>
        </div>
        <select
          className="w-full bg-white border-2 border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
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
      </GamingCard>

      {/* Gantt Chart */}
      <GamingCard>
        <GanttChart
          milestones={filteredMilestones}
          tasks={filteredTasks}
          onTaskClick={handleTaskClick}
          onMilestoneClick={handleMilestoneClick}
        />
      </GamingCard>

      {/* Info Box */}
      <GamingCard>
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div className="text-sm text-slate-600">
            <p className="font-bold text-slate-900 mb-3">Informazioni sul Gantt</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Le barre rappresentano la durata delle milestone e attività</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>La linea rossa verticale indica la data odierna</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Clicca su una barra per visualizzare i dettagli</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Le attività sono raggruppate sotto le rispettive milestone</span>
              </li>
            </ul>
          </div>
        </div>
      </GamingCard>

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
    </GamingLayout>
  );
}
