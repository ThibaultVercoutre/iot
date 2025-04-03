import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface SensorChartProps {
  data: any[]
  label: string
  color: string
  timeRange: number
  threshold?: number
  isBinary: boolean
}

export function SensorChart({
  data,
  label,
  color,
  timeRange,
  threshold,
  isBinary
}: SensorChartProps) {
  const chartData = {
    labels: data.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label,
        data: data.map(d => d.value),
        borderColor: color,
        backgroundColor: color,
        tension: 0.1,
      },
      ...(threshold ? [{
        label: 'Seuil',
        data: Array(data.length).fill(threshold),
        borderColor: '#FF0000',
        borderDash: [5, 5],
        borderWidth: 1,
      }] : [])
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ...(isBinary ? {
          min: 0,
          max: 1,
          ticks: {
            stepSize: 1,
            callback: (value: string | number) => {
              if (typeof value === 'number') {
                return value === 1 ? 'ON' : 'OFF'
              }
              return value
            }
          }
        } : {})
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  }

  return (
    <div className="h-full w-full">
      <Line data={chartData} options={options} />
    </div>
  )
} 