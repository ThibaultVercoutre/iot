import { User } from '@/types/sensors'

export const verifyAuth = async (): Promise<void> => {
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
}

export const getUser = async (): Promise<User> => {
  const token = document.cookie
    .split("; ")
    .find(row => row.startsWith("auth-token="))
    ?.split("=")[1]

  if (!token) {
    throw new Error("Pas de token")
  }

  const response = await fetch('/api/user', {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des données utilisateur')
  }

  const userData = await response.json()
  
  // Convertir les chaînes de caractères en types corrects
  return {
    ...userData,
    dashboardPeriod: userData.dashboardPeriod as User['dashboardPeriod'],
    dashboardViewMode: userData.dashboardViewMode as User['dashboardViewMode'],
    dashboardSensorType: userData.dashboardSensorType as User['dashboardSensorType'],
    dashboardAlertFilter: userData.dashboardAlertFilter as User['dashboardAlertFilter']
  }
} 