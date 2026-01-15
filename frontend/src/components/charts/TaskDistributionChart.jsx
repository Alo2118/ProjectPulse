import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const TaskDistributionChart = ({ tasks }) => {
  const statusCounts = {
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    waiting_clarification: tasks.filter(t => t.status === 'waiting_clarification').length,
    completed: tasks.filter(t => t.status === 'completed').length
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
          statusCounts.completed
        ],
        backgroundColor: [
          '#9CA3AF', // gray
          '#3B82F6', // blue
          '#EF4444', // red
          '#F59E0B', // yellow
          '#10B981'  // green
        ],
        borderColor: [
          '#6B7280',
          '#2563EB',
          '#DC2626',
          '#D97706',
          '#059669'
        ],
        borderWidth: 2
      }
    ]
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
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Distribuzione Task per Stato
      </h3>
      <div className="h-[300px]">
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
};

export default TaskDistributionChart;
