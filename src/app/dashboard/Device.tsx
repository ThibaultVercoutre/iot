"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Trash2, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

import { AddSensorDialog } from "@/components/AddSensorDialog"
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
import { 
  Device as DeviceType, 
  SensorWithData, 
  User, 
  formatValue, 
  getSensorColor 
} from "@/types/sensors"

interface DeviceProps {
  device: DeviceType
  viewMode: 'grid' | 'list'
  selectedPeriod: '1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month'
  user: User | null
  onDeviceChange: (updatedDevice: DeviceType) => void
}

export function Device({ device, viewMode, selectedPeriod, user, onDeviceChange }: DeviceProps) {
  const [thresholdValues, setThresholdValues] = useState<{ [key: number]: string }>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

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
                              onClick={() => {
                                handleDeleteSensor(sensor);
                                const closeDialog = document.querySelector(`[data-state="open"]`)?.querySelector('[aria-label="Close"]') as HTMLButtonElement;
                                if (closeDialog) closeDialog.click();
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
                            color={getSensorColor(sensor.type)}
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
            onSensorAdded={handleSensorAdded}
          />
        </div>
      </CardContent>
    </Card>
  )
} 