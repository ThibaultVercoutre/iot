"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User as UserIcon, Calendar, Bell, Settings, Shield, Edit } from "lucide-react"
import { verifyAuth, getUser } from "@/services/authService"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { User } from "@/types/sensors"
import { Badge } from "@/components/ui/badge"
import { getDevicesWithSensors } from "@/services/deviceService"
import { Device } from "@/types/sensors"

// Création d'un composant séparateur simple comme alternative à @/components/ui/separator
const Separator = () => <hr className="my-4 border-gray-200" />;

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

  const totalSensors = devices.reduce((acc, device) => acc + device.sensors.length, 0)
  const activeSensors = devices.reduce((acc, device) => 
    acc + device.sensors.filter(sensor => sensor.isInAlert).length, 0)

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex flex-col">
                <dt className="text-sm font-medium text-gray-500">ID Utilisateur</dt>
                <dd className="text-lg">{user?.id}</dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-sm font-medium text-gray-500">Type de vue préférée</dt>
                <dd className="text-lg flex items-center gap-2">
                  <Badge>
                    {user?.dashboardViewMode || "Grille"}
                  </Badge>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-sm font-medium text-gray-500">Période par défaut</dt>
                <dd className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {user?.dashboardPeriod || "day"}
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-sm font-medium text-gray-500">Filtre d&apos;alerte par défaut</dt>
                <dd className="text-lg flex items-center gap-2">
                  <Badge variant={user?.dashboardAlertFilter === 'alert' ? "destructive" : "outline"}>
                    {user?.dashboardAlertFilter === 'alert' ? 'Avec alertes' : 'Tous'}
                  </Badge>
                </dd>
              </div>

              <div className="pt-2">
                <Button variant="outline" className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Modifier mes préférences
                </Button>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Paramètres et préférences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Paramètres et préférences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="alerts" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications d&apos;alertes
                </Label>
                <p className="text-sm text-gray-500">
                  Activez pour recevoir des notifications en cas d&apos;alerte sur vos capteurs
                </p>
              </div>
              <Switch 
                id="alerts" 
                checked={user?.alertsEnabled || false} 
                onCheckedChange={handleToggleAlerts}
              />
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2">Sécurité du compte</h3>
              <Button variant="outline" className="w-full flex items-center justify-center gap-2 mb-2">
                <Shield className="h-4 w-4" />
                Changer mon mot de passe
              </Button>

              <Button variant="destructive" className="w-full">
                Supprimer mon compte
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vue d&apos;ensemble de votre installation</CardTitle>
            <CardDescription>Statistiques sur vos appareils et capteurs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{devices.length}</div>
                    <p className="text-sm text-gray-500">Appareils connectés</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{totalSensors}</div>
                    <p className="text-sm text-gray-500">Capteurs installés</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{activeSensors}</div>
                    <p className="text-sm text-gray-500">Capteurs en alerte</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      <Badge variant={user?.alertsEnabled ? "default" : "outline"}>
                        {user?.alertsEnabled ? "ACTIF" : "INACTIF"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">Statut des alertes</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">Vos appareils</h3>
              {devices.length > 0 ? (
                <div className="space-y-4">
                  {devices.map(device => (
                    <Card key={device.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{device.name}</h4>
                            <p className="text-sm text-gray-500">{device.sensors.length} capteurs connectés</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => router.push(`/dashboard`)}
                          >
                            Voir les détails
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Aucun appareil trouvé
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
