import { TrendingDown } from 'lucide-react';
import { Card } from '../ui';

const BurndownChart = ({ projectId, velocityData }) => {
  if (!velocityData || velocityData.length === 0) {
    return (
      <Card className="py-8 text-center text-slate-400">
        <p>Nessun dato disponibile per il burndown chart</p>
      </Card>
    );
  }

  // Calculate chart dimensions and scales
  const chartHeight = 300;
  const chartWidth = 600;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Prepare data
  const weeks = velocityData.map((d) => d.week_label);
  const remainingTasks = velocityData.map((d) => d.remaining_tasks);
  const idealLine = velocityData.map((d, i) => {
    const totalWeeks = velocityData.length;
    const initialTasks = velocityData[0].total_tasks;
    return initialTasks - (initialTasks / totalWeeks) * (i + 1);
  });

  // Find max value for Y scale
  const maxValue = Math.max(...remainingTasks, velocityData[0].total_tasks);
  const yScale = (value) => innerHeight - (value / maxValue) * innerHeight;
  const xScale = (index) => (index / (weeks.length - 1)) * innerWidth;

  // Generate SVG path for actual line
  const actualPath = remainingTasks
    .map((value, index) => {
      const x = xScale(index) + padding.left;
      const y = yScale(value) + padding.top;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Generate SVG path for ideal line
  const idealPath = idealLine
    .map((value, index) => {
      const x = xScale(index) + padding.left;
      const y = yScale(value) + padding.top;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Calculate if we're ahead or behind schedule
  const lastActual = remainingTasks[remainingTasks.length - 1];
  const lastIdeal = idealLine[idealLine.length - 1];
  const isAhead = lastActual < lastIdeal;
  const completionRate = velocityData[velocityData.length - 1].completion_rate;

  return (
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-cyan-300">Burndown Chart</h3>
          </div>
          <div
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              isAhead
                ? 'border-green-500/30 bg-green-500/20 text-green-300'
                : 'border-orange-500/30 bg-orange-500/20 text-orange-300'
            }`}
          >
            {isAhead ? '🎯 In anticipo' : '⚠️ In ritardo'}
          </div>
        </div>

        {/* Chart */}
        <div className="overflow-x-auto">
          <svg width={chartWidth} height={chartHeight} className="mx-auto">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + innerHeight * ratio;
              const value = Math.round(maxValue * (1 - ratio));
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 5}
                    textAnchor="end"
                    fontSize="12"
                    fill="#94a3b8"
                  >
                    {value}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels */}
            {weeks.map((week, index) => {
              const x = xScale(index) + padding.left;
              const y = chartHeight - padding.bottom + 20;
              return (
                <text key={index} x={x} y={y} textAnchor="middle" fontSize="12" fill="#94a3b8">
                  {week}
                </text>
              );
            })}

            {/* Ideal line */}
            <path
              d={idealPath}
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              strokeDasharray="5,5"
            />

            {/* Actual line */}
            <path
              d={actualPath}
              fill="none"
              stroke={isAhead ? '#22c55e' : '#f97316'}
              strokeWidth="3"
            />

            {/* Data points for actual line */}
            {remainingTasks.map((value, index) => {
              const x = xScale(index) + padding.left;
              const y = yScale(value) + padding.top;
              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill={isAhead ? '#22c55e' : '#f97316'}
                    stroke="white"
                    strokeWidth="2"
                  />
                  {/* Tooltip on hover */}
                  <title>
                    {weeks[index]}: {value} task rimanenti
                  </title>
                </g>
              );
            })}

            {/* Data points for ideal line */}
            {idealLine.map((value, index) => {
              const x = xScale(index) + padding.left;
              const y = yScale(value) + padding.top;
              return <circle key={index} cx={x} cy={y} r="3" fill="#64748b" opacity="0.5" />;
            })}

            {/* Axis labels */}
            <text
              x={chartWidth / 2}
              y={chartHeight - 5}
              textAnchor="middle"
              fontSize="14"
              fill="#cbd5e1"
              fontWeight="500"
            >
              Settimane
            </text>
            <text
              x={15}
              y={chartHeight / 2}
              textAnchor="middle"
              fontSize="14"
              fill="#cbd5e1"
              fontWeight="500"
              transform={`rotate(-90, 15, ${chartHeight / 2})`}
            >
              Task Rimanenti
            </text>
          </svg>
        </div>

        {/* Legend and Stats */}
        <div className="flex items-center justify-between border-t-2 border-cyan-500/20 pt-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="h-0.5 w-8 bg-slate-600"
                style={{ borderTop: '2px dashed #64748b' }}
              ></div>
              <span className="text-slate-400">Ideale</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-1 w-8 ${isAhead ? 'bg-green-500' : 'bg-orange-500'}`}></div>
              <span className="text-slate-400">Effettivo</span>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            <span className="font-medium">Completamento: </span>
            <span
              className={
                completionRate >= 70
                  ? 'text-green-400'
                  : completionRate >= 50
                    ? 'text-orange-400'
                    : 'text-red-400'
              }
            >
              {completionRate}%
            </span>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-3 gap-4 border-t-2 border-cyan-500/20 pt-4 text-center">
          <div>
            <div className="text-2xl font-bold text-slate-100">
              {velocityData[velocityData.length - 1].remaining_tasks}
            </div>
            <div className="text-sm text-slate-400">Task rimanenti</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">
              {velocityData[velocityData.length - 1].completed_count}
            </div>
            <div className="text-sm text-slate-400">Completati</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">
              {velocityData[velocityData.length - 1].avg_per_week.toFixed(1)}
            </div>
            <div className="text-sm text-slate-400">Task/settimana</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default BurndownChart;
