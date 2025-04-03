"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SensorType, Sensor } from '@prisma/client'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, History, Filter, Clock, Trash2, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AddSensorDialog } from "@/components/AddSensorDialog"
import { AddDeviceDialog } from "@/components/AddDeviceDialog"
import SensorChart from "@/components/SensorChart"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertStatus } from "./AlertStatus"
import { ActiveAlerts } from "./ActiveAlerts"
import { DashboardFilters } from "./DashboardFilters"

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

// Configuration des couleurs par type de capteur
const sensorColors: Record<SensorType, string> = {
  [SensorType.SOUND]: '#FF6B6B',
  [SensorType.VIBRATION]: '#4ECDC4',
  [SensorType.BUTTON]: '#45B7D1',
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

// Fonction pour obtenir la couleur d'un type de capteur
const getSensorColor = (type: SensorType) => {
  return sensorColors[type]
}

export default function Dashboard() {
  const router = useRouter()
  const [devices, setDevices] = useState<Device[]>([])
  const [sensorsInAlert, setSensorsInAlert] = useState<SensorWithData[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [thresholdValues, setThresholdValues] = useState<{ [key: number]: string }>({})
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month'>('day')
  const [selectedType, setSelectedType] = useState<SensorType | 'all'>('all')
  const [alertFilter, setAlertFilter] = useState<'all' | 'alert'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
      console.error('Erreur lors de la mise à jour du seuil:', error)
    }
  }

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  }

  return (
    <div className="container mx-auto p-4">
      {user && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <AlertStatus alertsEnabled={user.alertsEnabled} />
          
          <Link href="/dashboard/alerts" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <History className="mr-2 h-4 w-4" />
              Historique des alertes
            </Button>
          </Link>
        </div>
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
        {filteredDevices.map((device) => (
          <Card key={device.id} className="p-6">
            <CardHeader>
              <CardTitle className="text-xl mb-4">{device.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                {device.sensors.map((sensor) => {
                  const latestData = sensor.historicalData && sensor.historicalData.length > 0 ? sensor.historicalData[0] : null;
                  
                  return (
                    <Card 
                      key={sensor.id} 
                      className={`relative ${
                        user?.alertsEnabled && sensor.isInAlert 
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
                            {user?.alertsEnabled && sensor.isInAlert && (
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
                                {copiedId === sensor.uniqueId ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                                <span className="sr-only">Copier l&apos;ID</span>
                              </Button>
                            </div>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Supprimer le capteur</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Supprimer le capteur</DialogTitle>
                                  <DialogDescription>
                                    Êtes-vous sûr de vouloir supprimer le capteur &quot;{sensor.name}&quot; ? Cette action supprimera également toutes les données et alertes associées.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button
                                    variant="ghost"
                                    onClick={() => {
                                      const closeDialog = document.querySelector(`[data-state="open"]`)?.querySelector('[aria-label="Close"]') as HTMLButtonElement;
                                      if (closeDialog) closeDialog.click();
                                    }}
                                  >
                                    Annuler
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={async () => {
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

                                        // Fermer le dialogue
                                        const closeDialog = document.querySelector(`[data-state="open"]`)?.querySelector('[aria-label="Close"]') as HTMLButtonElement;
                                        if (closeDialog) closeDialog.click();
                                      } catch (error) {
                                        console.error('Erreur:', error);
                                      }
                                    }}
                                  >
                                    Supprimer
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {latestData ? (
                          <>
                            <div className="flex flex-col gap-4">
                              <div>
                                <div 
                                  className={`text-4xl font-bold mb-2 ${
                                    user?.alertsEnabled && sensor.isInAlert ? 'text-red-500' : ''
                                  }`} 
                                  style={{ color: user?.alertsEnabled && sensor.isInAlert ? undefined : getSensorColor(sensor.type) }}
                                >
                                  {formatValue(sensor, latestData.value)}
                                </div>
                                <div className="text-sm text-gray-500 mb-4">
                                  Dernière mise à jour: {new Date(latestData.timestamp).toLocaleDateString()} {new Date(latestData.timestamp).toLocaleTimeString()}
                                </div>
                                {!sensor.isBinary && (
                                  <div className="flex items-center gap-2 mb-4">
                                    <Label htmlFor={`threshold-${sensor.id}`} className="flex items-center gap-1">
                                      <AlertCircle className="w-4 h-4" />
                                      Seuil
                                    </Label>
                                    <Input
                                      id={`threshold-${sensor.id}`}
                                      type="number"
                                      value={thresholdValues[sensor.id] ?? sensor.threshold?.value ?? ''}
                                      onChange={(e) => {
                                        setThresholdValues(prev => ({ ...prev, [sensor.id]: e.target.value }))
                                      }}
                                      onBlur={(e) => {
                                        if (e.target.value) {
                                          handleThresholdChange(sensor.id, e.target.value)
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.currentTarget.blur()
                                        }
                                      }}
                                      className="w-24"
                                      min="0"
                                      step="0.1"
                                    />
                                  </div>
                                )}
                              </div>
                              <div className={viewMode === 'list' ? 'h-[200px]' : ''}>
                                <SensorChart 
                                  data={sensor.historicalData}
                                  label={sensor.name}
                                  color={sensorColors[sensor.type]}
                                  timeRange={selectedPeriod === 'week' ? 168 : // 7 jours * 24h
                                           selectedPeriod === 'month' ? 720 : // 30 jours * 24h
                                           selectedPeriod === '12h' ? 12 :
                                           selectedPeriod === '6h' ? 6 :
                                           selectedPeriod === '3h' ? 3 :
                                           selectedPeriod === '1h' ? 1 :
                                           24} // 24h par défaut (day)
                                  threshold={sensor.threshold?.value}
                                  isBinary={sensor.isBinary}
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-gray-500">Aucune donnée disponible</div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
                <AddSensorDialog 
                  deviceId={device.id}
                  onSensorAdded={() => {
                    // Rafraîchir les données après l'ajout d'un capteur
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
            </CardContent>
          </Card>
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