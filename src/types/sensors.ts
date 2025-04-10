import { SensorType, Sensor } from '@prisma/client'

export interface SensorData {
  id: number
  value: number
  timestamp: string
  sensorId: number
}

export interface Threshold {
  id: number
  value: number
  sensorId: number
}

export interface SensorWithData extends Sensor {
  historicalData: SensorData[]
  threshold?: Threshold
  isBinary: boolean
  isInAlert?: boolean
  alertLogs: {
    id: number
    startDataId: number
    createdAt: string
    startData: SensorData
  }[]
  lastValue?: SensorData
}

export interface Device {
  id: number
  name: string
  sensors: SensorWithData[]
}

export interface User {
  id: number
  alertsEnabled: boolean
  dashboardPeriod?: '1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month'
  dashboardViewMode?: 'grid' | 'list'
  dashboardSensorType?: SensorType | 'all'
  dashboardAlertFilter?: 'all' | 'alert'
}

// Configuration des couleurs par type de capteur
export const sensorColors: Record<SensorType, string> = {
  [SensorType.SOUND]: '#FF6B6B',
  [SensorType.VIBRATION]: '#4ECDC4',
  [SensorType.BUTTON]: '#45B7D1',
}

// Fonction pour formater la valeur selon le type
export const formatValue = (sensor: SensorWithData, value: number) => {
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

// Fonction pour obtenir la couleur d'un type de capteur
export const getSensorColor = (type: SensorType) => {
  return sensorColors[type]
} 