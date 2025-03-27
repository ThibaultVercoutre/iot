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

  // Créer un tableau de timestamps réguliers
  const timestamps = sortedData.map(d => new Date(d.timestamp).getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const timeStep = (maxTime - minTime) / (sortedData.length - 1);
  
  // Créer un tableau de timestamps réguliers
  const regularTimestamps = Array.from(
    { length: sortedData.length },
    (_, i) => minTime + i * timeStep
  );

  // Associer les valeurs aux timestamps réguliers
  const normalizedData = regularTimestamps.map(timestamp => {
    const closestData = sortedData.find(d => 
      Math.abs(new Date(d.timestamp).getTime() - timestamp) < timeStep / 2
    );
    return closestData ? closestData.value : null;
  });

  const chartData = {
    labels: regularTimestamps.map(t => {
      const date = new Date(t);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }),
    datasets: [
      {
        label,
        data: normalizedData,
        borderColor: color,
        backgroundColor: color,
        tension: 0.1,
        spanGaps: true, // Permet de tracer des lignes entre les points même avec des valeurs nulles
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
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
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