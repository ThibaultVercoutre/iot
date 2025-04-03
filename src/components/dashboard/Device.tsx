"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddSensorDialog } from "@/components/AddSensorDialog"
import { Sensor } from "@/components/dashboard/Sensor"
import { 
  Device as DeviceType, 
  SensorWithData, 
  User
} from "@/types/sensors"
import { updateSensorThreshold, deleteSensor, getDeviceSensors } from "@/services/sensorService"

interface DeviceProps {
  device: DeviceType
  viewMode: 'grid' | 'list'
  selectedPeriod: '1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month'
  user: User | null
  onDeviceChange: (updatedDevice: DeviceType) => void
}

export function Device({ device, viewMode, selectedPeriod, user, onDeviceChange }: DeviceProps) {
  const handleThresholdChange = async (sensorId: number, value: string) => {
    try {
      const numValue = parseFloat(value)
      if (isNaN(numValue)) {
        console.error('Valeur de seuil invalide')
        return
      }
      
      await updateSensorThreshold(sensorId, numValue)
      
      // Rafraîchir les données
      const sensors = await getDeviceSensors(device.id, selectedPeriod)
      const updatedDevice = {
        ...device,
        sensors
      }
      
      onDeviceChange(updatedDevice)
    } catch (error) {
      console.error('Erreur lors de la mise à jour du seuil:', error)
    }
  }

  const handleDeleteSensor = async (sensor: SensorWithData) => {
    try {
      await deleteSensor(sensor.id)

      // Rafraîchir les données
      const sensors = await getDeviceSensors(device.id, selectedPeriod)
      const updatedDevice = {
        ...device,
        sensors
      }
      
      onDeviceChange(updatedDevice)
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const handleSensorAdded = async () => {
    try {
      // Rafraîchir les données
      const sensors = await getDeviceSensors(device.id, selectedPeriod)
      const updatedDevice = {
        ...device,
        sensors
      }
      
      onDeviceChange(updatedDevice)
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error)
    }
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle className="text-xl mb-4">{device.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
          {device.sensors.map((sensor: SensorWithData) => (
            <Sensor
              key={sensor.id}
              sensor={sensor}
              viewMode={viewMode}
              selectedPeriod={selectedPeriod}
              user={user}
              onThresholdChange={handleThresholdChange}
              onDeleteSensor={handleDeleteSensor}
            />
          ))}
          <AddSensorDialog 
            deviceId={device.id}
            onSensorAdded={handleSensorAdded}
          />
        </div>
      </CardContent>
    </Card>
  )
} 