import { SensorType } from '@prisma/client'

// Types pour les alertes
export interface AlertLog {
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

const getToken = (): string => {
  const token = document.cookie
    .split("; ")
    .find(row => row.startsWith("auth-token="))
    ?.split("=")[1]

  if (!token) {
    throw new Error("Pas de token")
  }

  return token
}

export const getAlertLogs = async (activeOnly: boolean = false): Promise<AlertLog[]> => {
  const token = getToken()
  
  const response = await fetch(`/api/alerts${activeOnly ? '?active=true' : ''}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des alertes')
  }
  
  return response.json()
}

// Fonction pour formater la date
export const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

// Fonction pour formater la durée
export const formatDuration = (seconds: number) => {
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
export const formatValue = (sensor: AlertLog['sensor'], value: number) => {
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