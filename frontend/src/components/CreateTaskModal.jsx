import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { tasksApi, projectsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CreateTaskModal({ projects, onClose, onCreate }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    priority: 'medium',
    deadline: ''
  });
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let projectId = formData.project_id;

      // Create new project if needed
      if (showNewProject && newProjectName) {
        const response = await projectsApi.create({
          name: newProjectName,
          description: ''
        });
        projectId = response.data.id;
      }

      await tasksApi.create({
        ...formData,
        project_id: projectId || null,
        assigned_to: user.id
      });

      onCreate();
      onClose();
    } catch (error) {
      alert(error.response?.data?.error || 'Errore durante la creazione del task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Nuovo Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titolo *
            </label>
            <input
              type="text"
              className="input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrizione
            </label>
            <textarea
              className="input"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Progetto
              </label>
              <button
                type="button"
                onClick={() => setShowNewProject(!showNewProject)}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Nuovo progetto
              </button>
            </div>

            {showNewProject ? (
              <input
                type="text"
                className="input"
                placeholder="Nome nuovo progetto"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            ) : (
              <select
                className="input"
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              >
                <option value="">Nessun progetto</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priorità
              </label>
              <select
                className="input"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Bassa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scadenza
              </label>
              <input
                type="date"
                className="input"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Creazione...' : 'Crea Task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
