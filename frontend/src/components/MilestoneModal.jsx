import { useState } from 'react';
import { X } from 'lucide-react';
import { milestonesApi } from '../services/api';

export default function MilestoneModal({ milestone, projectId, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: milestone?.name || '',
    description: milestone?.description || '',
    due_date: milestone?.due_date || '',
    project_id: projectId
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
      alert(error.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border-2 border-slate-200">
        <div className="border-b-2 border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {milestone ? 'Modifica Milestone' : 'Nuova Milestone'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Milestone *
            </label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
              placeholder="es: Release v1.0, Beta Testing..."
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
              placeholder="Descrivi gli obiettivi della milestone..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scadenza
            </label>
            <input
              type="date"
              className="input"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t-2 border-slate-200 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Salvataggio...' : milestone ? 'Salva Modifiche' : 'Crea Milestone'}
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
