"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { SensorType, Sensor } from '@prisma/client'

import { AddDeviceDialog } from "@/components/AddDeviceDialog"
import { AlertStatus } from "./AlertStatus"
import { ActiveAlerts } from "./ActiveAlerts"
import { DashboardFilters } from "./DashboardFilters"
import { SensorList } from "./SensorList"

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

interface Device {
  id: number
  name: string
  sensors: SensorWithData[]
}

// Mise à jour de l'interface pour inclure le nouveau champ isBinary
interface SensorWithData extends Sensor {
  historicalData: SensorData[]
  threshold?: Threshold
  isInAlert?: boolean
  isBinary: boolean
  alertLogs: {
    id: number
    startDataId: number
    createdAt: string
    startData: SensorData
  }[]
}

interface User {
  id: number
  alertsEnabled: boolean
}

export default function Dashboard() {
  const router = useRouter()
  const [devices, setDevices] = useState<Device[]>([])
  const [sensorsInAlert, setSensorsInAlert] = useState<SensorWithData[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month'>('day')
  const [selectedType, setSelectedType] = useState<SensorType | 'all'>('all')
  const [alertFilter, setAlertFilter] = useState<'all' | 'alert'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fonction pour sauvegarder les préférences
  const savePreferences = useCallback(async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dashboardPeriod: selectedPeriod,
          dashboardViewMode: viewMode,
          dashboardSensorType: selectedType,
          dashboardAlertFilter: alertFilter
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde des préférences')
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }, [selectedPeriod, viewMode, selectedType, alertFilter])

  // Effet pour charger les préférences au démarrage
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const token = document.cookie
          .split("; ")
          .find(row => row.startsWith("auth-token="))
          ?.split("=")[1]

        if (!token) return

        const response = await fetch('/api/user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Erreur lors du chargement des préférences')
        }

        const userData = await response.json()
        setSelectedPeriod(userData.dashboardPeriod as '1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month')
        setViewMode(userData.dashboardViewMode as 'grid' | 'list')
        setSelectedType(userData.dashboardSensorType as SensorType | 'all')
        setAlertFilter(userData.dashboardAlertFilter as 'all' | 'alert')
        setUser(userData)
      } catch (error) {
        console.error('Erreur:', error)
      }
    }

    loadPreferences()
  }, [])

  // Effet pour sauvegarder les préférences lors des changements
  useEffect(() => {
    if (user) {
      savePreferences()
    }
  }, [selectedPeriod, viewMode, selectedType, alertFilter, savePreferences, user])

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
            console.log('Données des capteurs reçues:', sensorsData)
            
            const deviceSensors = sensorsData.filter((sensor: SensorWithData) => sensor.deviceId === device.id)
            console.log('Capteurs filtrés pour le device:', deviceSensors)

            // Vérifier les capteurs qui ont une alerte active
            const sensorsWithAlertStatus = deviceSensors.map((sensor: SensorWithData) => {
              console.log('Traitement du capteur:', {
                id: sensor.id,
                name: sensor.name,
                type: sensor.type,
                threshold: sensor.threshold
              })
              
              const isInAlert = sensor.alertLogs.length > 0;
              
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
        
        setUser(userData)
        setIsLoading(false)
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error)
        setIsLoading(false)
      }
    }

    // Récupérer les données immédiatement
    fetchData()

    // Mettre en place l'intervalle pour les mises à jour
    const interval = setInterval(fetchData, 1000)

    // Nettoyer l'intervalle lors du démontage du composant
    return () => clearInterval(interval)
  }, [selectedPeriod])

  // Filtrer les capteurs selon les critères
  const filteredDevices = devices.map(device => ({
    ...device,
    sensors: device.sensors.filter(sensor => {
      const typeMatch = selectedType === 'all' || sensor.type === selectedType;
      const alertMatch = alertFilter === 'all' || (alertFilter === 'alert' && sensor.isInAlert);
      return typeMatch && alertMatch;
    })
  }))
  
  //.filter(device => device.sensors.length > 0);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>
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
      
      <div className="grid grid-cols-1 gap-6">
        <SensorList 
          devices={filteredDevices}
          viewMode={viewMode}
          selectedPeriod={selectedPeriod}
          user={user}
          onDevicesChange={setDevices}
        />
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