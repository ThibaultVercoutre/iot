"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { SensorType, Sensor } from '@prisma/client'

// Types pour les données des capteurs
interface SensorData {
  id: number
  value: number
  timestamp: string
  sensorId: number
}

interface SensorWithData extends Sensor {
  historicalData: SensorData[]
}

// Configuration des couleurs par type de capteur
const sensorColors = {
  [SensorType.SOUND]: '#FF6B6B',
  [SensorType.VIBRATION]: '#4ECDC4',
  [SensorType.BUTTON]: '#45B7D1',
}

// Fonction pour formater la date
const formatDate = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString()
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
  return sensorColors[type]
}

// Composant pour le graphique d'un capteur
function SensorChartComponent({ data, name, type }: { data: SensorData[], name: string, type: SensorType }) {
  const color = sensorColors[type]
  const isBinary = type === SensorType.BUTTON || type === SensorType.VIBRATION
  
  // Trier les données par date et garder les 50 dernières
  const sortedData = [...data]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-50)
  
  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={isBinary ? [0, 1] : ['auto', 'auto']}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            labelFormatter={formatDate}
            formatter={(value: number) => [formatValue(type, value), name]}
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
          />
          <Line 
            type={isBinary ? 'stepAfter' : 'monotone'}
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            dot={!isBinary}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [sensors, setSensors] = useState<SensorWithData[]>([])
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
        // console.log('Données reçues:', data)
        setSensors(data)
        setIsLoading(false)
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error)
        setIsLoading(false)
      }
    }

    // Récupérer les données immédiatement
    fetchSensorData()

    // Mettre en place l'intervalle pour les mises à jour (toutes les 5 secondes)
    const interval = setInterval(fetchSensorData, 5000)

    // Nettoyer l'intervalle lors du démontage du composant
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Tableau de bord des capteurs</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {sensors.map((sensor) => {
          const latestData = sensor.historicalData && sensor.historicalData.length > 0 ? sensor.historicalData[sensor.historicalData.length - 1] : null
          return (
            <Card key={sensor.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full bg-current text-${sensor.type.toLowerCase()}`} />
                  {sensor.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestData ? (
                  <>
                    <div className="text-4xl font-bold mb-2" style={{ color: getSensorColor(sensor.type) }}>
                      {formatValue(sensor.type, latestData.value)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Dernière mise à jour: {new Date(latestData.timestamp).toLocaleTimeString()}
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500">Aucune donnée disponible</div>
                )}
                <SensorChartComponent 
                  data={sensor.historicalData}
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