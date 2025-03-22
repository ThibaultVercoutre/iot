"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { SensorType } from '@prisma/client'

// Types pour les données des capteurs
interface SensorData {
  id: number
  value: number
  timestamp: string
  sensorId: number
}

interface Sensor {
  id: number
  name: string
  type: SensorType
  data: SensorData[]
}

// Configuration des couleurs par type de capteur
const sensorColors = {
  SOUND: "#22c55e",      // Vert
  VIBRATION: "#f43f5e",  // Rouge pour la vibration
  BUTTON: "#f97316"      // Orange
}

// Fonction pour formater la date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Fonction pour formater la valeur selon le type
const formatValue = (type: SensorType, value: number) => {
  switch (type) {
    case SensorType.SOUND:
      return `${value} dB`
    case SensorType.VIBRATION:
    case SensorType.BUTTON:
      return value === 1 ? 'ON' : 'OFF'
    default:
      return value.toString()
  }
}

// Fonction pour obtenir la couleur selon le type de capteur
const getSensorColor = (type: SensorType) => {
  switch (type) {
    case SensorType.SOUND:
      return 'text-green-500'
    case SensorType.VIBRATION:
      return 'text-red-500'
    case SensorType.BUTTON:
      return 'text-orange-500'
    default:
      return 'text-gray-500'
  }
}

// Composant pour le graphique d'un capteur
function SensorChart({ data, name, type }: { data: SensorData[], name: string, type: SensorType }) {
  const color = sensorColors[type as keyof typeof sensorColors]
  const isBinary = type === SensorType.BUTTON || type === SensorType.VIBRATION
  
  return (
    <div className="w-full h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatDate}
            interval="preserveStartEnd"
            className="text-xs"
          />
          <YAxis 
            domain={isBinary ? [0, 1] : ['auto', 'auto']}
            ticks={isBinary ? [0, 1] : undefined}
            tickFormatter={isBinary ? (value: number) => value === 1 ? 'ON' : 'OFF' : undefined}
            className="text-xs"
          />
          <Tooltip 
            labelFormatter={formatDate}
            formatter={(value: number) => [formatValue(type, value), name]}
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
          />
          {isBinary ? (
            <Line 
              type="step" 
              dataKey="value" 
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ) : (
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
    const fetchSensorData = async () => {
      try {
        const response = await fetch('/api/sensors')
        if (!response.ok) throw new Error('Erreur lors de la récupération des données')
        const data = await response.json()
        // S'assurer que chaque capteur a un tableau data initialisé
        const sensorsWithData = data.map((sensor: Partial<Sensor>) => ({
          ...sensor,
          data: Array.isArray(sensor.data) ? sensor.data : []
        })) as Sensor[]
        setSensors(sensorsWithData)
        setIsLoading(false)
      } catch (error) {
        console.error('Erreur:', error)
        setIsLoading(false)
      }
    }

    fetchSensorData()

    // Établir la connexion SSE
    const eventSource = new EventSource('/api/sensors/events')

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        
        // Ignorer les pings
        if (update.type === 'ping') return;
        
        if (update.type === 'sensor_update') {
          setSensors(prevSensors => {
            if (!Array.isArray(prevSensors)) return [];
            
            return prevSensors.map(sensor => {
              if (sensor.id === update.sensorId) {
                // Vérifier si cette donnée existe déjà
                const dataExists = sensor.data.some(d => 
                  d.timestamp === update.timestamp && 
                  d.value === update.value
                );
                
                if (dataExists) return sensor;

                const newData = {
                  id: Date.now(),
                  value: update.value,
                  timestamp: update.timestamp,
                  sensorId: update.sensorId
                };

                // Trier les données par timestamp décroissant
                const allData = [...sensor.data, newData]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 50);

                return {
                  ...sensor,
                  data: allData
                };
              }
              return sensor;
            });
          });
        }
      } catch (error) {
        console.error('Erreur lors du traitement des données SSE:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Erreur SSE:', error)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Chargement...</div>
    </div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Tableau de bord des capteurs</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {sensors.map((sensor) => {
          const latestData = sensor.data && sensor.data.length > 0 ? sensor.data[0] : null;
          return (
            <Card key={sensor.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full bg-current ${getSensorColor(sensor.type)}`} />
                  {sensor.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestData ? (
                  <>
                    <div className="text-4xl font-bold mb-2" style={{ color: sensorColors[sensor.type] }}>
                      {formatValue(sensor.type, latestData.value)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Dernière mise à jour: {new Date(latestData.timestamp).toLocaleTimeString()}
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500">Aucune donnée disponible</div>
                )}
                <SensorChart 
                  data={sensor.data || []}
                  name={sensor.name}
                  type={sensor.type}
                />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
} 