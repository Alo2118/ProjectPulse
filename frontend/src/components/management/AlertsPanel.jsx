import { AlertCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { Card } from '../ui';

const AlertsPanel = ({ alerts, onTaskClick }) => {
  if (!alerts) return null;

  const { summary, blocked, overdue, waiting_clarification, approaching_deadline } = alerts;
  const totalAlerts = summary?.total_alerts || 0;

  if (totalAlerts === 0) {
    return (
      <Card className="mb-0 border-2 border-green-500/30 bg-green-500/20">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-500/20 p-2">
            <AlertCircle className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-300">Tutto OK!</h3>
            <p className="text-sm text-green-400/70">Nessun blocco o problema rilevato</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="mb-0 border-2 border-red-500/30 bg-red-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/20 p-2">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-300">
                {totalAlerts} Alert {totalAlerts === 1 ? 'Attivo' : 'Attivi'}
              </h3>
              <p className="text-sm text-red-400/70">
                {summary.blocked_count} bloccati • {summary.overdue_count} scaduti •{' '}
                {summary.waiting_count} in attesa
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Blocked Tasks */}
      {blocked && blocked.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-400" />
            <h4 className="font-semibold text-cyan-300">Task Bloccati ({blocked.length})</h4>
          </div>
          <div className="space-y-2">
            {blocked.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick && onTaskClick(task)}
                className="cursor-pointer rounded-xl border-2 border-red-500/30 bg-red-500/10 p-3 shadow-sm transition-all hover:bg-red-500/15 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-slate-200">{task.title}</h5>
                    <p className="text-sm text-slate-400">
                      {task.project_name && `${task.project_name} • `}
                      Assegnato a: {task.assigned_to_name}
                    </p>
                  </div>
                  <span className="rounded border border-red-500/40 bg-red-500/30 px-2 py-1 text-xs font-semibold text-red-300">
                    {task.days_blocked} {task.days_blocked === 1 ? 'giorno' : 'giorni'}
                  </span>
                </div>
                {task.blocked_reason && (
                  <p className="mt-2 text-sm italic text-slate-400">
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
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            <h4 className="font-semibold text-cyan-300">Task Scaduti ({overdue.length})</h4>
          </div>
          <div className="space-y-2">
            {overdue.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick && onTaskClick(task)}
                className="cursor-pointer rounded-xl border-2 border-orange-500/30 bg-orange-500/10 p-3 shadow-sm transition-all hover:bg-orange-500/15 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-slate-200">{task.title}</h5>
                    <p className="text-sm text-slate-400">
                      {task.project_name && `${task.project_name} • `}
                      Assegnato a: {task.assigned_to_name}
                    </p>
                  </div>
                  <span className="rounded border border-orange-500/40 bg-orange-500/30 px-2 py-1 text-xs font-semibold text-orange-300">
                    Scaduto {task.days_overdue}{' '}
                    {task.days_overdue === 1 ? 'giorno fa' : 'giorni fa'}
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
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            <h4 className="font-semibold text-cyan-300">
              In Attesa Chiarimenti ({waiting_clarification.length})
            </h4>
          </div>
          <div className="space-y-2">
            {waiting_clarification.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick && onTaskClick(task)}
                className="cursor-pointer rounded-xl border-2 border-amber-500/30 bg-amber-500/10 p-3 shadow-sm transition-all hover:bg-amber-500/15 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-slate-200">{task.title}</h5>
                    <p className="text-sm text-slate-400">
                      {task.project_name && `${task.project_name} • `}
                      Assegnato a: {task.assigned_to_name}
                    </p>
                  </div>
                  <span className="rounded border border-amber-500/40 bg-amber-500/30 px-2 py-1 text-xs font-semibold text-amber-300">
                    {task.days_waiting} {task.days_waiting === 1 ? 'giorno' : 'giorni'}
                  </span>
                </div>
                {task.clarification_needed && (
                  <p className="mt-2 text-sm italic text-slate-400">
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
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-400" />
            <h4 className="font-semibold text-cyan-300">
              Scadenze Imminenti ({approaching_deadline.length})
            </h4>
          </div>
          <div className="space-y-2">
            {approaching_deadline.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick && onTaskClick(task)}
                className="cursor-pointer rounded-xl border-2 border-cyan-500/30 bg-cyan-500/10 p-3 shadow-sm transition-all hover:bg-cyan-500/15 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-slate-200">{task.title}</h5>
                    <p className="text-sm text-slate-400">
                      {task.project_name && `${task.project_name} • `}
                      Assegnato a: {task.assigned_to_name}
                    </p>
                  </div>
                  <span className="rounded border border-cyan-500/40 bg-cyan-500/30 px-2 py-1 text-xs font-semibold text-cyan-300">
                    {task.days_until_deadline}{' '}
                    {task.days_until_deadline === 1 ? 'giorno' : 'giorni'}
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
