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

export const getDeviceSensors = async (deviceId: number, period: string, referenceDate?: string): Promise<SensorWithData[]> => {
  const token = getToken()
  
  // Construire l'URL avec les paramètres
  let url = `/api/sensors?period=${period}`
  if (referenceDate) {
    url += `&referenceDate=${encodeURIComponent(referenceDate)}`
  }
  
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

export const getDevicesWithSensors = async (period: string, referenceDate?: string): Promise<DeviceType[]> => {
  const devices = await getDevices()
  
  return Promise.all(
    devices.map(async (device) => {
      const sensors = await getDeviceSensors(device.id, period, referenceDate)
      
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