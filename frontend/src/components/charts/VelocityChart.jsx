import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const VelocityChart = ({ velocityData, title = "Velocity e Burndown" }) => {
  // velocityData should be an array of { week, tasksCompleted, tasksRemaining, ideal }
  const data = {
    labels: velocityData.map(item => item.week),
    datasets: [
      {
        label: 'Task Rimanenti',
        data: velocityData.map(item => item.tasksRemaining),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2
      },
      {
        label: 'Linea Ideale',
        data: velocityData.map(item => item.ideal),
        borderColor: '#9CA3AF',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        fill: false,
        tension: 0,
        pointRadius: 0,
        borderWidth: 2
      },
      {
        label: 'Task Completati',
        data: velocityData.map(item => item.tasksCompleted),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2
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
          },
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        title: {
          display: true,
          text: 'Numero di Task',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        title: {
          display: true,
          text: 'Settimana',
          font: {
            size: 12,
            weight: 'bold'
          }
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
        <Line data={data} options={options} />
      </div>

      {/* Legend Info */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {velocityData[velocityData.length - 1]?.tasksCompleted || 0}
          </div>
          <div className="text-gray-600">Completati</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {velocityData[velocityData.length - 1]?.tasksRemaining || 0}
          </div>
          <div className="text-gray-600">Rimanenti</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round((velocityData[velocityData.length - 1]?.tasksCompleted || 0) / velocityData.length)}
          </div>
          <div className="text-gray-600">Task/Settimana</div>
        </div>
      </div>
    </div>
  );
};

export default VelocityChart;
