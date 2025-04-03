import { Sensor } from "@prisma/client"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatValue(sensor: Sensor, value: number): string {
  if (sensor.isBinary) {
    return value === 1 ? 'ON' : 'OFF'
  }
  return `${value}${'Db'}`
}

export function getSensorColor(type: string): string {
  const colors: { [key: string]: string } = {
    SOUND: '#FF6B6B',
    VIBRATION: '#4ECDC4', 
    BUTTON: '#FFD166',
    default: '#6C757D'
  }
  return colors[type] || colors.default
}
