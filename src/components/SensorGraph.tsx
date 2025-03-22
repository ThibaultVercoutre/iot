import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
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
  value: number;
  timestamp: Date;
}

interface Sensor {
  id: number;
  name: string;
  type: string;
}

interface SensorGraphProps {
  sensor: Sensor;
}

const SensorGraph: React.FC<SensorGraphProps> = ({ sensor }) => {
  const [chartData, setChartData] = useState<SensorData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/sensors/${sensor.id}/data`);
        const data = await response.json();
        setChartData(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
      }
    };

    fetchData();

    // Établir la connexion SSE
    const eventSource = new EventSource('/api/sensors/events');

    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === 'sensor_update' && update.sensorId === sensor.id) {
        // Mettre à jour les données du graphique
        setChartData(prevData => {
          const newData = [...prevData];
          newData.push({
            value: update.value,
            timestamp: new Date(update.timestamp)
          });
          // Garder seulement les 50 dernières valeurs
          return newData.slice(-50);
        });
      }
    };

    eventSource.onerror = (error) => {
      console.error('Erreur SSE:', error);
      eventSource.close();
    };

    // Nettoyer la connexion SSE
    return () => {
      eventSource.close();
    };
  }, [sensor.id]);

  const data = {
    labels: chartData.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: sensor.name,
        data: chartData.map(d => d.value),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: sensor.name
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="w-full h-64">
      <Line data={data} options={options} />
    </div>
  );
};

export default SensorGraph; 