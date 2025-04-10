import { Device } from '@prisma/client'
import { Device as DeviceType, SensorWithData } from '@/types/sensors'

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

// Fonction pour obtenir la période en heures
export const getPeriodInHours = (period: string): number => {
  switch(period) {
    case '1h': return 1
    case '3h': return 3
    case '6h': return 6
    case '12h': return 12
    case 'day': return 24
    case 'week': return 24 * 7
    case 'month': return 24 * 30
    default: return 24
  }
}

// Fonction pour calculer les dates de début et fin
export const calculateDateRange = (period: string, timeOffset: number = 0): { startDate: Date, endDate: Date } => {
  // Date de fin: si timeOffset=0, c'est maintenant, sinon on recule dans le temps
  const endDate = new Date()
  if (timeOffset > 0) {
    const offsetInHours = getPeriodInHours(period) * timeOffset
    endDate.setHours(endDate.getHours() - offsetInHours)
  }
  
  // Date de début: en fonction de la période sélectionnée
  const startDate = new Date(endDate)
  const periodInHours = getPeriodInHours(period)
  startDate.setHours(startDate.getHours() - periodInHours)
  
  return { startDate, endDate }
}

export const getDevices = async (): Promise<Device[]> => {
  const token = getToken()
  
  const response = await fetch('/api/devices', {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des devices')
  }

  return response.json()
}

export const getDeviceSensors = async (deviceId: number, period: string, timeOffset: number = 0): Promise<SensorWithData[]> => {
  const token = getToken()
  
  // Calculer les dates de début et de fin
  const { startDate, endDate } = calculateDateRange(period, timeOffset)
  
  // Construire l'URL avec les paramètres
  const url = `/api/sensors?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`
  
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des capteurs')
  }

  const sensorsData = await response.json()
  return sensorsData.filter((sensor: SensorWithData) => sensor.deviceId === deviceId)
}

export const getDevicesWithSensors = async (period: string, timeOffset: number = 0): Promise<DeviceType[]> => {
  const devices = await getDevices()
  
  return Promise.all(
    devices.map(async (device) => {
      const sensors = await getDeviceSensors(device.id, period, timeOffset)
      
      const sensorsWithAlertStatus = sensors.map((sensor) => {
        const latestData = sensor.historicalData[0]
        let isInAlert = false

        if (latestData) {
          if (sensor.isBinary) {
            isInAlert = latestData.value === 1
          } else if (sensor.threshold) {
            isInAlert = latestData.value >= sensor.threshold.value
          }
        }

        return {
          ...sensor,
          isInAlert
        }
      })

      return {
        ...device,
        sensors: sensorsWithAlertStatus
      }
    })
  )
} 