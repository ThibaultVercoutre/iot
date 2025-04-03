"use client"

import { AlertCircle } from "lucide-react"
import { SensorType, Sensor } from '@prisma/client'

interface SensorData {
  id: number
  value: number
  timestamp: string
  sensorId: number
}

interface SensorWithData extends Sensor {
  historicalData: SensorData[]
  threshold?: {
    id: number
    value: number
    sensorId: number
  }
  isBinary: boolean
  alertLogs: {
    id: number
    startDataId: number
    createdAt: string
    startData: SensorData
  }[]
}

interface ActiveAlertsProps {
  sensorsInAlert: SensorWithData[]
}

// Fonction pour formater la valeur selon le type
const formatValue = (sensor: SensorWithData, value: number) => {
  if (sensor.isBinary) {
    return value === 1 ? 'ON' : 'OFF'
  } else {
    switch (sensor.type) {
      case SensorType.SOUND:
        return `${value} dB`
      default:
        return value.toString()
    }
  }
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

export function ActiveAlerts({ sensorsInAlert }: ActiveAlertsProps) {
  if (sensorsInAlert.length === 0) return null

  return (
    <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-800 border border-red-200">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span className="font-medium">
          Alerte ! {sensorsInAlert.length} capteur(s) en état d&apos;alerte
        </span>
      </div>
      <ul className="mt-2 pl-6 list-disc">
        {sensorsInAlert.map(sensor => (
          <li key={sensor.id}>
            {`${sensor.name} - Valeur actuelle: ${formatValue(sensor, sensor.historicalData[0]?.value || 0)}`}
            {!sensor.isBinary && sensor.threshold && ` (Seuil: ${sensor.threshold.value} ${sensor.type === SensorType.SOUND ? 'dB' : ''})`}
            {sensor.isBinary && ' (Détection d\'activité)'}
            {sensor.alertLogs[0] && (
              <span className="text-red-600 ml-2">
                {`(En alerte depuis le ${formatDateTime(sensor.alertLogs[0].startData.timestamp)} - Valeur déclenchement: ${formatValue(sensor, sensor.alertLogs[0].startData.value)})`}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
} 