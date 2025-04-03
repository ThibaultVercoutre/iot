"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { SensorType, Sensor } from '@prisma/client'

import { AddDeviceDialog } from "@/components/AddDeviceDialog"
import { AlertStatus } from "./AlertStatus"
import { ActiveAlerts } from "./ActiveAlerts"
import { DashboardFilters } from "./DashboardFilters"
import { Device } from "./Device"

// Types pour les données des capteurs
interface SensorData {
  id: number
  value: number
  timestamp: string
  sensorId: number
}

interface Threshold {
  id: number
  value: number
  sensorId: number
}

interface SensorWithData extends Sensor {
  historicalData: SensorData[]
  threshold?: Threshold
  isBinary: boolean
  isInAlert?: boolean
  alertLogs: {
    id: number
    startDataId: number
    createdAt: string
    startData: SensorData
  }[]
}

interface Device {
  id: number
  name: string
  sensors: SensorWithData[]
}

interface User {
  id: number
  alertsEnabled: boolean
}

export default function Dashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [devices, setDevices] = useState<Device[]>([])
  const [sensorsInAlert, setSensorsInAlert] = useState<SensorWithData[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month'>('day')
  const [selectedType, setSelectedType] = useState<SensorType | 'all'>('all')
  const [alertFilter, setAlertFilter] = useState<'all' | 'alert'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Restaurer les filtres depuis le localStorage
  useEffect(() => {
    const savedPeriod = localStorage.getItem('dashboardPeriod')
    const savedType = localStorage.getItem('dashboardType')
    const savedAlertFilter = localStorage.getItem('dashboardAlertFilter')
    const savedViewMode = localStorage.getItem('dashboardViewMode')

    if (savedPeriod) setSelectedPeriod(savedPeriod as any)
    if (savedType) setSelectedType(savedType as any)
    if (savedAlertFilter) setAlertFilter(savedAlertFilter as any)
    if (savedViewMode) setViewMode(savedViewMode as any)
  }, [])

  // Sauvegarder les filtres dans le localStorage
  useEffect(() => {
    localStorage.setItem('dashboardPeriod', selectedPeriod)
    localStorage.setItem('dashboardType', selectedType)
    localStorage.setItem('dashboardAlertFilter', alertFilter)
    localStorage.setItem('dashboardViewMode', viewMode)
  }, [selectedPeriod, selectedType, alertFilter, viewMode])

  // Filtrer les devices en fonction des filtres sélectionnés
  const filteredDevices = devices.filter(device => {
    // Filtrer par type de capteur
    if (selectedType !== 'all') {
      const hasMatchingSensor = device.sensors.some(sensor => sensor.type === selectedType)
      if (!hasMatchingSensor) return false
    }
    
    // Filtrer par état d'alerte
    if (alertFilter === 'alert') {
      const hasAlertSensor = device.sensors.some(sensor => sensor.isInAlert)
      if (!hasAlertSensor) return false
    }
    
    return true
  })

  // Fonction pour mettre à jour un device spécifique
  const handleDeviceChange = useCallback((updatedDevice: Device) => {
    setDevices(prevDevices => 
      prevDevices.map(device => 
        device.id === updatedDevice.id ? updatedDevice : device
      )
    )
    
    // Mettre à jour les capteurs en alerte
    const allSensors = devices.flatMap(device => 
      device.id === updatedDevice.id 
        ? updatedDevice.sensors 
        : device.sensors
    )
    const alertSensors = allSensors.filter(sensor => sensor.isInAlert)
    setSensorsInAlert(alertSensors)
  }, [devices])

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = document.cookie
          .split("; ")
          .find(row => row.startsWith("auth-token="))
          ?.split("=")[1]

        if (!token) {
          throw new Error("Pas de token")
        }

        const response = await fetch("/api/auth/verify", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error("Token invalide")
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Erreur lors de la vérification de l'authentification :", error)
        router.push("/")
      }
    }

    verifyAuth()
  }, [router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = document.cookie
          .split("; ")
          .find(row => row.startsWith("auth-token="))
          ?.split("=")[1]

        if (!token) return

        const [devicesResponse, userResponse] = await Promise.all([
          fetch(`/api/devices`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          }),
          fetch('/api/user', {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          })
        ])

        if (!devicesResponse.ok) throw new Error('Erreur lors de la récupération des devices')
        if (!userResponse.ok) throw new Error('Erreur lors de la récupération des données utilisateur')

        const [devicesData, userData] = await Promise.all([
          devicesResponse.json(),
          userResponse.json()
        ])
        
        setUser(userData)
        
        // Récupérer les capteurs pour chaque device
        const devicesWithSensors = await Promise.all(
          devicesData.map(async (device: { id: number, name: string }) => {
            const sensorsResponse = await fetch(`/api/sensors?period=${selectedPeriod}`, {
              headers: {
                "Authorization": `Bearer ${token}`
              }
            })

            if (!sensorsResponse.ok) throw new Error('Erreur lors de la récupération des capteurs')

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

            return {
              ...device,
              sensors: sensorsWithAlertStatus
            }
          })
        )

        setDevices(devicesWithSensors)
        
        // Filtrer les capteurs en alerte
        const alertSensors = devicesWithSensors.flatMap(device => 
          device.sensors.filter((s: SensorWithData) => s.isInAlert)
        )
        setSensorsInAlert(alertSensors)
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error)
      }
    }

    fetchData()
  }, [selectedPeriod])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      {user && (
        <AlertStatus alertsEnabled={user.alertsEnabled} />
      )}
      
      {user && user.alertsEnabled && sensorsInAlert.length > 0 && (
        <ActiveAlerts sensorsInAlert={sensorsInAlert} />
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord des capteurs</h1>
        
        <DashboardFilters
          selectedPeriod={selectedPeriod}
          selectedType={selectedType}
          alertFilter={alertFilter}
          viewMode={viewMode}
          onPeriodChange={setSelectedPeriod}
          onTypeChange={setSelectedType}
          onAlertFilterChange={setAlertFilter}
          onViewModeChange={setViewMode}
        />
      </div>
      
      <div className="grid gap-6">
        {filteredDevices.map(device => (
          <Device 
            key={device.id}
            device={device}
            viewMode={viewMode}
            selectedPeriod={selectedPeriod}
            user={user}
            onDeviceChange={handleDeviceChange}
          />
        ))}
        
        <AddDeviceDialog onDeviceAdded={() => {
          // Rafraîchir les données après l'ajout d'un device
          const fetchData = async () => {
            try {
              const token = document.cookie
                .split("; ")
                .find(row => row.startsWith("auth-token="))
                ?.split("=")[1]

              if (!token) return

              const devicesResponse = await fetch('/api/devices', {
                headers: {
                  "Authorization": `Bearer ${token}`
                }
              })
              if (devicesResponse.ok) {
                const devicesData = await devicesResponse.json()
                
                // Récupérer les capteurs pour chaque device
                const devicesWithSensors = await Promise.all(
                  devicesData.map(async (device: { id: number, name: string }) => {
                    const sensorsResponse = await fetch(`/api/sensors?period=${selectedPeriod}`, {
                      headers: {
                        "Authorization": `Bearer ${token}`
                      }
                    })

                    if (!sensorsResponse.ok) throw new Error('Erreur lors de la récupération des capteurs')

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

                    return {
                      ...device,
                      sensors: sensorsWithAlertStatus
                    }
                  })
                )

                setDevices(devicesWithSensors)
                
                // Filtrer les capteurs en alerte
                const alertSensors = devicesWithSensors.flatMap(device => 
                  device.sensors.filter((s: SensorWithData) => s.isInAlert)
                )
                setSensorsInAlert(alertSensors)
              }
            } catch (error) {
              console.error('Erreur lors de la récupération des données:', error)
            }
          }
          fetchData()
        }} />
      </div>
    </div>
  )
} 