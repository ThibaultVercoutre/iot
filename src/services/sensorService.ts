import { SensorWithData } from '@/types/sensors'

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

export const updateSensorThreshold = async (sensorId: number, value: number): Promise<void> => {
  const token = getToken()

  const response = await fetch(`/api/sensors/${sensorId}/threshold`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ value }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.error || 'Erreur lors de la mise à jour du seuil')
  }
}

export const deleteSensor = async (sensorId: number): Promise<void> => {
  const token = getToken()

  const response = await fetch(`/api/sensors/${sensorId}`, {
    method: 'DELETE',
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la suppression du capteur')
  }
}

export const getDeviceSensors = async (deviceId: number, period: string): Promise<SensorWithData[]> => {
  const token = getToken()

  const response = await fetch(`/api/sensors?period=${period}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des capteurs')
  }

  const sensorsData = await response.json()
  const deviceSensors = sensorsData.filter((sensor: SensorWithData) => sensor.deviceId === deviceId)

  // Vérifier les capteurs qui ont une alerte active
  return deviceSensors.map((sensor: SensorWithData) => {
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
} 