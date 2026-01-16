import { useState, useEffect } from 'react';
import { X, Download, Calendar } from 'lucide-react';
import { tasksApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DailyReportModal({ onClose }) {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [date]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await tasksApi.getDailyReport({ date, user_id: user.id });
      setReport(response.data);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const exportReport = () => {
    if (!report) return;

    let text = `REPORT GIORNALIERO - ${new Date(date).toLocaleDateString('it-IT')}\n`;
    text += `Dipendente: ${user.first_name} ${user.last_name}\n`;
    text += `Tempo totale: ${formatTime(report.total_time_seconds)}\n\n`;

    text += `=== TASK COMPLETATI (${report.completed_tasks.length}) ===\n`;
    report.completed_tasks.forEach(task => {
      text += `- ${task.title}\n`;
      if (task.time_spent > 0) text += `  Tempo: ${formatTime(task.time_spent)}\n`;
    });

    text += `\n=== TASK IN CORSO (${report.in_progress_tasks.length}) ===\n`;
    report.in_progress_tasks.forEach(task => {
      text += `- ${task.title}\n`;
      if (task.time_spent > 0) text += `  Tempo: ${formatTime(task.time_spent)}\n`;
    });

    if (report.blocked_tasks.length > 0) {
      text += `\n=== TASK BLOCCATI (${report.blocked_tasks.length}) ===\n`;
      report.blocked_tasks.forEach(task => {
        text += `- ${task.title}\n`;
        if (task.blocked_reason) text += `  Motivo: ${task.blocked_reason}\n`;
      });
    }

    if (report.waiting_clarification_tasks.length > 0) {
      text += `\n=== IN ATTESA DI CHIARIMENTI (${report.waiting_clarification_tasks.length}) ===\n`;
      report.waiting_clarification_tasks.forEach(task => {
        text += `- ${task.title}\n`;
        if (task.clarification_needed) text += `  Richiesta: ${task.clarification_needed}\n`;
      });
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-slate-200">
        <div className="sticky top-0 bg-white border-b-2 border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Report Giornaliero</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data
              </label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <button
              onClick={exportReport}
              disabled={!report || loading}
              className="btn-secondary flex items-center gap-2 mt-7"
            >
              <Download className="w-4 h-4" />
              Esporta
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Caricamento...</div>
          ) : !report ? (
            <div className="text-center py-12 text-gray-500">Nessun dato disponibile</div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-white border-2 border-primary-200 rounded-xl p-4 shadow-md">
                <h3 className="font-semibold text-primary-900 mb-2">Riepilogo</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-primary-600">
                      {report.completed_tasks.length}
                    </div>
                    <div className="text-sm text-primary-600">Completati</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {report.in_progress_tasks.length}
                    </div>
                    <div className="text-sm text-blue-600">In corso</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary-900">
                      {formatTime(report.total_time_seconds)}
                    </div>
                    <div className="text-sm text-primary-600">Tempo totale</div>
                  </div>
                </div>
              </div>

              {/* Completed */}
              {report.completed_tasks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    Completati ({report.completed_tasks.length})
                  </h3>
                  <div className="space-y-2">
                    {report.completed_tasks.map(task => (
                      <div key={task.id} className="bg-white border-2 border-primary-200 rounded-xl p-3 shadow-sm">
                        <div className="font-medium text-gray-900">{task.title}</div>
                        {task.time_spent > 0 && (
                          <div className="text-sm text-gray-600">
                            Tempo: {formatTime(task.time_spent)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* In Progress */}
              {report.in_progress_tasks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    In Corso ({report.in_progress_tasks.length})
                  </h3>
                  <div className="space-y-2">
                    {report.in_progress_tasks.map(task => (
                      <div key={task.id} className="bg-white border-2 border-primary-300 rounded-xl p-3 shadow-sm">
                        <div className="font-medium text-gray-900">{task.title}</div>
                        {task.time_spent > 0 && (
                          <div className="text-sm text-gray-600">
                            Tempo: {formatTime(task.time_spent)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blocked */}
              {report.blocked_tasks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    Bloccati ({report.blocked_tasks.length})
                  </h3>
                  <div className="space-y-2">
                    {report.blocked_tasks.map(task => (
                      <div key={task.id} className="card-stat from-slate-50 to-slate-100 border-slate-200">
                        <div className="font-medium text-gray-900">{task.title}</div>
                        {task.blocked_reason && (
                          <div className="text-sm text-red-700 mt-1">
                            Motivo: {task.blocked_reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Waiting */}
              {report.waiting_clarification_tasks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                    In Attesa di Chiarimenti ({report.waiting_clarification_tasks.length})
                  </h3>
                  <div className="space-y-2">
                    {report.waiting_clarification_tasks.map(task => (
                      <div key={task.id} className="card-stat from-slate-100 to-slate-200 border-slate-300">
                        <div className="font-medium text-gray-900">{task.title}</div>
                        {task.clarification_needed && (
                          <div className="text-sm text-yellow-700 mt-1">
                            Richiesta: {task.clarification_needed}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
