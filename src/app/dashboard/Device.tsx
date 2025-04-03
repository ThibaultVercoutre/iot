"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddSensorDialog } from "@/components/AddSensorDialog"
import { Sensor } from "@/app/dashboard/Sensor"
import { 
  Device as DeviceType, 
  SensorWithData, 
  User
} from "@/types/sensors"

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
      
      const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      const response = await fetch(`/api/sensors/${sensorId}/threshold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ value: numValue }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Erreur lors de la mise à jour du seuil')
      }

      // Rafraîchir les données
      const sensorsResponse = await fetch(`/api/sensors?period=${selectedPeriod}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (sensorsResponse.ok) {
        const sensorsData = await sensorsResponse.json()
        const deviceSensors = sensorsData.filter((sensor: SensorWithData) => sensor.deviceId === device.id)

        // Vérifier les capteurs qui ont une alerte active
        const sensorsWithAlertStatus = deviceSensors.map((sensor: SensorWithData) => {
          const latestData = sensor.historicalData[0];
          let isInAlert = false;

          if (latestData) {
            if (sensor.isBinary) {
              // Pour les capteurs binaires, en alerte si valeur = 1
              isInAlert = latestData.value === 1;
            } else if (sensor.threshold) {
              // Pour les capteurs numériques, en alerte si au-dessus du seuil
              isInAlert = latestData.value >= sensor.threshold.value;
            }
          }

          return {
            ...sensor,
            isInAlert
          };
        });

        const updatedDevice = {
          ...device,
          sensors: sensorsWithAlertStatus
        }
        
        onDeviceChange(updatedDevice)
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du seuil:', error)
    }
  }

  const handleDeleteSensor = async (sensor: SensorWithData) => {
    try {
      const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      const response = await fetch(`/api/sensors/${sensor.id}`, {
        method: 'DELETE',
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du capteur');
      }

      // Rafraîchir les données
      const sensorsResponse = await fetch(`/api/sensors?period=${selectedPeriod}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (sensorsResponse.ok) {
        const sensorsData = await sensorsResponse.json()
        const deviceSensors = sensorsData.filter((s: SensorWithData) => s.deviceId === device.id)

        // Vérifier les capteurs qui ont une alerte active
        const sensorsWithAlertStatus = deviceSensors.map((sensor: SensorWithData) => {
          const latestData = sensor.historicalData[0];
          let isInAlert = false;

          if (latestData) {
            if (sensor.isBinary) {
              // Pour les capteurs binaires, en alerte si valeur = 1
              isInAlert = latestData.value === 1;
            } else if (sensor.threshold) {
              // Pour les capteurs numériques, en alerte si au-dessus du seuil
              isInAlert = latestData.value >= sensor.threshold.value;
            }
          }

          return {
            ...sensor,
            isInAlert
          };
        });

        const updatedDevice = {
          ...device,
          sensors: sensorsWithAlertStatus
        }
        
        onDeviceChange(updatedDevice)
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleSensorAdded = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      const sensorsResponse = await fetch(`/api/sensors?period=${selectedPeriod}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (sensorsResponse.ok) {
        const sensorsData = await sensorsResponse.json()
        const deviceSensors = sensorsData.filter((sensor: SensorWithData) => sensor.deviceId === device.id)

        // Vérifier les capteurs qui ont une alerte active
        const sensorsWithAlertStatus = deviceSensors.map((sensor: SensorWithData) => {
          const latestData = sensor.historicalData[0];
          let isInAlert = false;

          if (latestData) {
            if (sensor.isBinary) {
              // Pour les capteurs binaires, en alerte si valeur = 1
              isInAlert = latestData.value === 1;
            } else if (sensor.threshold) {
              // Pour les capteurs numériques, en alerte si au-dessus du seuil
              isInAlert = latestData.value >= sensor.threshold.value;
            }
          }

          return {
            ...sensor,
            isInAlert
          };
        });

        const updatedDevice = {
          ...device,
          sensors: sensorsWithAlertStatus
        }
        
        onDeviceChange(updatedDevice)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error)
    }
  };

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle className="text-xl mb-4">{device.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
          {device.sensors.map((sensor) => (
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