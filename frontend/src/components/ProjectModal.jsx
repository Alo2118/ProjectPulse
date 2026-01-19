import { useState } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { projectsApi } from '../services/api';

export default function ProjectModal({ project, onClose, onSave }) {
  const { colors, spacing } = useTheme();
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (project) {
        await projectsApi.update(project.id, formData);
      } else {
        await projectsApi.create(formData);
      }
      onSave();
      onClose();
    } catch (error) {
      alert(error.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${colors.bg.primary} bg-black/60 p-4 backdrop-blur-sm`}>
      <div className={`${colors.bg.primary} ${colors.text.primary} rounded-lg border-2 ${colors.border} w-full max-w-lg ${spacing.cardP} shadow-lg`}>
        <div className="mb-4 flex items-center justify-between border-b-2 pb-4">
          <h2 className="text-2xl font-bold">{project ? 'Modifica Progetto' : 'Nuovo Progetto'}</h2>
          <button
            onClick={onClose}
            className="text-cyan-400/60 transition-colors hover:text-cyan-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`${colors.text.secondary} mb-2 block text-sm font-semibold`}>Nome Progetto *</label>
            <input
              type="text"
              className={`w-full rounded-lg px-3 py-2 ${colors.bg.secondary} ${colors.text.primary} ${colors.border} border-2 transition-all focus:ring-2 focus:ring-cyan-500`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
              placeholder="es: Sito Web Cliente X"
            />
          </div>

          <div>
            <label className={`${colors.text.secondary} mb-2 block text-sm font-semibold`}>Descrizione</label>
            <textarea
              className={`w-full rounded-lg px-3 py-2 ${colors.bg.secondary} ${colors.text.primary} ${colors.border} border-2 transition-all focus:ring-2 focus:ring-cyan-500`}
              rows="4"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrivi il progetto, obiettivi, scadenze..."
            />
          </div>

          <div className={`flex gap-3 border-t-2 ${colors.border} pt-4`}>
            <button type="submit" disabled={loading} className="flex-1 rounded-lg px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-700 hover:to-blue-700 transition-colors disabled:opacity-50">
              {loading ? 'Salvataggio...' : project ? 'Salva Modifiche' : 'Crea Progetto'}
            </button>
            <button type="button" onClick={onClose} className={`rounded-lg px-4 py-2 ${colors.bg.secondary} ${colors.text.secondary} font-semibold hover:${colors.bg.hover} transition-colors`}>
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
