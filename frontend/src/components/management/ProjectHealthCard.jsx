import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';
import { Card } from '../ui';

const ProjectHealthCard = ({ project, onClick }) => {
  if (!project) return null;

  const { name, health_score, health_status, health_color, health_reasons, stats } = project;

  // Determine color classes
  const colorClasses = {
    green: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-300',
      badge: 'bg-green-500/20 text-green-300 border border-green-500/30',
      ring: 'ring-green-500',
    },
    yellow: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-300',
      badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      ring: 'ring-amber-500',
    },
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-300',
      badge: 'bg-red-500/20 text-red-300 border border-red-500/30',
      ring: 'ring-red-500',
    },
  };

  const colors = colorClasses[health_color] || colorClasses.green;

  // Status labels
  const statusLabels = {
    healthy: '🟢 In Linea',
    at_risk: '🟡 A Rischio',
    critical: '🔴 Critico',
  };

  // Calculate completion percentage
  const completionPercent =
    stats?.total_tasks > 0 ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0;

  return (
    <Card
      hover
      onClick={onClick}
      className={`${colors.bg} ${colors.border} cursor-pointer transition-all`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${colors.text}`}>{name}</h3>
            <span
              className={`mt-1 inline-block rounded px-2 py-1 text-xs font-semibold ${colors.badge}`}
            >
              {statusLabels[health_status]}
            </span>
          </div>

          {/* Health Score */}
          <div className="text-right">
            <div className={`text-3xl font-bold ${colors.text}`}>{health_score}</div>
            <div className="text-xs text-gray-600">Health Score</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Completamento</span>
            <span>{completionPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full border-2 border-cyan-500/20 bg-slate-700/50">
            <div
              className={`h-2 rounded-full transition-all ${
                health_color === 'green'
                  ? 'bg-green-500'
                  : health_color === 'yellow'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <div className="font-semibold text-slate-200">{stats.total_tasks}</div>
              <div className="text-slate-400">Totali</div>
            </div>
            <div>
              <div className="font-semibold text-green-400">{stats.completed_tasks}</div>
              <div className="text-slate-400">Completati</div>
            </div>
            {stats.blocked_tasks > 0 && (
              <div>
                <div className="font-semibold text-red-400">{stats.blocked_tasks}</div>
                <div className="text-slate-400">Bloccati</div>
              </div>
            )}
            {stats.overdue_tasks > 0 && (
              <div>
                <div className="font-semibold text-orange-400">{stats.overdue_tasks}</div>
                <div className="text-slate-400">Scaduti</div>
              </div>
            )}
          </div>
        )}

        {/* Reasons */}
        {health_reasons && health_reasons.length > 0 && (
          <div className="border-t-2 border-cyan-500/20 pt-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <ul className="space-y-1 text-xs text-slate-400">
                {health_reasons.slice(0, 3).map((reason, idx) => (
                  <li key={idx}>• {reason}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProjectHealthCard;
