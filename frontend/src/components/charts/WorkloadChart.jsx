import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const WorkloadChart = ({ workloadData, title = 'Carico di Lavoro per Dipendente' }) => {
  // workloadData should be an array of { name, todo, in_progress, completed }
  const data = {
    labels: workloadData.map((item) => item.name),
    datasets: [
      {
        label: 'Da fare',
        data: workloadData.map((item) => item.todo || 0),
        backgroundColor: 'rgba(100, 116, 139, 0.8)',
        borderColor: '#64748b',
        borderWidth: 1,
      },
      {
        label: 'In corso',
        data: workloadData.map((item) => item.in_progress || 0),
        backgroundColor: 'rgba(6, 182, 212, 0.8)',
        borderColor: '#06b6d4',
        borderWidth: 1,
      },
      {
        label: 'Completato',
        data: workloadData.map((item) => item.completed || 0),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: '#22c55e',
        borderWidth: 1,
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
        borderColor: 'rgba(6, 182, 212, 0.5)',
        borderWidth: 1,
        titleColor: '#06b6d4',
        bodyColor: '#cbd5e1',
        callbacks: {
          footer: function (tooltipItems) {
            let total = 0;
            tooltipItems.forEach(function (tooltipItem) {
              total += tooltipItem.parsed.y;
            });
            return 'Totale: ' + total;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: false,
        ticks: {
          color: '#94a3b8',
        },
        grid: {
          display: false,
          drawBorder: false,
        },
      },
      y: {
        stacked: false,
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
    },
  };

  return (
    <div className="card-lg">
      <h3 className="card-header mb-4">{title}</h3>
      <div className="h-[300px]">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default WorkloadChart;
