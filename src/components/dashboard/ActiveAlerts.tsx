"use client"

import { AlertCircle } from "lucide-react"
import { SensorWithData, formatValue } from "@/types/sensors"

interface ActiveAlertsProps {
  sensorsInAlert: SensorWithData[]
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
            {!sensor.isBinary && sensor.threshold && ` (Seuil: ${sensor.threshold.value} ${sensor.type === 'SOUND' ? 'dB' : ''})`}
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