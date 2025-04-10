"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Trash2, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SensorWithData, User, getSensorColor } from "@/types/sensors"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { SensorDatas } from "./SensorDatas"
import { AlertLog } from "@/services/alertService"

interface SensorProps {
  sensor: SensorWithData
  viewMode: 'grid' | 'list'
  selectedPeriod: '1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month'
  user: User | null
  onThresholdChange: (sensorId: number, value: string) => Promise<void>
  onDeleteSensor: (sensor: SensorWithData) => Promise<void>
  timeOffset?: number
  activeAlerts: AlertLog[]
}

export function Sensor({ 
  sensor, 
  viewMode, 
  selectedPeriod, 
  user, 
  onThresholdChange,
  onDeleteSensor,
  timeOffset = 0,
  activeAlerts
}: SensorProps) {
  const [thresholdValue, setThresholdValue] = useState<string>(sensor.threshold?.value?.toString() ?? '')
  const [copiedId, setCopiedId] = useState<boolean>(false)

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    } catch (err) {
      console.error('Erreur lors de la copie:', err)
    }
  }

  const latestData = sensor.lastValue ? sensor.lastValue : null

  return (
    <Card 
      className={`relative ${
        user?.alertsEnabled && activeAlerts.some(alert => alert.sensor.id === sensor.id && alert.isActive)
          ? 'border-2 border-red-500 shadow-lg shadow-red-100' 
          : ''
      }`}
    >
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getSensorColor(sensor.type) }}
            />
            {sensor.name}
            {user?.alertsEnabled && activeAlerts.some(alert => alert.sensor.id === sensor.id && alert.isActive) && (
              <AlertCircle className="w-5 h-5 text-red-500 ml-auto" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-sm">
              <span className="font-mono">{sensor.uniqueId}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0"
                onClick={() => handleCopyId(sensor.uniqueId)}
              >
                {copiedId ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="sr-only">Copier l&apos;ID</span>
              </Button>
            </div>
            <ConfirmDialog
              trigger={
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Supprimer le capteur</span>
                </Button>
              }
              title="Supprimer le capteur"
              description={`Êtes-vous sûr de vouloir supprimer le capteur "${sensor.name}" ? Cette action supprimera également toutes les données et alertes associées.`}
              onConfirm={() => onDeleteSensor(sensor)}
              confirmText="Supprimer"
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {latestData ? (
          <SensorDatas
            sensor={sensor}
            latestData={latestData}
            user={user}
            thresholdValue={thresholdValue}
            setThresholdValue={setThresholdValue}
            onThresholdChange={onThresholdChange}
            viewMode={viewMode}
            selectedPeriod={selectedPeriod}
            timeOffset={timeOffset}
          />
        ) : (
          <div className="text-gray-500">Aucune donnée disponible</div>
        )}
      </CardContent>
    </Card>
  )
} 