'use client';

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
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SensorData {
  id: number;
  value: number;
  timestamp: string;
  sensorId: number;
}

interface SensorChartProps {
  data: SensorData[];
  label: string;
  color: string;
}

export default function SensorChart({ data, label, color }: SensorChartProps) {
  // Trier les données par timestamp et prendre les 50 dernières valeurs
  const sortedData = [...data]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-50);

  const chartData = {
    labels: sortedData.map(d => {
      const date = new Date(d.timestamp);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }),
    datasets: [
      {
        label,
        data: sortedData.map(d => d.value),
        borderColor: color,
        backgroundColor: color,
        showLine: false, // Désactive la ligne entre les points
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            const date = new Date(sortedData[context[0].dataIndex].timestamp);
            return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 10
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  return (
    <div className="w-full h-[200px] overflow-x-auto">
      <div className="min-w-[800px] h-full">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
} 