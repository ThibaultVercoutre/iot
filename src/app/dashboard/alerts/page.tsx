"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SensorType } from '@prisma/client'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, AlertCircle, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { verifyAuth } from "@/services/authService"
import { getAlertLogs, formatDateTime, formatDuration, formatValue, AlertLog } from "@/services/alertService"

// Configuration des couleurs par type de capteur
const sensorColors: Record<SensorType, string> = {
  [SensorType.SOUND]: '#FF6B6B',
  [SensorType.VIBRATION]: '#4ECDC4',
  [SensorType.BUTTON]: '#45B7D1',
}

export default function AlertsHistory() {
  const router = useRouter()
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingOnlyActive, setIsLoadingOnlyActive] = useState(false)
  const [showOnlyActive, setShowOnlyActive] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await verifyAuth()
        setIsLoading(false)
      } catch (error) {
        console.error("Erreur lors de la vérification de l'authentification :", error)
        router.push("/")
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const alerts = await getAlertLogs()
        setAlertLogs(alerts)
        setIsLoading(false)
      } catch (error) {
        console.error("Erreur lors de la récupération des alertes :", error)
        setIsLoading(false)
      }
    }

    if (!isLoading) {
      fetchAlerts()
    }
  }, [isLoading])

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setIsLoadingOnlyActive(true)
        const alerts = await getAlertLogs(showOnlyActive)
        setAlertLogs(alerts)
        setIsLoadingOnlyActive(false)
      } catch (error) {
        console.error("Erreur lors de la récupération des alertes :", error)
        setIsLoadingOnlyActive(false)
      }
    }

    if (!isLoadingOnlyActive) {
      fetchAlerts()
    }
  }, [showOnlyActive, isLoadingOnlyActive])

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>
          <h1 className="text-2xl font-bold">Historique des alertes</h1>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            setIsLoading(true)
            setTimeout(() => setIsLoading(false), 1000)
          }}
          className="w-full sm:w-auto"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
        <Button 
          variant={showOnlyActive ? "default" : "outline"} 
          onClick={() => setShowOnlyActive(!showOnlyActive)}
          className="w-full sm:w-auto"
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
          {isLoadingOnlyActive || isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Chargement des alertes...
            </div>
          ) : alertLogs.length > 0 ? (
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
                      {alert.startedAt === alert.endedAt ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Alerte ponctuelle
                        </div>
                      ) : alert.duration ? (
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