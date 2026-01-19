import { Calendar, TrendingUp } from 'lucide-react';
import { Card } from '../ui';

const TimelineView = ({ projects, onProjectClick }) => {
  if (!projects || projects.length === 0) {
    return (
      <Card className="py-8 text-center text-slate-400">
        <p>Nessun progetto con timeline disponibile</p>
      </Card>
    );
  }

  // Get date range
  const allDates = projects
    .flatMap((p) => [
      p.start_date ? new Date(p.start_date) : null,
      p.end_date ? new Date(p.end_date) : null,
    ])
    .filter(Boolean);

  if (allDates.length === 0) {
    return (
      <Card className="py-8 text-center text-slate-400">
        <p>Nessuna data disponibile per i progetti</p>
      </Card>
    );
  }

  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  const today = new Date();

  // Calculate total days span
  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

  // Helper to calculate position percentage
  const getPositionPercent = (date) => {
    if (!date) return 0;
    const d = new Date(date);
    const daysSinceStart = Math.ceil((d - minDate) / (1000 * 60 * 60 * 24));
    return (daysSinceStart / totalDays) * 100;
  };

  // Today position
  const todayPosition = getPositionPercent(today);

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
  };

  return (
    <Card>
      <div className="space-y-6">
        {/* Timeline Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-cyan-300">Roadmap Progetti</h3>
          </div>
          <div className="text-sm text-slate-400">
            {formatDate(minDate)} - {formatDate(maxDate)}
          </div>
        </div>

        {/* Timeline Container */}
        <div className="relative">
          {/* Today marker */}
          {todayPosition >= 0 && todayPosition <= 100 && (
            <div
              className="absolute bottom-0 top-0 z-10 w-0.5 bg-cyan-400"
              style={{ left: `${todayPosition}%` }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 transform whitespace-nowrap text-xs font-semibold text-cyan-300">
                Oggi
              </div>
            </div>
          )}

          {/* Projects */}
          <div className="space-y-3">
            {projects.map((project) => {
              const startPos = getPositionPercent(project.start_date);
              const endPos = getPositionPercent(project.end_date);
              const width = Math.max(endPos - startPos, 5); // Minimum 5%

              const completionPercent =
                project.total_tasks > 0
                  ? Math.round((project.completed_tasks / project.total_tasks) * 100)
                  : 0;

              // Determine color based on completion
              const isComplete = completionPercent === 100;
              const isOnTrack = completionPercent >= 70;
              const color = isComplete
                ? 'bg-green-500'
                : isOnTrack
                  ? 'bg-cyan-500'
                  : 'bg-orange-500';

              return (
                <div key={project.id} className="relative">
                  {/* Project name */}
                  <div className="mb-1 truncate text-sm font-medium text-slate-200">
                    {project.name}
                  </div>

                  {/* Timeline bar background */}
                  <div className="relative h-8 overflow-hidden rounded-lg border border-cyan-500/20 bg-slate-700/50">
                    {/* Project bar */}
                    <div
                      className={`absolute h-full ${color} cursor-pointer rounded-lg border border-white border-opacity-50 bg-opacity-80 transition-all hover:bg-opacity-100`}
                      style={{
                        left: `${startPos}%`,
                        width: `${width}%`,
                      }}
                      onClick={() => onProjectClick && onProjectClick(project)}
                    >
                      {/* Completion progress overlay */}
                      <div
                        className="h-full bg-white bg-opacity-30"
                        style={{ width: `${completionPercent}%` }}
                      />

                      {/* Label inside bar (if wide enough) */}
                      {width > 15 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold text-white">
                            {completionPercent}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>{formatDate(project.start_date)}</span>
                    <span className="font-medium text-slate-300">
                      {project.completed_tasks}/{project.total_tasks} task
                    </span>
                    <span>{formatDate(project.end_date)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 border-t-2 border-cyan-500/20 pt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-green-500"></div>
            <span className="text-slate-400">Completato</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-cyan-500"></div>
            <span className="text-slate-400">On Track (≥70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-orange-500"></div>
            <span className="text-slate-400">A Rischio (&lt;70%)</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TimelineView;
