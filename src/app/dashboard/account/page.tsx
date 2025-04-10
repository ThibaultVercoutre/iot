"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { verifyAuth, getUser } from "@/services/authService"
import { User } from "@/types/sensors"
import { getDevicesWithSensors } from "@/services/deviceService"
import { Device } from "@/types/sensors"
import PersonnalInformations from "@/components/dashboard/account/PersonnalInformations"
import Settings from "@/components/dashboard/account/Settings"
import Stats from "@/components/dashboard/account/Stats"

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await verifyAuth()
        const userData = await getUser()
        setUser(userData)
        setIsLoading(false)
      } catch (error) {
        console.error("Erreur lors de la vérification de l'authentification :", error)
        router.push("/")
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devicesData = await getDevicesWithSensors("day", 0)
        setDevices(devicesData)
      } catch (error) {
        console.error("Erreur lors de la récupération des devices :", error)
      }
    }

    if (!isLoading) {
      fetchDevices()
    }
  }, [isLoading])

  const handleToggleAlerts = async () => {
    try {
      // Simuler la mise à jour du statut des alertes
      setUser(prev => prev ? { ...prev, alertsEnabled: !prev.alertsEnabled } : null)
      // Ici, vous feriez un appel API pour mettre à jour la préférence utilisateur
    } catch (error) {
      console.error("Erreur lors de la mise à jour des préférences :", error)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>
          <h1 className="text-2xl font-bold">Mon compte</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informations personnelles */}
        <PersonnalInformations user={user} />

        {/* Paramètres et préférences */}
        <Settings user={user} onToggleAlerts={handleToggleAlerts} />

        {/* Statistiques */}
        <Stats user={user} devices={devices} />
      </div>
    </div>
  )
}
