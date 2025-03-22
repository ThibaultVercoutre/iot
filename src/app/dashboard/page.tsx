"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Types pour les données des capteurs
interface SensorData {
  value: number
  timestamp: string
}

interface Sensor {
  id: string
  name: string
  type: string
  lastValue: number
  lastUpdate: string | null
  historicalData: SensorData[]
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
const formatValue = (value: number, type: string) => {
  if (type === 'BUTTON') {
    return value === 1 ? 'ON' : 'OFF'
  }
  if (type === 'VIBRATION') {
    return value === 0 ? 'STABLE' : 'VIBRANT'
  }
  return `${value} dB`
}

// Composant pour le graphique d'un capteur
function SensorChart({ data, name, type }: { data: SensorData[], name: string, type: string }) {
  const color = sensorColors[type as keyof typeof sensorColors]
  const isBinary = type === 'BUTTON' || type === 'VIBRATION'
  
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
            formatter={(value: number) => [formatValue(value, type), name]}
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
  const [isLoading, setIsLoading] = useState(true)
  const [sensors, setSensors] = useState<Sensor[]>([])

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

  // Effet pour charger les données des capteurs
  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const response = await fetch('/api/sensors')
        if (!response.ok) throw new Error('Erreur lors de la récupération des données')
        const data = await response.json()
        setSensors(data)
      } catch (error) {
        console.error('Erreur:', error)
      }
    }

    if (!isLoading) {
      fetchSensorData()
      // Rafraîchir les données toutes les 10 secondes
      const interval = setInterval(fetchSensorData, 10000)
      return () => clearInterval(interval)
    }
  }, [isLoading])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Chargement...</div>
    </div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Tableau de bord des capteurs</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {sensors.map(sensor => {
          const color = sensorColors[sensor.type as keyof typeof sensorColors]
          return (
            <Card key={sensor.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color }} />
                  {sensor.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-2" style={{ color }}>
                  {formatValue(sensor.lastValue, sensor.type)}
                </div>
                <div className="text-sm text-gray-500">
                  Dernière mise à jour: {sensor.lastUpdate ? formatDate(sensor.lastUpdate) : 'Jamais'}
                </div>
                <SensorChart 
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