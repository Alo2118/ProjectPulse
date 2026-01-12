import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const WorkloadChart = ({ workloadData, title = "Carico di Lavoro per Dipendente" }) => {
  // workloadData should be an array of { name, todo, in_progress, completed }
  const data = {
    labels: workloadData.map(item => item.name),
    datasets: [
      {
        label: 'Da fare',
        data: workloadData.map(item => item.todo || 0),
        backgroundColor: '#9CA3AF',
        borderColor: '#6B7280',
        borderWidth: 1
      },
      {
        label: 'In corso',
        data: workloadData.map(item => item.in_progress || 0),
        backgroundColor: '#3B82F6',
        borderColor: '#2563EB',
        borderWidth: 1
      },
      {
        label: 'Completato',
        data: workloadData.map(item => item.completed || 0),
        backgroundColor: '#10B981',
        borderColor: '#059669',
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        callbacks: {
          footer: function(tooltipItems) {
            let total = 0;
            tooltipItems.forEach(function(tooltipItem) {
              total += tooltipItem.parsed.y;
            });
            return 'Totale: ' + total;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: false,
        grid: {
          display: false
        }
      },
      y: {
        stacked: false,
        beginAtZero: true,
        ticks: {
          precision: 0
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        {title}
      </h3>
      <div className="h-[300px]">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default WorkloadChart;
