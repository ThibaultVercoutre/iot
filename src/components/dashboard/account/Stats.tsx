import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Device } from "@/types/sensors"

// Composant séparateur simple
const Separator = () => <hr className="my-4 border-gray-200" />;

interface StatsProps {
  user: User | null;
  devices: Device[];
}

export default function Stats({ user, devices }: StatsProps) {
  const router = useRouter()
  
  const totalSensors = devices.reduce((acc, device) => acc + device.sensors.length, 0)
  const activeSensors = devices.reduce((acc, device) => 
    acc + device.sensors.filter(sensor => sensor.isInAlert).length, 0)
    
  return (
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
  )
}
