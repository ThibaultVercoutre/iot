"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SensorType } from '@prisma/client'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Types pour les alertes
interface AlertLog {
  id: number
  startedAt: string
  endedAt: string | null
  duration: number | null
  sensorValue: number
  thresholdValue: number | null
  isActive: boolean
  sensor: {
    id: number
    name: string
    type: SensorType
    isBinary: boolean
  }
}

// Configuration des couleurs par type de capteur
const sensorColors: Record<SensorType, string> = {
  [SensorType.SOUND]: '#FF6B6B',
  [SensorType.VIBRATION]: '#4ECDC4',
  [SensorType.BUTTON]: '#45B7D1',
}

// Fonction pour formater la date
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

// Fonction pour formater la durée
const formatDuration = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds} secondes`
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds > 0 ? `${remainingSeconds} s` : ''}`
  }
  
  const hours = Math.floor(seconds / 3600)
  const remainingMinutes = Math.floor((seconds % 3600) / 60)
  return `${hours} heure${hours > 1 ? 's' : ''} ${remainingMinutes > 0 ? `${remainingMinutes} min` : ''}`
}

// Fonction pour formater la valeur selon le type
const formatValue = (sensor: AlertLog['sensor'], value: number) => {
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

export default function AlertsHistory() {
  const router = useRouter()
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showOnlyActive, setShowOnlyActive] = useState(false)

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
    const fetchAlerts = async () => {
      try {
        const query = showOnlyActive ? '?active=true' : ''
        const response = await fetch(`/api/alerts${query}`)
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des alertes')
        }
        
        const data = await response.json()
        setAlertLogs(data)
        setIsLoading(false)
      } catch (error) {
        console.error("Erreur lors de la récupération des alertes :", error)
        setIsLoading(false)
      }
    }

    fetchAlerts()

    // Rafraîchir les données toutes les 10 secondes
    const interval = setInterval(fetchAlerts, 10000)

    return () => clearInterval(interval)
  }, [showOnlyActive])

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>
          <h1 className="text-2xl font-bold">Historique des alertes</h1>
        </div>
        <Button 
          variant={showOnlyActive ? "default" : "outline"} 
          onClick={() => setShowOnlyActive(!showOnlyActive)}
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          {showOnlyActive ? "Alertes actives uniquement" : "Toutes les alertes"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {alertLogs.length === 0 ? (
              "Aucune alerte"
            ) : (
              `${alertLogs.length} alerte${alertLogs.length > 1 ? 's' : ''} ${showOnlyActive ? 'active' : 'enregistrée'}${alertLogs.length > 1 ? 's' : ''}`
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Capteur</TableHead>
                  <TableHead>Déclenchement</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Valeur captée</TableHead>
                  {!showOnlyActive && <TableHead>État</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertLogs.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: sensorColors[alert.sensor.type] }}
                        />
                        {alert.sensor.name}
                      </div>
                    </TableCell>
                    <TableCell>{formatDateTime(alert.startedAt)}</TableCell>
                    <TableCell>
                      {alert.endedAt ? formatDateTime(alert.endedAt) : "En cours"}
                    </TableCell>
                    <TableCell>
                      {alert.duration ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDuration(alert.duration)}
                        </div>
                      ) : (
                        "En cours"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">
                        {formatValue(alert.sensor, alert.sensorValue)}
                        {!alert.sensor.isBinary && alert.thresholdValue && (
                          <span className="text-gray-500 ml-2">
                            (Seuil: {alert.thresholdValue})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {!showOnlyActive && (
                      <TableCell>
                        <Badge variant={alert.isActive ? "destructive" : "outline"}>
                          {alert.isActive ? "Active" : "Terminée"}
                        </Badge>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Aucune alerte {showOnlyActive ? "active" : ""} trouvée
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 