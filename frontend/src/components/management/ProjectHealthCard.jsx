import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';
import { Card } from '../ui';

const ProjectHealthCard = ({ project, onClick }) => {
  if (!project) return null;

  const {
    name,
    health_score,
    health_status,
    health_color,
    health_reasons,
    stats
  } = project;

  // Determine color classes
  const colorClasses = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      badge: 'bg-green-100 text-green-700',
      ring: 'ring-green-500'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      badge: 'bg-yellow-100 text-yellow-700',
      ring: 'ring-yellow-500'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      badge: 'bg-red-100 text-red-700',
      ring: 'ring-red-500'
    }
  };

  const colors = colorClasses[health_color] || colorClasses.green;

  // Status labels
  const statusLabels = {
    healthy: '🟢 In Linea',
    at_risk: '🟡 A Rischio',
    critical: '🔴 Critico'
  };

  // Calculate completion percentage
  const completionPercent = stats?.total_tasks > 0
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
    : 0;

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
            <h3 className={`text-lg font-semibold ${colors.text}`}>
              {name}
            </h3>
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-1 rounded ${colors.badge}`}>
              {statusLabels[health_status]}
            </span>
          </div>

          {/* Health Score */}
          <div className="text-right">
            <div className={`text-3xl font-bold ${colors.text}`}>
              {health_score}
            </div>
            <div className="text-xs text-gray-600">Health Score</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Completamento</span>
            <span>{completionPercent}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 border-2 border-slate-300">
            <div
              className={`h-2 rounded-full transition-all ${
                health_color === 'green' ? 'bg-green-600' :
                health_color === 'yellow' ? 'bg-yellow-600' :
                'bg-red-600'
              }`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <div className="font-semibold text-gray-900">{stats.total_tasks}</div>
              <div className="text-gray-600">Totali</div>
            </div>
            <div>
              <div className="font-semibold text-green-700">{stats.completed_tasks}</div>
              <div className="text-gray-600">Completati</div>
            </div>
            {stats.blocked_tasks > 0 && (
              <div>
                <div className="font-semibold text-red-700">{stats.blocked_tasks}</div>
                <div className="text-gray-600">Bloccati</div>
              </div>
            )}
            {stats.overdue_tasks > 0 && (
              <div>
                <div className="font-semibold text-orange-700">{stats.overdue_tasks}</div>
                <div className="text-gray-600">Scaduti</div>
              </div>
            )}
          </div>
        )}

        {/* Reasons */}
        {health_reasons && health_reasons.length > 0 && (
          <div className="pt-2 border-t-2 border-slate-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <ul className="text-xs text-gray-700 space-y-1">
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
