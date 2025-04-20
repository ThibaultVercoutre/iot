"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddSensorDialog } from "@/components/AddSensorDialog"
import { Sensor } from "@/components/dashboard/Sensor"
import { 
  Device as DeviceType, 
  SensorWithData, 
  User
} from "@/types/sensors"
import { updateSensorThreshold, deleteSensor } from "@/services/sensorService"
import { AlertLog } from "@/services/alertService"
import { TimePeriod } from "@/lib/time-utils"
import { SensorType } from "@prisma/client"
import { Skeleton } from "@/components/ui/skeleton"

interface DeviceProps {
  device: DeviceType
  type: SensorType | 'all'
  viewMode: 'grid' | 'list'
  selectedPeriod: TimePeriod
  user: User | null
  onDeviceChange: (updatedDevice: DeviceType) => void
  timeOffset?: number
  activeAlerts: AlertLog[]
}

export function Device({ device, type, viewMode, selectedPeriod, user, onDeviceChange, timeOffset = 0, activeAlerts }: DeviceProps) {
  // Vérifier si c'est un appareil en mode chargement
  const isLoading = device.id === -1;

  const handleThresholdChange = async (sensorId: number, value: string) => {
    try {
      const numValue = parseFloat(value)
      if (isNaN(numValue)) {
        console.error('Valeur de seuil invalide')
        return
      }
      
      await updateSensorThreshold(sensorId, numValue)
      
      // Mise à jour locale du seuil sans appel API supplémentaire
      const updatedSensors = device.sensors.map(sensor => {
        if (sensor.id === sensorId) {
          return {
            ...sensor,
            threshold: sensor.threshold 
              ? { ...sensor.threshold, value: numValue }
              : { id: 0, sensorId, value: numValue }
          }
        }
        return sensor
      })
      
      const updatedDevice = {
        ...device,
        sensors: updatedSensors
      }
      
      onDeviceChange(updatedDevice)
    } catch (error) {
      console.error('Erreur lors de la mise à jour du seuil:', error)
    }
  }

  const handleDeleteSensor = async (sensor: SensorWithData) => {
    try {
      await deleteSensor(sensor.id)
      
      // Suppression locale du capteur sans appel API supplémentaire
      const updatedSensors = device.sensors.filter(s => s.id !== sensor.id)
      
      const updatedDevice = {
        ...device,
        sensors: updatedSensors
      }
      
      onDeviceChange(updatedDevice)
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const handleSensorAdded = async () => {
    // Lors de l'ajout d'un capteur, un rafraîchissement complet est nécessaire
    // car les données sont gérées par le composant parent (dashboard)
    // Les EventSource (SSE) dans dashboard.tsx vont s'occuper de la mise à jour
    try {
      onDeviceChange(device)
    } catch (error) {
      console.error('Erreur lors de la mise à jour après ajout de capteur:', error)
    }
  }

  return (
    <Card className={`p-6 ${isLoading ? 'animate-pulse bg-gray-50' : ''}`}>
      <CardHeader>
        <CardTitle className="text-xl mb-4">
          {isLoading ? (
            <Skeleton className="h-6 w-48 flex-1" />
          ) : (
            device.name
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            device.sensors
              .filter(sensor => type === 'all' || sensor.type === type)
              .map((sensor: SensorWithData) => (
                <Sensor
                  key={sensor.id}
                  sensor={sensor}
                  viewMode={viewMode}
                  selectedPeriod={selectedPeriod}
                  user={user}
                  onThresholdChange={handleThresholdChange}
                  onDeleteSensor={handleDeleteSensor}
                  timeOffset={timeOffset}
                  activeAlerts={activeAlerts}
                />
              ))
          )}
          {!isLoading && (
            <AddSensorDialog 
              deviceId={device.id}
              onSensorAdded={handleSensorAdded}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
} 