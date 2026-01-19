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
  Filler,
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

const ProgressChart = ({ progressData, title = 'Progresso Task' }) => {
  // progressData should be an array of { date, completed, total }
  const data = {
    labels: progressData.map((item) => item.date),
    datasets: [
      {
        label: 'Task Completati',
        data: progressData.map((item) => item.completed),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#22c55e',
        pointBorderColor: '#16a34a',
      },
      {
        label: 'Task Totali',
        data: progressData.map((item) => item.total),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#0891b2',
      },
    ],
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
            size: 12,
          },
          color: '#cbd5e1',
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        borderColor: 'rgba(6, 182, 212, 0.5)',
        borderWidth: 1,
        titleColor: '#06b6d4',
        bodyColor: '#cbd5e1',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: '#94a3b8',
        },
        grid: {
          color: 'rgba(6, 182, 212, 0.1)',
          drawBorder: false,
        },
      },
      x: {
        ticks: {
          color: '#94a3b8',
        },
        grid: {
          display: false,
          drawBorder: false,
        },
      },
    },
  };

  return (
    <div className="card-lg">
      <h3 className="card-header mb-4">{title}</h3>
      <div className="h-[300px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default ProgressChart;
