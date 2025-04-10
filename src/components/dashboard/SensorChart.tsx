'use client';
 
import { Line } from 'react-chartjs-2';

import {
  Chart as ChartJS,
  LinearScale,
   PointElement,
   LineElement,
   CategoryScale,
   Title,
   Tooltip,
   Legend,
   TooltipItem,
   Scale,
   CoreScaleOptions,
 } from 'chart.js';
 import annotationPlugin from 'chartjs-plugin-annotation';


 ChartJS.register(
  LinearScale,
   PointElement,
   LineElement,
   CategoryScale,
   Title,
   Tooltip,
   Legend,
   annotationPlugin
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
  timeRange?: number;
  threshold?: number;
  isBinary?: boolean;
  timeOffset?: number;
}

export default function SensorChart({ data, label, color, timeRange = 24, threshold, isBinary = false, timeOffset = 0 }: SensorChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center text-gray-500">
        Aucune donnée disponible
      </div>
    );
  }

  // Calculer le moment de référence en fonction du décalage temporel
  const currentTime = new Date();
  const referenceTime = new Date(currentTime);
  
  if (timeOffset !== 0) {
    // Appliquer le décalage temporel directement (positif ou négatif)
    referenceTime.setHours(referenceTime.getHours() + timeOffset);
  }
  
  // Calculer l'heure la plus récente pour l'origine
  const latestTime = new Date(Math.max(...data.map(d => new Date(d.timestamp).getTime())));
  const oldestAllowedTime = new Date(referenceTime.getTime() - (timeRange * 60 * 60 * 1000));

  // Récupérer la date la plus ancienne
  const oldestTime = new Date(Math.min(...data.map(d => new Date(d.timestamp).getTime())));
  
  // Calculer xMin et xMax en arrondissant à l'heure la plus proche
  // Mais maintenant par rapport à la référence temporelle et non au temps présent
  const xMin = Math.floor((oldestTime.getTime() - referenceTime.getTime()) / (1000 * 60 * 60));
  // Cette variable n'est plus utilisée depuis l'introduction de displayMin/displayMax
  
  // const xMax = Math.round((latestTime.getTime() - referenceTime.getTime()) / (1000 * 60 * 60));

  // Filtrer et trier les données dans la plage temporelle
  const sortedData = [...data]
    .filter(d => new Date(d.timestamp) >= oldestAllowedTime)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const chartData = {
      datasets: [{
        label,
        data: sortedData.map(d => ({
          x: (new Date(d.timestamp).getTime() - referenceTime.getTime()) / (1000 * 60 * 60),
          y: d.value
        })),
        backgroundColor: color,
        borderColor: color,
        pointStyle: isBinary ? 'none' as const : 'circle' as const,
        pointRadius: isBinary ? 0 : 2,
        pointHoverRadius: isBinary ? 0 : 5,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: color,
        borderWidth: 2,
        tension: isBinary ? 0 : 0.4,
        stepped: isBinary ? 'before' as const : undefined,
        fill: false
      }]
    };

    // Calculer les limites d'affichage en fonction du timeRange et du timeOffset
    const displayMin = xMin < -timeRange ? xMin : -timeRange;
    const displayMax = 0; // Fin du graphique alignée avec la référence temporelle

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index' as const
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: false,
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => {
              const date = new Date(referenceTime.getTime() + items[0].parsed.x * 1000 * 60 * 60);
              return date.toLocaleString();
            },
            label: (item: TooltipItem<'line'>) => {
              const lines = [
                `${label} : ${isBinary ? (item.parsed.y === 1 ? 'ON' : 'OFF') : `${item.parsed.y} ${label.includes('son') ? 'dB' : ''}`}`,
              ];
              if (threshold) {
                lines.push(`Seuil : ${threshold} ${label.includes('son') ? 'dB' : ''}`);
              }
              return lines;
            }
          },
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          titleColor: '#000',
          bodyColor: '#000',
          borderColor: color,
          borderWidth: 1,
          padding: 10,
          displayColors: false
        },
        annotation: threshold ? {
          annotations: {
            line1: {
              type: 'line' as const,
              yMin: threshold,
              yMax: threshold,
              borderColor: color,
              borderWidth: 2,
              borderDash: [5, 5]
            }
          }
        } : undefined
      },
      scales: {
        x: {
          type: 'linear' as const,
          position: 'bottom' as const,
          min: displayMin,
          max: displayMax,
          ticks: {
            stepSize: timeRange <= 24 ? 1 : Math.ceil(timeRange / 12),
            callback: function(tickValue: string | number) {
              const value = Math.round(Number(tickValue));
              const tickDate = new Date(referenceTime.getTime() + value * 1000 * 60 * 60);
              
              // Format différent en fonction du timeOffset
              if (timeOffset === 0 && value === 0) {
                return 'maintenant';
              } else if (timeRange >= 24) {
                // Pour les périodes de jour ou plus, afficher jour et heure
                return `${tickDate.getDate()}/${tickDate.getMonth() + 1} ${tickDate.getHours()}h`;
              } else {
                // Pour les périodes en heures, afficher l'heure
                return `${tickDate.getHours()}h${tickDate.getMinutes() > 0 ? tickDate.getMinutes() : ''}`;
              }
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          }
        },
        y: {
          type: 'linear' as const,
          display: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
          min: isBinary ? -0.1 : (() => {
            const minValue = Math.min(...sortedData.map(d => d.value));
            const range = Math.max(...sortedData.map(d => d.value)) - minValue;
            return Math.max(0, minValue - range * 0.1);
          })(),
          max: isBinary ? 1.1 : (() => {
            const maxValue = Math.max(...sortedData.map(d => d.value));
            const range = maxValue - Math.min(...sortedData.map(d => d.value));
            return maxValue + range * 0.1;
          })(),
          ticks: {
            stepSize: isBinary ? 1 : (() => {
              const range = Math.max(...sortedData.map(d => d.value)) - Math.min(...sortedData.map(d => d.value));
              return Math.ceil(range / 10);
            })(),
            callback: function(this: Scale<CoreScaleOptions>, tickValue: number | string) {
              const value = Number(tickValue);
              if (isBinary) {
                return value === 1 ? 'ON' : value === 0 ? 'OFF' : '';
              }
              return tickValue;
            }
          }
        },
      },
    };

   return (
    <div className="h-[200px]">
          <Line data={chartData} options={options} />
     </div>
   );
}