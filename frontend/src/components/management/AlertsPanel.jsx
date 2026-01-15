import { AlertCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { Card } from '../ui';

const AlertsPanel = ({ alerts, onTaskClick }) => {
  if (!alerts) return null;

  const { summary, blocked, overdue, waiting_clarification, approaching_deadline } = alerts;
  const totalAlerts = summary?.total_alerts || 0;

  if (totalAlerts === 0) {
    return (
      <Card className="alert-success mb-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <AlertCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900">Tutto OK!</h3>
            <p className="text-sm text-green-700">Nessun blocco o problema rilevato</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="alert-critical mb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                {totalAlerts} Alert {totalAlerts === 1 ? 'Attivo' : 'Attivi'}
              </h3>
              <p className="text-sm text-red-700">
                {summary.blocked_count} bloccati • {summary.overdue_count} scaduti • {summary.waiting_count} in attesa
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Blocked Tasks */}
      {blocked && blocked.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-gray-900">
              Task Bloccati ({blocked.length})
            </h4>
          </div>
          <div className="space-y-2">
            {blocked.map(task => (
              <div
                key={task.id}
                onClick={() => onTaskClick && onTaskClick(task)}
                className="p-3 alert-critical mb-2 rounded-lg hover:bg-red-100 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{task.title}</h5>
                    <p className="text-sm text-gray-600">
                      {task.project_name && `${task.project_name} • `}
                      Assegnato a: {task.assigned_to_name}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded">
                    {task.days_blocked} {task.days_blocked === 1 ? 'giorno' : 'giorni'}
                  </span>
                </div>
                {task.blocked_reason && (
                  <p className="text-sm text-gray-700 mt-2 italic">
                    Motivo: {task.blocked_reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Overdue Tasks */}
      {overdue && overdue.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h4 className="font-semibold text-gray-900">
              Task Scaduti ({overdue.length})
            </h4>
          </div>
          <div className="space-y-2">
            {overdue.map(task => (
              <div
                key={task.id}
                onClick={() => onTaskClick && onTaskClick(task)}
                className="p-3 alert-warning mb-2 rounded-lg hover:bg-amber-100 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{task.title}</h5>
                    <p className="text-sm text-gray-600">
                      {task.project_name && `${task.project_name} • `}
                      Assegnato a: {task.assigned_to_name}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded">
                    Scaduto {task.days_overdue} {task.days_overdue === 1 ? 'giorno fa' : 'giorni fa'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Waiting Clarification */}
      {waiting_clarification && waiting_clarification.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <h4 className="font-semibold text-gray-900">
              In Attesa Chiarimenti ({waiting_clarification.length})
            </h4>
          </div>
          <div className="space-y-2">
            {waiting_clarification.map(task => (
              <div
                key={task.id}
                onClick={() => onTaskClick && onTaskClick(task)}
                className="p-3 alert-warning mb-2 rounded-lg hover:bg-amber-100 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{task.title}</h5>
                    <p className="text-sm text-gray-600">
                      {task.project_name && `${task.project_name} • `}
                      Assegnato a: {task.assigned_to_name}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                    {task.days_waiting} {task.days_waiting === 1 ? 'giorno' : 'giorni'}
                  </span>
                </div>
                {task.clarification_needed && (
                  <p className="text-sm text-gray-700 mt-2 italic">
                    "{task.clarification_needed}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Approaching Deadline */}
      {approaching_deadline && approaching_deadline.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">
              Scadenze Imminenti ({approaching_deadline.length})
            </h4>
          </div>
          <div className="space-y-2">
            {approaching_deadline.map(task => (
              <div
                key={task.id}
                onClick={() => onTaskClick && onTaskClick(task)}
                className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{task.title}</h5>
                    <p className="text-sm text-gray-600">
                      {task.project_name && `${task.project_name} • `}
                      Assegnato a: {task.assigned_to_name}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                    {task.days_until_deadline} {task.days_until_deadline === 1 ? 'giorno' : 'giorni'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AlertsPanel;
