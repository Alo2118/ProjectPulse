import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const TaskDistributionChart = ({ tasks }) => {
  const statusCounts = {
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
    waiting_clarification: tasks.filter((t) => t.status === 'waiting_clarification').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };

  const data = {
    labels: ['Da fare', 'In corso', 'Bloccato', 'In attesa', 'Completato'],
    datasets: [
      {
        data: [
          statusCounts.todo,
          statusCounts.in_progress,
          statusCounts.blocked,
          statusCounts.waiting_clarification,
          statusCounts.completed,
        ],
        backgroundColor: [
          'rgba(100, 116, 139, 0.8)', // slate
          'rgba(6, 182, 212, 0.8)', // cyan
          'rgba(239, 68, 68, 0.8)', // red
          'rgba(251, 146, 60, 0.8)', // orange
          'rgba(34, 197, 94, 0.8)', // green
        ],
        borderColor: ['#64748b', '#06b6d4', '#ef4444', '#fb923c', '#22c55e'],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
          color: '#cbd5e1',
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        padding: 12,
        borderColor: 'rgba(6, 182, 212, 0.5)',
        borderWidth: 1,
        titleColor: '#06b6d4',
        bodyColor: '#cbd5e1',
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="card-lg">
      <h3 className="card-header mb-4">Distribuzione Task per Stato</h3>
      <div className="h-[300px]">
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
};

export default TaskDistributionChart;
