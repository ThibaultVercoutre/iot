'use client';
 
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  addHours,
  subHours,
  parseISO,
  getTime,
  format,
  getDate,
  getMonth,
  getHours,
  getMinutes
} from 'date-fns';

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
  // Utiliser useMemo pour optimiser les calculs coûteux qui ne devraient pas être répétés à chaque rendu
  const {
    referenceTime,
    timestampMap,
    sortedData,
    displayMin,
    yMinValue,
    yMaxValue,
    yStepSize,
    hasData
  } = useMemo(() => {
    // Vérifier si on a des données
    if (data.length === 0) {
      return {
        referenceTime: new Date(),
        timestampMap: new Map<string, number>(),
        sortedData: [],
        displayMin: -timeRange,
        yMinValue: 0,
        yMaxValue: 1,
        yStepSize: 1,
        hasData: false
      };
    }
    
    // Convertir les chaînes de timestamp en dates une seule fois
    const timestampMap = new Map<string, number>();
    
    // Prétraiter les données pour éviter les conversions répétées
    data.forEach(item => {
      if (!timestampMap.has(item.timestamp)) {
        timestampMap.set(item.timestamp, getTime(parseISO(item.timestamp)));
      }
    });
    
    // Créer le moment de référence
    const now = new Date();
    const referenceTime = timeOffset !== 0 ? subHours(now, timeOffset) : now;
    const referenceTimestamp = getTime(referenceTime);
    
    // Calculer les temps min et max en une seule passe
    let earliestTimestamp = Infinity;
    let latestTimestamp = 0;
    let minValue = isBinary ? 0 : Infinity;
    let maxValue = isBinary ? 1 : -Infinity;
    
    data.forEach(item => {
      const timestamp = timestampMap.get(item.timestamp)!;
      earliestTimestamp = Math.min(earliestTimestamp, timestamp);
      latestTimestamp = Math.max(latestTimestamp, timestamp);
      
      if (!isBinary) {
        minValue = Math.min(minValue, item.value);
        maxValue = Math.max(maxValue, item.value);
      }
    });
    
    // Calculer la limite de temps pour le filtrage
    const oldestAllowedTime = latestTimestamp - (timeRange * 60 * 60 * 1000);
    
    // Filtrer et trier les données en une seule passe, sans créer d'objets Date supplémentaires
    const sortedData = data
      .filter(d => timestampMap.get(d.timestamp)! >= oldestAllowedTime)
      .sort((a, b) => timestampMap.get(a.timestamp)! - timestampMap.get(b.timestamp)!);
      
    // Calculer la limite d'affichage pour l'axe X
    const xMin = Math.floor((earliestTimestamp - referenceTimestamp) / (1000 * 60 * 60));
    const displayMin = xMin < -timeRange ? xMin : -timeRange;
    
    // Calculer les valeurs min/max et stepSize pour l'axe Y
    let yMinValue = 0;
    let yMaxValue = 1;
    let yStepSize = 1;
    
    if (!isBinary) {
      const valueRange = maxValue - minValue;
      yMinValue = Math.max(0, minValue - valueRange * 0.1);
      yMaxValue = maxValue + valueRange * 0.1;
      yStepSize = Math.ceil(valueRange / 10);
    }
    
    return {
      referenceTime,
      timestampMap,
      sortedData,
      displayMin,
      yMinValue,
      yMaxValue,
      yStepSize,
      hasData: true
    };
  }, [data, timeOffset, timeRange, isBinary]);
  
  // Convertir les données pour le graphique - en utilisant un objet vide si pas de données
  const chartData = useMemo(() => {
    if (!hasData) {
      return { datasets: [] };
    }
    
    return {
      datasets: [{
        label,
        data: sortedData.map(d => ({
          x: (timestampMap.get(d.timestamp)! - getTime(referenceTime)) / (1000 * 60 * 60),
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
  }, [hasData, sortedData, label, isBinary, color, timestampMap, referenceTime]);

  // Options du graphique - en utilisant un objet par défaut si pas de données
  const options = useMemo(() => {
    if (!hasData) {
      return {
        responsive: true,
        maintainAspectRatio: false
      };
    }
    
    return {
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
              const date = addHours(referenceTime, items[0].parsed.x);
              return format(date, 'Pp'); // Format localisé: '19/04/2023 19:40'
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
          max: 0,
          ticks: {
            stepSize: timeRange <= 24 ? 1 : Math.ceil(timeRange / 12),
            callback: function(tickValue: string | number) {
              const value = Math.round(Number(tickValue));
              const tickDate = addHours(referenceTime, value);
              
              // Format différent en fonction du timeOffset
              if (timeOffset === 0 && value === 0) {
                return 'maintenant';
              } else if (timeRange >= 24) {
                // Pour les périodes de jour ou plus, afficher jour et heure
                return `${getDate(tickDate)}/${getMonth(tickDate) + 1} ${getHours(tickDate)}h`;
              } else {
                // Pour les périodes en heures, afficher l'heure
                const minutes = getMinutes(tickDate);
                return `${getHours(tickDate)}h${minutes > 0 ? minutes : ''}`;
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
          min: isBinary ? -0.1 : yMinValue,
          max: isBinary ? 1.1 : yMaxValue,
          ticks: {
            stepSize: yStepSize,
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
  }, [hasData, referenceTime, displayMin, timeRange, timeOffset, isBinary, yMinValue, yMaxValue, yStepSize, color, threshold, label]);

  // Afficher un message si pas de données
  if (!hasData) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center text-gray-500">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <div className="h-[200px]">
      <Line data={chartData} options={options} />
    </div>
  );
}