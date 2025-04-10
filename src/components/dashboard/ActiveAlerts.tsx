"use client"

import { AlertCircle } from "lucide-react"
import { AlertLog, formatValue, formatDateTime } from "@/services/alertService"

interface ActiveAlertsProps {
  alerts: AlertLog[]
}

export function ActiveAlerts({ alerts }: ActiveAlertsProps) {
  if (alerts.length === 0) return null

  return (
    <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-800 border border-red-200">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span className="font-medium">
          Alerte ! {alerts.length} capteur(s) en état d&apos;alerte
        </span>
      </div>
      <ul className="mt-2 pl-6 list-disc">
        {alerts.map(alert => (
          <li key={alert.id}>
            {`${alert.sensor.name} - Valeur actuelle: ${formatValue(alert.sensor, alert.sensorValue)}`}
            {!alert.sensor.isBinary && alert.sensor.threshold && ` (Seuil: ${alert.sensor.threshold.value} ${alert.sensor.type === 'SOUND' ? 'dB' : ''})`}
            {alert.sensor.isBinary && ' (Détection d\'activité)'}
            <span className="text-red-600 ml-2">
              {`(En alerte depuis le ${formatDateTime(alert.startedAt)})`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
} 