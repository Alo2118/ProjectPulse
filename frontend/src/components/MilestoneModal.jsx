import { useState } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../context/ToastContext';
import { milestonesApi } from '../services/api';

export default function MilestoneModal({ milestone, projectId, onClose, onSave }) {
  const { colors, spacing } = useTheme();
  const { error: showError } = useToast();
  const [formData, setFormData] = useState({
    name: milestone?.name || '',
    description: milestone?.description || '',
    due_date: milestone?.due_date || '',
    project_id: projectId,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (milestone) {
        await milestonesApi.update(milestone.id, formData);
      } else {
        await milestonesApi.create(formData);
      }
      onSave();
      onClose();
    } catch (error) {
      showError(error.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`${colors.bg.primary} ${colors.text.primary} rounded-lg border-2 ${colors.border} w-full max-w-lg ${spacing.cardP} shadow-lg`}>
        <div className="mb-4 flex items-center justify-between border-b-2 pb-4">
          <h2 className="text-2xl font-bold">{milestone ? 'Modifica Milestone' : 'Nuova Milestone'}</h2>
          <button
            onClick={onClose}
            className="text-cyan-400/60 transition-colors hover:text-cyan-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`${colors.text.secondary} mb-2 block text-sm font-semibold`}>Nome Milestone *</label>
            <input
              type="text"
              className={`w-full rounded-lg px-3 py-2 ${colors.bg.secondary} ${colors.text.primary} ${colors.border} border-2 transition-all focus:ring-2 focus:ring-cyan-500`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
              placeholder="es: Release v1.0, Beta Testing..."
            />
          </div>

          <div>
            <label className="text-label mb-2 block">Descrizione</label>
            <textarea
              className="textarea-dark w-full"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrivi gli obiettivi della milestone..."
            />
          </div>

          <div>
            <label className="text-label mb-2 block">Data di Scadenza</label>
            <input
              type="date"
              className="input-dark w-full"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="flex gap-3 border-t-2 border-cyan-500/20 pt-4">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Salvataggio...' : milestone ? 'Salva Modifiche' : 'Crea Milestone'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
