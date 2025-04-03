"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Trash2, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import SensorChart from "@/components/SensorChart"
import { 
  SensorWithData, 
  User, 
  formatValue, 
  getSensorColor 
} from "@/types/sensors"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface SensorProps {
  sensor: SensorWithData
  viewMode: 'grid' | 'list'
  selectedPeriod: '1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month'
  user: User | null
  onThresholdChange: (sensorId: number, value: string) => Promise<void>
  onDeleteSensor: (sensor: SensorWithData) => Promise<void>
}

export function Sensor({ 
  sensor, 
  viewMode, 
  selectedPeriod, 
  user, 
  onThresholdChange,
  onDeleteSensor 
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

  const latestData = sensor.historicalData && sensor.historicalData.length > 0 
    ? sensor.historicalData[0] 
    : null

  return (
    <Card 
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
                      value={thresholdValue}
                      onChange={(e) => setThresholdValue(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value) {
                          onThresholdChange(sensor.id, e.target.value)
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
} 